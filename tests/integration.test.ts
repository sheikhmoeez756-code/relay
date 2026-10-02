import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { hash, compare } from 'bcrypt';
import { db } from '../src/lib/db';
import { mutateRecord, listRecords, detailRecord } from '../src/lib/records';
import { dashboard } from '../src/lib/dashboard';
import type { Actor } from '../src/lib/security';

describe.runIf(process.env.RUN_DB_TESTS === '1')('PostgreSQL persistence and isolation', () => {
  let admin: Actor, employee: Actor, foreign: Actor;
  const companyIds: string[] = [];
  let client: any, ticket: any;
  beforeAll(async () => {
    const passwordHash = await hash('IntegrationTest2026!', 12);
    for (let i = 0; i < 2; i++) {
      const company = await db.company.create({
        data: { name: `Integration ${Date.now()} ${i}`, isDemo: true },
      });
      companyIds.push(company.id);
      const user = await db.user.create({
        data: {
          companyId: company.id,
          name: 'Test administrator',
          email: `integration-${company.id}@example.com`,
          role: 'ADMIN',
          passwordHash,
          emailVerified: new Date(),
        },
        include: { company: true, department: true },
      });
      if (i === 0) admin = user;
      else foreign = user;
    }
    employee = await db.user.create({
      data: {
        companyId: admin.companyId,
        name: 'Test employee',
        email: `employee-${admin.companyId}@example.com`,
        role: 'EMPLOYEE',
        passwordHash,
        emailVerified: new Date(),
      },
      include: { company: true, department: true },
    });
  });
  afterAll(async () => {
    // Delete only the test companies created by this suite, in dependency order.
    for (const companyId of companyIds) {
      await db.notification.deleteMany({ where: { companyId } });
      await db.auditLog.deleteMany({ where: { companyId } });
      await db.leadActivity.deleteMany({ where: { lead: { companyId } } });
      await db.lead.deleteMany({ where: { companyId } });
      await db.ticket.deleteMany({ where: { companyId } });
      await db.projectMember.deleteMany({ where: { project: { companyId } } });
      await db.task.deleteMany({ where: { companyId } });
      await db.project.deleteMany({ where: { companyId } });
      await db.client.deleteMany({ where: { companyId } });
      await db.user.deleteMany({ where: { companyId } });
      await db.company.delete({ where: { id: companyId } });
    }
    await db.$disconnect();
  });
  it('stores a bcrypt password rather than plaintext', async () => {
    expect(admin.passwordHash).not.toContain('IntegrationTest');
    expect(await compare('IntegrationTest2026!', admin.passwordHash)).toBe(true);
    expect(await compare('Incorrect', admin.passwordHash)).toBe(false);
  });
  it('creates and edits a persistent client with audit records', async () => {
    client = await mutateRecord(admin, 'clients', 'create', {
      name: 'Integration Client',
      email: 'client@example.com',
    });
    await mutateRecord(
      admin,
      'clients',
      'update',
      { name: 'Updated Integration Client' },
      client.id,
    );
    expect((await db.client.findUniqueOrThrow({ where: { id: client.id } })).name).toBe(
      'Updated Integration Client',
    );
    expect(
      await db.auditLog.count({ where: { companyId: admin.companyId, targetId: client.id } }),
    ).toBe(2);
  });
  it('rejects reads, edits and foreign keys crossing company boundaries', async () => {
    await expect(detailRecord(foreign, 'clients', client.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      mutateRecord(foreign, 'clients', 'update', { name: 'Stolen' }, client.id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      mutateRecord(foreign, 'tickets', 'create', {
        name: 'Cross-company ticket',
        clientId: client.id,
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect((await listRecords(foreign, 'clients', {})).total).toBe(0);
    expect(await db.auditLog.count({ where: { companyId: foreign.companyId } })).toBe(0);
  });
  it('creates, assigns and resolves a ticket with a notification', async () => {
    ticket = await mutateRecord(admin, 'tickets', 'create', {
      name: 'Integration ticket',
      clientId: client.id,
      assigneeId: employee.id,
      priority: 'HIGH',
    });
    await mutateRecord(employee, 'tickets', 'update', { status: 'IN_PROGRESS' }, ticket.id);
    await mutateRecord(employee, 'tickets', 'update', { status: 'RESOLVED' }, ticket.id);
    const resolved = await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(resolved.resolvedAt).not.toBeNull();
    await mutateRecord(employee, 'tickets', 'update', { status: 'CLOSED' }, ticket.id);
    expect((await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).resolvedAt).toEqual(
      resolved.resolvedAt,
    );
    expect(await db.notification.count({ where: { userId: employee.id } })).toBe(4);
  });
  it('prevents employees from reassigning work or accessing unassigned tickets', async () => {
    await expect(
      mutateRecord(employee, 'tickets', 'update', { assigneeId: admin.id }, ticket.id),
    ).rejects.toMatchObject({ status: 403 });
    const other = await mutateRecord(admin, 'tickets', 'create', {
      name: 'Administrator-only ticket',
      assigneeId: admin.id,
    });
    await expect(detailRecord(employee, 'tickets', other.id)).rejects.toMatchObject({
      status: 404,
    });
    expect((await listRecords(employee, 'tickets', {})).total).toBe(1);
  });
  it('persists lead stage changes and their history', async () => {
    const lead = await mutateRecord(admin, 'leads', 'create', {
      name: 'Pipeline test',
      value: 1500,
      stage: 'NEW',
    });
    await mutateRecord(admin, 'leads', 'update', { stage: 'WON' }, lead.id);
    expect((await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).stage).toBe('WON');
    expect(await db.leadActivity.count({ where: { leadId: lead.id } })).toBe(2);
  });
  it('calculates dashboard results from persisted company data', async () => {
    const result = await dashboard(admin);
    expect(result.clients).toBe(1);
    expect(result.sales).toBe(1500);
    expect(result.openTickets).toBe(1);
    expect(result.resolvedTickets).toBe(1);
    expect((await dashboard(foreign)).clients).toBe(0);
  });
  it('archives records without losing their audit trail', async () => {
    await mutateRecord(admin, 'clients', 'archive', {}, client.id);
    expect((await listRecords(admin, 'clients', {})).total).toBe(0);
    expect(
      (await db.client.findUniqueOrThrow({ where: { id: client.id } })).deletedAt,
    ).not.toBeNull();
    expect(await db.auditLog.count({ where: { targetId: client.id, action: 'ARCHIVE' } })).toBe(1);
  });
});
