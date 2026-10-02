import { describe, expect, it } from 'vitest';
import { can, roleLabels } from '../src/lib/permissions';
import { schemas, password, listSchema } from '../src/lib/validation';

describe('server role policy', () => {
  it('grants only super admins the full audit trail', () => {
    expect(can('SUPER_ADMIN', 'audit')).toBe(true);
    for (const role of Object.keys(roleLabels).filter((r) => r !== 'SUPER_ADMIN'))
      expect(can(role as any, 'audit')).toBe(false);
    expect(can('SUPER_ADMIN', 'audit', 'update')).toBe(false);
  });
  it('separates sales and employee privileges', () => {
    expect(can('SALES', 'leads', 'create')).toBe(true);
    expect(can('SALES', 'tickets', 'update')).toBe(false);
    expect(can('EMPLOYEE', 'tickets', 'update')).toBe(true);
    expect(can('EMPLOYEE', 'tickets', 'create')).toBe(false);
    expect(can('EMPLOYEE', 'clients')).toBe(false);
    expect(can('TEAM_LEAD', 'billing')).toBe(false);
    expect(can('MANAGER', 'employees', 'update')).toBe(false);
  });
  it('denies unknown resources and roles', () => {
    expect(can('ADMIN', 'credentials')).toBe(false);
    expect(can('UNKNOWN' as any, 'clients')).toBe(false);
  });
});
describe('untrusted inputs', () => {
  it('rejects tenant overrides and invalid associations', () => {
    expect(
      schemas.clients.safeParse({
        name: 'Example',
        email: 'valid@example.com',
        companyId: 'foreign',
      }).success,
    ).toBe(false);
    expect(schemas.tickets.safeParse({ name: 'Ticket', assigneeId: 'not-an-id' }).success).toBe(
      false,
    );
  });
  it('validates money, priorities and progress', () => {
    expect(schemas.leads.safeParse({ name: 'Lead', value: -1 }).success).toBe(false);
    expect(schemas.projects.safeParse({ name: 'Project', progress: 101 }).success).toBe(false);
    expect(schemas.tickets.safeParse({ name: 'Ticket', priority: 'ROOT' }).success).toBe(false);
    expect(schemas.leads.parse({ name: 'Lead', value: '123.45' }).value).toBe(123.45);
  });
  it('removes markup from plain text fields', () => {
    expect(
      schemas.clients.parse({
        name: 'Example',
        email: 'valid@example.com',
        notes: '<script>bad()</script> Hello',
      }).notes,
    ).toBe('bad() Hello');
  });
  it('rejects weak and bcrypt-truncated passwords', () => {
    expect(password.safeParse('short').success).toBe(false);
    expect(password.safeParse('ValidPassword2026!').success).toBe(true);
    expect(password.safeParse('Aa1' + 'é'.repeat(36)).success).toBe(false);
  });
  it('bounds pagination and sort fields', () => {
    expect(listSchema.safeParse({ limit: 1000 }).success).toBe(false);
    expect(listSchema.safeParse({ page: -1 }).success).toBe(false);
    expect(listSchema.safeParse({ sort: 'passwordHash' }).success).toBe(false);
  });
});
