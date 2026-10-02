import { db } from '@/lib/db';
import { authorize, checkOrigin, errorResponse, HttpError } from '@/lib/security';
import { z } from 'zod';
import { cleanText } from '@/lib/validation';
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), id: z.string().cuid().optional() }),
  z.object({
    action: z.literal('conversation'),
    name: z.string().min(2).max(80).transform(cleanText),
    members: z.array(z.string().cuid()).min(1).max(50),
  }),
  z.object({
    action: z.literal('message'),
    conversationId: z.string().cuid(),
    body: z.string().min(1).max(5000).transform(cleanText),
  }),
  z.object({ action: z.literal('readConversation'), conversationId: z.string().cuid() }),
]);
export async function GET(req: Request) {
  try {
    const type = new URL(req.url).searchParams.get('type') || 'notifications';
    const u = await authorize(
      type === 'messages'
        ? 'messages'
        : type === 'audit'
          ? 'audit'
          : type === 'employees'
            ? 'employees'
            : 'notifications',
    );
    if (type === 'messages')
      return Response.json(
        await db.conversation.findMany({
          where: { companyId: u.companyId, members: { some: { userId: u.id } } },
          include: {
            members: {
              select: { userId: true, lastReadAt: true, user: { select: { name: true } } },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 100,
              include: { author: { select: { name: true, id: true } } },
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
      );
    if (type === 'audit')
      return Response.json(
        await db.auditLog.findMany({
          where: { companyId: u.companyId },
          include: { actor: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      );
    if (type === 'employees')
      return Response.json(
        await db.user.findMany({
          where: {
            companyId: u.companyId,
            deletedAt: null,
            ...(['MANAGER', 'TEAM_LEAD'].includes(u.role)
              ? { departmentId: u.departmentId || '__none__' }
              : {}),
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            department: { select: { name: true } },
            _count: { select: { tasks: true, tickets: true } },
          },
        }),
      );
    return Response.json(
      await db.notification.findMany({
        where: { companyId: u.companyId, userId: u.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const u = await authorize('messages', 'create');
    const data = input.parse(await req.json());
    if (data.action === 'read') {
      await db.notification.updateMany({
        where: { companyId: u.companyId, userId: u.id, ...(data.id ? { id: data.id } : {}) },
        data: { readAt: new Date() },
      });
      return Response.json({ message: 'Notifications marked as read.' });
    }
    if (data.action === 'conversation') {
      const ids = [...new Set([u.id, ...data.members])];
      const count = await db.user.count({
        where: { id: { in: ids }, companyId: u.companyId, active: true, deletedAt: null },
      });
      if (count !== ids.length) throw new HttpError(422, 'Invalid conversation participants.');
      const item = await db.conversation.create({
        data: {
          companyId: u.companyId,
          name: data.name,
          members: { create: ids.map((userId) => ({ userId })) },
        },
      });
      return Response.json(item, { status: 201 });
    }
    const conversation = await db.conversation.findFirst({
      where: {
        id: data.conversationId,
        companyId: u.companyId,
        members: { some: { userId: u.id } },
      },
      include: { members: true },
    });
    if (!conversation) throw new HttpError(404, 'Conversation not found.');
    if (data.action === 'readConversation') {
      await db.conversationMember.update({
        where: { conversationId_userId: { conversationId: conversation.id, userId: u.id } },
        data: { lastReadAt: new Date() },
      });
      return Response.json({ ok: true });
    }
    const message = await db.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { conversationId: conversation.id, authorId: u.id, body: data.body },
        include: { author: { select: { name: true, id: true } } },
      });
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
      return message;
    });
    for (const member of conversation.members)
      (globalThis as any).relayIO
        ?.to(`user:${member.userId}`)
        .emit('message', { conversationId: conversation.id });
    return Response.json(message, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
