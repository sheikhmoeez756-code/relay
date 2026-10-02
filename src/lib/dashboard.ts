import { Status } from '@prisma/client';
import { db } from './db';
import { Actor } from './security';
import { scope } from './records';
import { can } from './permissions';

const DAY = 86400000;
const closed: Status[] = ['RESOLVED', 'CLOSED'];

export async function dashboard(user: Actor, days = 30) {
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY);
  const canClients = can(user.role, 'clients');
  const canProjects = can(user.role, 'projects');
  const canTickets = can(user.role, 'tickets');
  const canLeads = can(user.role, 'leads');
  const canTasks = can(user.role, 'tasks');

  const projectScope = scope(user, 'projects');
  const ticketScope = scope(user, 'tickets');
  const taskScope = scope(user, 'tasks');
  const leadScope = { companyId: user.companyId, deletedAt: null };
  const openTicketScope = { ...ticketScope, status: { notIn: closed } };
  const dueSoon = { dueDate: { not: null }, status: { notIn: closed } };

  const [
    clients,
    activeProjects,
    projects,
    openTickets,
    overdue,
    recentTickets,
    openedInPeriod,
    resolvedInPeriod,
    wonInPeriod,
    pipelineGroups,
    totalTasks,
    doneTasks,
    taskDeadlines,
    projectDeadlines,
    activity,
  ] = await Promise.all([
    canClients ? db.client.count({ where: { companyId: user.companyId, deletedAt: null } }) : 0,
    canProjects ? db.project.count({ where: { ...projectScope, status: { notIn: closed } } }) : 0,
    canProjects
      ? db.project.findMany({
          where: { ...projectScope, status: { notIn: closed } },
          orderBy: { updatedAt: 'desc' },
          take: 4,
        })
      : [],
    canTickets ? db.ticket.count({ where: openTicketScope }) : 0,
    canTickets ? db.ticket.count({ where: { ...openTicketScope, dueDate: { lt: now } } }) : 0,
    canTickets
      ? db.ticket.findMany({
          where: ticketScope,
          include: { assignee: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : [],
    canTickets
      ? db.ticket.findMany({
          where: { ...ticketScope, createdAt: { gte: since } },
          select: { createdAt: true },
        })
      : [],
    canTickets
      ? db.ticket.findMany({
          where: { ...ticketScope, resolvedAt: { gte: since } },
          select: { createdAt: true, resolvedAt: true },
        })
      : [],
    canLeads
      ? db.lead.findMany({
          where: { ...leadScope, stage: 'WON', wonAt: { gte: since } },
          select: { wonAt: true, value: true },
        })
      : [],
    canLeads
      ? db.lead.groupBy({ by: ['stage'], where: leadScope, _count: true, _sum: { value: true } })
      : [],
    canTasks ? db.task.count({ where: taskScope }) : 0,
    canTasks ? db.task.count({ where: { ...taskScope, status: { in: closed } } }) : 0,
    canTasks
      ? db.task.findMany({
          where: { ...taskScope, ...dueSoon },
          orderBy: { dueDate: 'asc' },
          take: 4,
        })
      : [],
    canProjects
      ? db.project.findMany({
          where: { ...projectScope, ...dueSoon },
          orderBy: { dueDate: 'asc' },
          take: 4,
        })
      : [],
    db.auditLog.findMany({
      where: {
        companyId: user.companyId,
        ...(!['SUPER_ADMIN', 'ADMIN'].includes(user.role) ? { actorId: user.id } : {}),
      },
      include: { actor: { select: { name: true } } },
      take: 6,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Seven equal buckets covering exactly [since, now).
  const bucketMs = (days / 7) * DAY;
  const inBucket = (d: Date | null, i: number) =>
    !!d &&
    d.getTime() >= since.getTime() + i * bucketMs &&
    d.getTime() < since.getTime() + (i + 1) * bucketMs;
  const chart = Array.from({ length: 7 }, (_, i) => ({
    name: new Date(since.getTime() + i * bucketMs).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    sales: wonInPeriod.filter((l) => inBucket(l.wonAt, i)).reduce((s, l) => s + Number(l.value), 0),
    opened: openedInPeriod.filter((t) => inBucket(t.createdAt, i)).length,
    resolved: resolvedInPeriod.filter((t) => inBucket(t.resolvedAt, i)).length,
  }));

  return {
    clients,
    activeProjects,
    openTickets,
    overdue,
    resolvedTickets: resolvedInPeriod.length,
    sales: wonInPeriod.reduce((s, l) => s + Number(l.value), 0),
    productivity: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
    averageResolution: resolvedInPeriod.length
      ? Math.round(
          resolvedInPeriod.reduce(
            (s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3600000,
            0,
          ) / resolvedInPeriod.length,
        )
      : 0,
    chart,
    tickets: recentTickets,
    projects,
    activity,
    deadlines: [
      ...taskDeadlines.map((t) => ({ ...t, entity: 'tasks' })),
      ...projectDeadlines.map((p) => ({ ...p, entity: 'projects' })),
    ]
      .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
      .slice(0, 4),
    pipeline: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'].map((stage) => {
      const group = pipelineGroups.find((g) => g.stage === stage);
      return { name: stage, count: group?._count ?? 0, value: Number(group?._sum.value ?? 0) };
    }),
  };
}
