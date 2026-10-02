import { db } from '@/lib/db';
import { authorize, checkOrigin, errorResponse, HttpError } from '@/lib/security';
import { detailRecord } from '@/lib/records';
import { isEntity, cleanText } from '@/lib/validation';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('comment'),
    body: z.string().min(1).max(5000).transform(cleanText),
  }),
  z.object({ action: z.literal('subtask'), name: z.string().min(2).max(200).transform(cleanText) }),
  z.object({ action: z.literal('check'), id: z.string().cuid(), completed: z.boolean() }),
  z.object({
    action: z.literal('time'),
    minutes: z.coerce.number().int().min(1).max(1440),
    note: z.string().max(500).transform(cleanText),
  }),
  z.object({ action: z.literal('member'), userId: z.string().cuid() }),
  z.object({
    action: z.literal('contact'),
    name: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().max(40).optional(),
  }),
]);
export async function POST(req: Request, ctx: { params: Promise<{ entity: string; id: string }> }) {
  try {
    checkOrigin(req);
    const { entity, id } = await ctx.params;
    if (!isEntity(entity)) throw new HttpError(404, 'Not found');
    const u = await authorize(entity, 'update');
    await detailRecord(u, entity, id);
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      if (!['projects', 'tasks', 'tickets'].includes(entity))
        throw new HttpError(422, 'Attachments are not supported here.');
      // Requires an explicit length: Node enforces it, so chunked bodies can't bypass the limit.
      const length = Number(req.headers.get('content-length'));
      if (!length) throw new HttpError(411, 'Upload size must be declared.');
      if (length > 6 * 1024 * 1024) throw new HttpError(413, 'Maximum attachment size is 5 MB.');
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || file.size === 0)
        throw new HttpError(422, 'Choose a file between 1 byte and 5 MB.');
      const buffer = Buffer.from(await file.arrayBuffer());
      const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
      const pdf = buffer.subarray(0, 5).toString() === '%PDF-';
      const mimeType = png ? 'image/png' : jpeg ? 'image/jpeg' : pdf ? 'application/pdf' : null;
      if (!mimeType || file.type !== mimeType)
        throw new HttpError(422, 'Only valid PNG, JPEG and PDF files are allowed.');
      const storageKey = randomUUID();
      await mkdir(path.join(process.cwd(), 'uploads'), { recursive: true });
      const location = path.join(process.cwd(), 'uploads', storageKey);
      await writeFile(location, buffer);
      try {
        const item = await db.$transaction(async (tx) => {
          const item = await tx.attachment.create({
            data: {
              companyId: u.companyId,
              filename: path.basename(file.name).replace(/[^a-zA-Z0-9._ -]/g, '_'),
              mimeType,
              size: file.size,
              storageKey,
              [entity.slice(0, -1) + 'Id']: id,
            },
          });
          await tx.auditLog.create({
            data: {
              companyId: u.companyId,
              actorId: u.id,
              action: 'ATTACHMENT_UPLOAD',
              target: entity,
              targetId: id,
              metadata: { filename: item.filename },
            },
          });
          return item;
        });
        return Response.json(item, { status: 201 });
      } catch (e) {
        await unlink(location);
        throw e;
      }
    }
    const data = schema.parse(await req.json());
    const item = await db.$transaction(async (tx) => {
      let result: unknown;
      if (data.action === 'comment') {
        if (entity !== 'tickets') throw new HttpError(422, 'Comments require a ticket.');
        result = await tx.ticketComment.create({
          data: { ticketId: id, authorId: u.id, body: data.body },
        });
        const ticket = await tx.ticket.findUniqueOrThrow({ where: { id } });
        if (ticket.assigneeId && ticket.assigneeId !== u.id)
          await tx.notification.create({
            data: {
              companyId: u.companyId,
              userId: ticket.assigneeId,
              title: 'New ticket comment',
              body: ticket.name,
              href: '/tickets/' + id,
            },
          });
      }
      if (['subtask', 'check', 'time'].includes(data.action) && entity !== 'tasks')
        throw new HttpError(422, 'This action requires a task.');
      if (data.action === 'subtask')
        result = await tx.subtask.create({ data: { taskId: id, name: data.name } });
      if (data.action === 'check') {
        const subtask = await tx.subtask.findFirst({ where: { id: data.id, taskId: id } });
        if (!subtask) throw new HttpError(404, 'Checklist item not found');
        result = await tx.subtask.update({
          where: { id: data.id },
          data: { completed: data.completed },
        });
      }
      if (data.action === 'time')
        result = await tx.timeEntry.create({
          data: { taskId: id, userId: u.id, minutes: data.minutes, note: data.note },
        });
      if (data.action === 'member') {
        if (entity !== 'projects') throw new HttpError(422, 'This action requires a project.');
        const member = await tx.user.findFirst({
          where: {
            id: data.userId,
            companyId: u.companyId,
            active: true,
            deletedAt: null,
            ...(['MANAGER', 'TEAM_LEAD'].includes(u.role)
              ? { departmentId: u.departmentId || '__none__' }
              : {}),
          },
        });
        if (!member) throw new HttpError(422, 'Invalid team member');
        result = await tx.projectMember.upsert({
          where: { projectId_userId: { projectId: id, userId: data.userId } },
          create: { projectId: id, userId: data.userId },
          update: {},
        });
      }
      if (data.action === 'contact') {
        if (entity !== 'clients') throw new HttpError(422, 'This action requires a client.');
        result = await tx.clientContact.create({
          data: { clientId: id, name: data.name, email: data.email, phone: data.phone },
        });
      }
      await tx.auditLog.create({
        data: {
          companyId: u.companyId,
          actorId: u.id,
          action: data.action.toUpperCase(),
          target: entity,
          targetId: id,
        },
      });
      return result;
    });
    return Response.json(item, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
