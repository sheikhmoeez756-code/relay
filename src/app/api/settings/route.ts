import { db } from '@/lib/db';
import { currentUser, checkOrigin, errorResponse, HttpError } from '@/lib/security';
import { assertNotDemo } from '@/lib/demo';
import { z } from 'zod';
import { cleanText } from '@/lib/validation';
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('profile'),
    name: z.string().min(2).max(120).transform(cleanText),
    theme: z.enum(['light', 'dark', 'system']),
    emailNotifications: z.boolean(),
    deadlineNotifications: z.boolean(),
  }),
  z.object({
    action: z.literal('company'),
    name: z.string().min(2).max(120).transform(cleanText),
    timezone: z.string().max(60),
  }),
  z.object({
    action: z.literal('department'),
    name: z.string().min(2).max(80).transform(cleanText),
  }),
  z.object({
    action: z.literal('team'),
    name: z.string().min(2).max(80).transform(cleanText),
    departmentId: z.string().cuid(),
    members: z.array(z.string().cuid()).max(100),
  }),
  z.object({
    action: z.literal('employee'),
    id: z.string().cuid(),
    active: z.boolean(),
    role: z.enum(['ADMIN', 'MANAGER', 'TEAM_LEAD', 'SALES', 'EMPLOYEE']),
    departmentId: z.string().cuid().nullable(),
  }),
  z.object({
    action: z.literal('onboarding'),
    name: z.string().min(2).max(120),
    department: z.string().min(2).max(80),
  }),
]);
export async function GET() {
  try {
    const u = await currentUser();
    return Response.json({
      company: u.company,
      subscription: await db.subscription.findUnique({ where: { companyId: u.companyId } }),
      teams: await db.team.findMany({
        where: { companyId: u.companyId },
        include: { members: true },
      }),
      billingConfigured: false,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const u = await currentUser();
    assertNotDemo(u);
    const data = schema.parse(await req.json());
    if (data.action !== 'profile' && !['SUPER_ADMIN', 'ADMIN'].includes(u.role))
      throw new HttpError(403, 'Administrator access required.');
    await db.$transaction(async (tx) => {
      if (data.action === 'profile')
        await tx.user.update({
          where: { id: u.id },
          data: {
            name: data.name,
            preferences: {
              theme: data.theme,
              emailNotifications: data.emailNotifications,
              deadlineNotifications: data.deadlineNotifications,
            },
          },
        });
      if (data.action === 'company')
        await tx.company.update({
          where: { id: u.companyId },
          data: { name: data.name, timezone: data.timezone },
        });
      if (data.action === 'department')
        await tx.department.create({ data: { companyId: u.companyId, name: data.name } });
      if (data.action === 'team') {
        if (
          !(await tx.department.findFirst({
            where: { id: data.departmentId, companyId: u.companyId },
          }))
        )
          throw new HttpError(422, 'Invalid department');
        const ids = [...new Set(data.members)];
        if (
          (await tx.user.count({
            where: {
              id: { in: ids },
              companyId: u.companyId,
              departmentId: data.departmentId,
              active: true,
            },
          })) !== ids.length
        )
          throw new HttpError(422, 'Select members from the chosen department.');
        await tx.team.create({
          data: {
            companyId: u.companyId,
            name: data.name,
            departmentId: data.departmentId,
            members: { create: ids.map((userId) => ({ userId })) },
          },
        });
      }
      if (data.action === 'employee') {
        const target = await tx.user.findFirst({ where: { id: data.id, companyId: u.companyId } });
        if (!target) throw new HttpError(404, 'Employee not found');
        if (target.role === 'SUPER_ADMIN' || target.id === u.id)
          throw new HttpError(403, 'You cannot modify this account here.');
        if (u.role !== 'SUPER_ADMIN' && (target.role === 'ADMIN' || data.role === 'ADMIN'))
          throw new HttpError(403, 'Super Admin access required to manage administrators.');
        if (
          data.departmentId &&
          !(await tx.department.findFirst({
            where: { id: data.departmentId, companyId: u.companyId },
          }))
        )
          throw new HttpError(422, 'Invalid department');
        await tx.user.update({
          where: { id: target.id },
          data: {
            active: data.active,
            role: data.role,
            departmentId: data.departmentId,
            sessionVersion: { increment: 1 },
          },
        });
      }
      if (data.action === 'onboarding') {
        await tx.company.update({
          where: { id: u.companyId },
          data: { name: data.name, onboarded: true },
        });
        await tx.department.upsert({
          where: { companyId_name: { companyId: u.companyId, name: data.department } },
          create: { companyId: u.companyId, name: data.department },
          update: {},
        });
      }
      await tx.auditLog.create({
        data: {
          companyId: u.companyId,
          actorId: u.id,
          action: `UPDATE_${data.action.toUpperCase()}`,
          target: 'settings',
          targetId: 'id' in data ? data.id : u.id,
          metadata: { fields: Object.keys(data).filter((k) => k !== 'action') },
        },
      });
    });
    return Response.json({ message: 'Changes saved.' });
  } catch (e) {
    return errorResponse(e);
  }
}
