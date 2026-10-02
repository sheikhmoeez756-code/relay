import { PrismaClient, RoleKey, Status, Priority, LeadStage } from '@prisma/client';
import { hash } from 'bcrypt';
const db = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true')
    throw new Error('Demo seeding is blocked in production unless DEMO_MODE=true.');
  const password = process.env.DEMO_PASSWORD || 'RelayDemo2026!';
  const passwordHash = await hash(password, 12);
  const company = await db.company.upsert({
    where: { id: 'demo-relay-company' },
    create: {
      id: 'demo-relay-company',
      name: 'Northstar BPO',
      isDemo: true,
      onboarded: true,
      timezone: 'Asia/Karachi',
    },
    update: {},
  });
  const departments = await Promise.all(
    ['Operations', 'Customer Success', 'Engineering', 'Sales'].map((name) =>
      db.department.upsert({
        where: { companyId_name: { companyId: company.id, name } },
        create: { companyId: company.id, name },
        update: {},
      }),
    ),
  );
  const roles: { email: string; name: string; role: RoleKey; dept: number }[] = [
    { email: 'superadmin@example.com', name: 'Alex Morgan', role: 'SUPER_ADMIN', dept: 0 },
    { email: 'admin@example.com', name: 'Alex Morgan', role: 'ADMIN', dept: 0 },
    { email: 'manager@example.com', name: 'Sarah Chen', role: 'MANAGER', dept: 0 },
    { email: 'lead@example.com', name: 'James Wilson', role: 'TEAM_LEAD', dept: 0 },
    { email: 'sales@example.com', name: 'Olivia Brooks', role: 'SALES', dept: 3 },
    { email: 'employee@example.com', name: 'Daniel Kim', role: 'EMPLOYEE', dept: 0 },
  ];
  const users = [];
  for (const r of roles) {
    await db.role.upsert({
      where: { key: r.role },
      create: { key: r.role, name: r.role },
      update: {},
    });
    const user = await db.user.upsert({
      where: { email: r.email },
      create: {
        companyId: company.id,
        email: r.email,
        name: r.name,
        role: r.role,
        passwordHash,
        emailVerified: new Date(),
        departmentId: departments[r.dept].id,
        mustChangePassword: true,
      },
      update: {},
    });
    users.push(user);
    const role = await db.role.findUniqueOrThrow({ where: { key: r.role } });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });
  }
  const admin = users[1],
    employee = users[5];
  await db.subscription.upsert({
    where: { companyId: company.id },
    create: { companyId: company.id, plan: 'GROWTH', status: 'DEMO' },
    update: {},
  });
  const team = await db.team.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Service delivery' } },
    create: { companyId: company.id, departmentId: departments[0].id, name: 'Service delivery' },
    update: {},
  });
  for (const u of users.filter((u) => u.departmentId === departments[0].id))
    await db.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: u.id } },
      create: { teamId: team.id, userId: u.id },
      update: {},
    });
  if ((await db.client.count({ where: { companyId: company.id } })) === 0) {
    const names = [
      'Acme Technologies',
      'Brightside Health',
      'Vertex Financial',
      'Lumina Retail',
      'Evergreen Logistics',
      'Horizon Media',
      'Cedar & Co.',
      'Atlas Solutions',
      'Bloom Commerce',
      'Meridian Group',
      'Cloudline Systems',
      'Oakwell Partners',
    ];
    const clients = [];
    for (const [i, name] of names.entries())
      clients.push(
        await db.client.create({
          data: {
            companyId: company.id,
            name,
            email: `contact${i + 1}@example.com`,
            industry: ['Technology', 'Healthcare', 'Finance', 'Retail', 'Logistics', 'Media'][
              i % 6
            ],
            phone: `+1 202 555 ${String(100 + i).padStart(4, '0')}`,
            status: i % 5 === 0 ? 'Onboarding' : 'Active',
            notes: 'Fictional demonstration client. No real company relationship is implied.',
            contacts: {
              create: {
                name: ['Emma Davis', 'Michael Reed', 'Sophie Turner'][i % 3],
                email: `demo-contact${i}@example.com`,
              },
            },
          },
        }),
      );
    const projects = [];
    for (const [i, name] of [
      'Customer support expansion',
      'Website redesign',
      'Q4 financial reporting',
      'CRM implementation',
      'Onboarding automation',
      'Knowledge base refresh',
    ].entries()) {
      const project = await db.project.create({
        data: {
          companyId: company.id,
          name,
          description:
            'Demonstration project: coordinate delivery, track progress, and keep the client informed.',
          clientId: clients[i].id,
          status: i === 5 ? 'RESOLVED' : 'IN_PROGRESS',
          priority: i % 3 === 0 ? 'HIGH' : 'MEDIUM',
          progress: [72, 48, 86, 35, 61, 100][i],
          startDate: new Date(Date.now() - 21 * 86400000),
          dueDate: new Date(Date.now() + (i + 2) * 86400000),
          members: {
            create: users.filter((u) => u.role !== 'SALES').map((u) => ({ userId: u.id })),
          },
        },
      });
      projects.push(project);
    }
    for (const [i, name] of [
      'Resolve customer portal login issue',
      'Update monthly billing report',
      'Configure new team permissions',
      'Review API integration timeout',
      'Prepare onboarding documentation',
      'Fix dashboard export formatting',
      'Investigate delayed email delivery',
      'Update client contact information',
      'Review service-level agreement',
      'Complete knowledge base migration',
      'Customer account reconciliation',
      'Prepare weekly performance summary',
    ].entries()) {
      const st: Status[] = ['OPEN', 'IN_PROGRESS', 'ASSIGNED', 'WAITING', 'RESOLVED', 'CLOSED'];
      const status = st[i % 6];
      const createdAt = new Date(Date.now() - (i * 2 + 1) * 86400000);
      const ticket = await db.ticket.create({
        data: {
          companyId: company.id,
          name,
          description:
            'Seeded demonstration request. Review the context, coordinate with the team, and record the resolution.',
          clientId: clients[i % clients.length].id,
          projectId: projects[i % projects.length].id,
          departmentId: departments[0].id,
          assigneeId: users[[5, 3, 2][i % 3]].id,
          status,
          priority: (['HIGH', 'MEDIUM', 'LOW', 'URGENT'] as Priority[])[i % 4],
          dueDate: new Date(Date.now() + ((i % 4) - 1) * 86400000),
          createdAt,
          resolvedAt: ['RESOLVED', 'CLOSED'].includes(status)
            ? new Date(createdAt.getTime() + 18 * 3600000)
            : null,
        },
      });
      await db.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: admin.id,
          body: 'Demo update: initial review complete. Please add findings before closing this request.',
        },
      });
      await db.auditLog.create({
        data: {
          companyId: company.id,
          actorId: users[i % users.length].id,
          action: 'CREATE',
          target: 'tickets',
          targetId: ticket.id,
          metadata: { name: ticket.name, demo: true },
          createdAt: new Date(Date.now() - i * 45 * 60000),
        },
      });
    }
    for (const [i, name] of [
      'Review support escalation playbook',
      'Finalize client onboarding checklist',
      'QA the new reporting dashboard',
      'Prepare the weekly client update',
      'Update API documentation',
      'Review team capacity',
      'Run accessibility checks',
      'Complete deployment checklist',
      'Reconcile project time entries',
      'Prepare customer success handoff',
    ].entries()) {
      const task = await db.task.create({
        data: {
          companyId: company.id,
          name,
          description: 'Fictional demo task for the delivery team.',
          projectId: projects[i % projects.length].id,
          assigneeId: users[[5, 3, 2][i % 3]].id,
          status: i % 3 === 0 ? 'RESOLVED' : i % 3 === 1 ? 'IN_PROGRESS' : 'OPEN',
          priority: i % 4 === 0 ? 'HIGH' : 'MEDIUM',
          dueDate: new Date(Date.now() + (i + 1) * 86400000),
          subtasks: {
            create: [
              { name: 'Review requirements', completed: true },
              { name: 'Complete work and request review', completed: false },
            ],
          },
        },
      });
      await db.timeEntry.create({
        data: {
          taskId: task.id,
          userId: employee.id,
          minutes: 30 + i * 10,
          note: 'Demonstration work session',
        },
      });
    }
    const leadNames = [
      'Emma Thompson',
      'Noah Williams',
      'Ava Martinez',
      'Liam Anderson',
      'Isabella Scott',
      'Mason Taylor',
      'Sophia Clark',
      'Lucas Walker',
      'Amelia Hall',
      'Ethan Lewis',
      'Charlotte Young',
      'Henry King',
    ];
    for (const [i, name] of leadNames.entries())
      await db.lead.create({
        data: {
          companyId: company.id,
          name,
          organization: [
            'NovaCare',
            'Summit Labs',
            'Greenfield Group',
            'Pioneer Digital',
            'Clearview Finance',
            'Bluebird Commerce',
          ][i % 6],
          email: `demo-lead${i}@example.com`,
          value: [12000, 8500, 24000, 18500, 32000, 9500, 16000, 21000, 15000, 42000, 28000, 19000][
            i
          ],
          stage: (['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'WON'] as LeadStage[])[
            i % 6
          ],
          ownerId: users[4].id,
          followUpDate: new Date(Date.now() + (i + 1) * 86400000),
          notes: 'Fictional opportunity. Values are demonstration data only.',
          updatedAt: new Date(Date.now() - i * 2 * 86400000),
          wonAt: i % 6 >= 4 ? new Date(Date.now() - i * 2 * 86400000) : null,
          activities: {
            create: { actorId: users[4].id, description: 'Demo opportunity added to pipeline' },
          },
        },
      });
    const conversation = await db.conversation.create({
      data: {
        companyId: company.id,
        name: 'Operations team',
        members: { create: users.map((u) => ({ userId: u.id })) },
      },
    });
    for (const [i, body] of [
      'Welcome to the demo workspace! This is our shared operations channel.',
      'The onboarding checklist is ready for review. I’ve linked it to the project.',
      'Thanks, team. Let’s keep client updates in their ticket threads so the context stays together.',
    ].entries())
      await db.message.create({
        data: {
          conversationId: conversation.id,
          authorId: users[i + 1].id,
          body,
          createdAt: new Date(Date.now() - (3 - i) * 3600000),
        },
      });
    for (const u of users)
      await db.notification.create({
        data: {
          companyId: company.id,
          userId: u.id,
          title: 'Welcome to your demo workspace',
          body: 'Explore the fictional client records, projects, tickets, and team conversations.',
          href: '/dashboard',
        },
      });
    for (const [i, client] of clients.slice(0, 3).entries())
      await db.invoice.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          number: `DEMO-2026-${i + 1}`,
          amount: 2500 + i * 1500,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 14 * 86400000),
        },
      });
  }
  const other = await db.company.upsert({
    where: { id: 'demo-isolation-company' },
    create: { id: 'demo-isolation-company', name: 'Isolation Test Company', isDemo: true },
    update: {},
  });
  await db.user.upsert({
    where: { email: 'isolation@example.com' },
    create: {
      companyId: other.id,
      name: 'Isolation Tester',
      email: 'isolation@example.com',
      role: 'ADMIN',
      passwordHash,
      emailVerified: new Date(),
      mustChangePassword: true,
    },
    update: {},
  });
  if (!(await db.client.count({ where: { companyId: other.id } })))
    await db.client.create({
      data: {
        companyId: other.id,
        name: 'Private tenant test client',
        email: 'private@example.com',
        notes: 'Must never be accessible from Northstar accounts.',
      },
    });
  console.log(
    'Demo seed complete. All records are fictional. Six requested accounts use the configured DEMO_PASSWORD (default: RelayDemo2026!). Change development passwords before deploying.',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
