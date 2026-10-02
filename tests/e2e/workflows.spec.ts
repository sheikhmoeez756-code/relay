import { test, expect, request as api, type APIRequestContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { hash } from 'bcrypt';

const baseURL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const db = new PrismaClient();
const password = process.env.DEMO_PASSWORD || 'RelayDemo2026!';
const headers = { Origin: baseURL };
let admin: APIRequestContext, employee: APIRequestContext, foreign: APIRequestContext;
const suffix = Date.now().toString();
async function signIn(email: string, secret = password) {
  const context = await api.newContext({ baseURL, extraHTTPHeaders: headers });
  const csrf = await (await context.get('/api/auth/csrf')).json();
  const response = await context.post('/api/auth/callback/credentials', {
    form: {
      csrfToken: csrf.csrfToken,
      email,
      password: secret,
      json: 'true',
      callbackUrl: baseURL + '/dashboard',
    },
  });
  expect(response.ok()).toBeTruthy();
  const session = await (await context.get('/api/auth/session')).json();
  expect(session.user?.email).toBe(email);
  return context;
}
test.beforeAll(async () => {
  for (const name of ['admin', 'employee', 'isolation', 'superadmin', 'manager', 'lead', 'sales']) {
    const key = createHash('sha256').update(`login:${name}@example.com`).digest('hex');
    await db.rateLimit.deleteMany({ where: { key } });
  }
  admin = await signIn('admin@example.com');
  employee = await signIn('employee@example.com');
  foreign = await signIn('isolation@example.com');
});
test.afterAll(async () => {
  await Promise.all([admin?.dispose(), employee?.dispose(), foreign?.dispose()]);
  await db.$disconnect();
});

test('all six roles sign in and role-restricted endpoints stay protected', async () => {
  for (const role of ['superadmin', 'manager', 'lead', 'sales']) {
    const ctx = await signIn(role + '@example.com');
    expect((await ctx.get('/api/dashboard')).status()).toBe(200);
    expect((await ctx.get('/api/collaboration?type=audit')).status()).toBe(
      role === 'superadmin' ? 200 : 403,
    );
    await ctx.dispose();
  }
  expect((await employee.get('/api/records/clients')).status()).toBe(403);
  expect(
    (
      await employee.post('/api/records/tickets', { data: { name: 'Unauthorized ticket' } })
    ).status(),
  ).toBe(403);
});
test('clients persist across requests, support search, and are isolated by company', async () => {
  const created = await admin.post('/api/records/clients', {
    data: {
      name: `Browser client ${suffix}`,
      email: 'browser-client@example.com',
      industry: 'Testing',
    },
  });
  expect(created.status()).toBe(201);
  const client = await created.json();
  expect(
    (
      await admin.patch('/api/records/clients/' + client.id, {
        data: { name: `Edited browser client ${suffix}` },
      })
    ).status(),
  ).toBe(200);
  const list = await (
    await admin.get('/api/records/clients?q=' + suffix + '&sort=name&order=asc')
  ).json();
  expect(list.items.some((c: any) => c.id === client.id)).toBe(true);
  expect((await foreign.get('/api/records/clients/' + client.id)).status()).toBe(404);
  expect(
    (
      await foreign.patch('/api/records/clients/' + client.id, {
        data: { name: 'Unauthorized change' },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await foreign.post('/api/records/tickets', {
        data: { name: 'Foreign relationship', clientId: client.id },
      })
    ).status(),
  ).toBe(422);
  expect((await admin.delete('/api/records/clients/' + client.id)).status()).toBe(200);
  expect((await admin.get('/api/records/clients/' + client.id)).status()).toBe(404);
});
test('ticket assignment, status, notification and audit are persistent', async () => {
  const worker = await db.user.findUniqueOrThrow({ where: { email: 'employee@example.com' } });
  const res = await admin.post('/api/records/tickets', {
    data: { name: `Browser ticket ${suffix}`, assigneeId: worker.id, priority: 'HIGH' },
  });
  expect(res.status()).toBe(201);
  const ticket = await res.json();
  expect(
    (
      await employee.patch('/api/records/tickets/' + ticket.id, { data: { status: 'IN_PROGRESS' } })
    ).status(),
  ).toBe(200);
  expect(
    (
      await employee.patch('/api/records/tickets/' + ticket.id, { data: { status: 'RESOLVED' } })
    ).status(),
  ).toBe(200);
  expect(
    (
      await employee.post(`/api/records/tickets/${ticket.id}/actions`, {
        data: { action: 'comment', body: 'Verified workflow comment' },
      })
    ).status(),
  ).toBe(201);
  expect(await db.auditLog.count({ where: { targetId: ticket.id } })).toBe(4);
  expect(
    await db.notification.count({ where: { userId: worker.id, body: ticket.name } }),
  ).toBeGreaterThan(0);
  expect(
    (await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).resolvedAt,
  ).not.toBeNull();
  await admin.delete('/api/records/tickets/' + ticket.id);
});
test('lead pipeline updates and dashboard API reflects persisted totals', async () => {
  const res = await admin.post('/api/records/leads', {
    data: { name: `Browser lead ${suffix}`, value: 1234, stage: 'NEW' },
  });
  expect(res.status()).toBe(201);
  const lead = await res.json();
  expect(
    (await admin.patch('/api/records/leads/' + lead.id, { data: { stage: 'WON' } })).status(),
  ).toBe(200);
  const dash = await (await admin.get('/api/dashboard?days=30')).json();
  expect(dash.sales).toBeGreaterThanOrEqual(1234);
  expect(dash.chart).toHaveLength(7);
  expect(await db.leadActivity.count({ where: { leadId: lead.id } })).toBe(2);
  await admin.delete('/api/records/leads/' + lead.id);
});
test('origin checks reject forged mutations and anonymous data access', async () => {
  const anonymous = await api.newContext({ baseURL });
  expect((await anonymous.get('/api/records/clients')).status()).toBe(401);
  await anonymous.dispose();
  const result = await admin.post('/api/records/clients', {
    headers: { Origin: 'https://untrusted.example' },
    data: { name: 'Forged client', email: 'forged@example.com' },
  });
  expect(result.status()).toBe(403);
});
test('password reset is single-use and invalidates existing sessions', async () => {
  const seedUser = await db.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
  const email = `reset-${suffix}@example.com`;
  const raw = randomBytes(32).toString('hex');
  const user = await db.user.create({
    data: {
      companyId: seedUser.companyId,
      name: 'Reset test',
      email,
      role: 'EMPLOYEE',
      passwordHash: await hash(password, 12),
      emailVerified: new Date(),
    },
  });
  const oldSession = await signIn(email);
  await db.verificationToken.create({
    data: {
      identifier: email,
      token: createHash('sha256').update(raw).digest('hex'),
      purpose: 'reset',
      expires: new Date(Date.now() + 60000),
    },
  });
  const updatedPassword = 'UpdatedPassword2026!';
  const first = await admin.post('/api/account', {
    data: { action: 'reset', token: raw, password: updatedPassword },
  });
  expect(first.status()).toBe(200);
  expect(
    (
      await admin.post('/api/account', {
        data: { action: 'reset', token: raw, password: updatedPassword },
      })
    ).status(),
  ).toBe(422);
  expect((await oldSession.get('/api/workspace')).status()).toBe(401);
  const nextSession = await signIn(email, updatedPassword);
  await nextSession.dispose();
  await oldSession.dispose();
  await db.auditLog.deleteMany({ where: { actorId: user.id } });
  await db.user.delete({ where: { id: user.id } });
});
test('desktop UI creates and edits a client with validation', async ({ page }) => {
  await page.context().addCookies((await admin.storageState()).cookies);
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New client', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Company name').fill(`UI client ${suffix}`);
  await dialog.getByLabel('Email', { exact: false }).fill('ui@example.com');
  await dialog.getByRole('button', { name: 'Create client', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole('textbox', { name: 'Search clients', exact: true })
    .fill(`UI client ${suffix}`);
  await expect(page.getByText(`UI client ${suffix}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Edit UI client ${suffix}`, exact: true }).click();
  await page.getByRole('dialog').getByLabel('Company name').fill(`Updated UI client ${suffix}`);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText(`Updated UI client ${suffix}`, { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: `Archive Updated UI client ${suffix}`, exact: true })
    .click();
  await page.getByRole('button', { name: 'Archive record', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No matching records' })).toBeVisible();
});
test('dashboard works on desktop and mobile without horizontal page overflow', async ({ page }) => {
  await page.context().addCookies((await admin.storageState()).cookies);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Clients', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Clients', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
});
