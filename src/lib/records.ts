import { db } from './db';
import { Actor, HttpError } from './security';
import { Entity, schemas, listSchema } from './validation';
import { can } from './permissions';
import { Prisma } from '@prisma/client';
const models = {
  clients: 'client',
  leads: 'lead',
  projects: 'project',
  tasks: 'task',
  tickets: 'ticket',
} as const;
// Dynamic entity adapter is bounded by the fixed model map and strict Zod schemas.
export function delegate(tx: unknown, entity: Entity): any {
  return (tx as Record<string, unknown>)[models[entity]];
}
export function scope(user: Actor, entity: Entity): Record<string, unknown> {
  const base: Record<string, unknown> = { companyId: user.companyId, deletedAt: null };
  if (user.role === 'MANAGER') {
    if (entity === 'tickets') base.departmentId = user.departmentId || '__none__';
    if (entity === 'tasks') base.assignee = { departmentId: user.departmentId || '__none__' };
    if (entity === 'projects')
      base.members = { some: { user: { departmentId: user.departmentId || '__none__' } } };
  }
  if (user.role === 'TEAM_LEAD') {
    const teammate = { teams: { some: { team: { members: { some: { userId: user.id } } } } } };
    if (['tasks', 'tickets'].includes(entity)) base.assignee = teammate;
    if (entity === 'projects') base.members = { some: { user: teammate } };
  }
  if (user.role === 'EMPLOYEE') {
    if (['tasks', 'tickets'].includes(entity)) base.assigneeId = user.id;
    if (entity === 'projects') base.members = { some: { userId: user.id } };
  }
  return base;
}
export async function listRecords(user: Actor, entity: Entity, query: Record<string, string>) {
  if (!can(user.role, entity)) throw new HttpError(403, 'Access denied');
  const q = listSchema.parse(query);
  const where: any = {
    ...scope(user, entity),
    ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
  };
  if (q.status) {
    const field = entity === 'leads' ? 'stage' : 'status';
    const parsed = (schemas[entity].shape as any)[field].safeParse(q.status);
    if (!parsed.success) throw new HttpError(422, 'Invalid status filter.');
    where[field] = parsed.data;
  }
  const sort = q.sort === 'dueDate' && ['clients', 'leads'].includes(entity) ? 'createdAt' : q.sort;
  const [items, total] = await Promise.all([
    delegate(db, entity).findMany({
      where,
      orderBy: { [sort]: q.order },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    delegate(db, entity).count({ where }),
  ]);
  return { items, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) };
}
async function validateRelations(
  tx: Prisma.TransactionClient,
  user: Actor,
  data: Record<string, unknown>,
) {
  const refs: { field: string; model: 'user' | 'client' | 'project' | 'department' }[] = [
    { field: 'ownerId', model: 'user' },
    { field: 'assigneeId', model: 'user' },
    { field: 'clientId', model: 'client' },
    { field: 'projectId', model: 'project' },
    { field: 'departmentId', model: 'department' },
  ];
  for (const { field, model } of refs) {
    if (!data[field]) continue;
    const where: any = { id: data[field], companyId: user.companyId };
    if (model === 'user') {
      where.active = true;
      where.deletedAt = null;
    }
    if (['client', 'project'].includes(model)) where.deletedAt = null;
    if (['MANAGER', 'TEAM_LEAD'].includes(user.role) && model === 'user')
      where.departmentId = user.departmentId || '__none__';
    if (user.role === 'TEAM_LEAD' && model === 'user')
      where.teams = { some: { team: { members: { some: { userId: user.id } } } } };
    if (['MANAGER', 'TEAM_LEAD', 'EMPLOYEE'].includes(user.role) && model === 'project')
      Object.assign(where, scope(user, 'projects'));
    if (
      ['MANAGER', 'TEAM_LEAD'].includes(user.role) &&
      model === 'department' &&
      data[field] !== user.departmentId
    )
      throw new HttpError(403, 'Choose your assigned department.');
    const found = await (tx[model] as any).findFirst({ where });
    if (!found) throw new HttpError(422, `Invalid ${field.replace('Id', '')} for this workspace.`);
  }
}
export async function mutateRecord(
  user: Actor,
  entity: Entity,
  action: 'create' | 'update' | 'archive',
  input: unknown,
  id?: string,
) {
  if (!can(user.role, entity, action)) throw new HttpError(403, 'Access denied');
  let data: Record<string, any> =
    action === 'archive'
      ? { deletedAt: new Date() }
      : action === 'create'
        ? schemas[entity].parse(input)
        : schemas[entity].partial().parse(input);
  if (
    user.role === 'EMPLOYEE' &&
    Object.keys(data).some((k) => !['status', 'description'].includes(k))
  )
    throw new HttpError(403, 'Employees can update work status and description only.');
  if (action === 'create' && ['MANAGER', 'TEAM_LEAD'].includes(user.role) && entity === 'tickets')
    data.departmentId = user.departmentId;
  if (
    action === 'create' &&
    ['MANAGER', 'TEAM_LEAD'].includes(user.role) &&
    ['tasks', 'tickets'].includes(entity) &&
    !data.assigneeId
  )
    data.assigneeId = user.id;
  const result = await db.$transaction(async (tx) => {
    const model = delegate(tx, entity);
    const before = id ? await model.findFirst({ where: { id, ...scope(user, entity) } }) : null;
    if (action !== 'create' && !before) throw new HttpError(404, 'Record not found');
    await validateRelations(tx, user, data);
    if (entity === 'tickets' && data.status)
      data.resolvedAt = ['RESOLVED', 'CLOSED'].includes(data.status)
        ? before?.resolvedAt || new Date()
        : null;
    if (entity === 'leads' && data.stage)
      data.wonAt = data.stage === 'WON' ? before?.wonAt || new Date() : null;
    const record =
      action === 'create'
        ? await model.create({ data: { ...data, companyId: user.companyId } })
        : await model.update({ where: { id }, data });
    if (entity === 'projects' && action === 'create')
      await tx.projectMember.create({ data: { projectId: record.id, userId: user.id } });
    await tx.auditLog.create({
      data: {
        companyId: user.companyId,
        actorId: user.id,
        action: action.toUpperCase(),
        target: entity,
        targetId: record.id,
        metadata: { name: record.name, fields: Object.keys(data) },
      },
    });
    if (entity === 'leads')
      await tx.leadActivity.create({
        data: { leadId: record.id, actorId: user.id, description: `${action}: ${record.stage}` },
      });
    const recipient = record.assigneeId || record.ownerId;
    if (recipient)
      await tx.notification.create({
        data: {
          companyId: user.companyId,
          userId: recipient,
          title: `${entity.slice(0, -1)} ${action === 'create' ? 'assigned' : 'updated'}`,
          body: record.name,
          href: `/${entity}/${record.id}`,
        },
      });
    return record;
  });
  const io = (globalThis as any).relayIO;
  if (result.assigneeId || result.ownerId)
    io?.to(`user:${result.assigneeId || result.ownerId}`).emit('notification');
  return result;
}
export async function detailRecord(user: Actor, entity: Entity, id: string) {
  if (!can(user.role, entity)) throw new HttpError(403, 'Access denied');
  const includes: any = {
    clients: {
      contacts: true,
      projects: { where: { deletedAt: null } },
      tickets: { where: { deletedAt: null } },
      invoices: true,
    },
    leads: { activities: { orderBy: { createdAt: 'desc' } } },
    projects: {
      members: { include: { user: { select: { id: true, name: true } } } },
      tasks: { where: { deletedAt: null } },
      attachments: true,
    },
    tasks: {
      subtasks: true,
      timeEntries: { include: { user: { select: { name: true } } } },
      attachments: true,
    },
    tickets: {
      comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      attachments: true,
    },
  };
  includes.clients.projects = can(user.role, 'projects')
    ? { where: scope(user, 'projects') }
    : false;
  includes.clients.invoices = can(user.role, 'billing');
  includes.clients.tickets = can(user.role, 'tickets') ? { where: scope(user, 'tickets') } : false;
  includes.projects.tasks = { where: scope(user, 'tasks') };
  const item = await delegate(db, entity).findFirst({
    where: { id, ...scope(user, entity) },
    include: includes[entity],
  });
  if (!item) throw new HttpError(404, 'Record not found');
  const activity = await db.auditLog.findMany({
    where: { companyId: user.companyId, targetId: id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return { item, activity };
}
