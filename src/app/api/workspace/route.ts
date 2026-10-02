import { db } from '@/lib/db';
import { currentUser, errorResponse, publicUser } from '@/lib/security';
import { can } from '@/lib/permissions';
import { scope } from '@/lib/records';
export async function GET() {
  try {
    const u = await currentUser();
    const companyId = u.companyId;
    const restricted = ['MANAGER', 'TEAM_LEAD'].includes(u.role);
    const [users, departments, clients, projects] = await Promise.all([
      db.user.findMany({
        where: {
          companyId,
          active: true,
          deletedAt: null,
          ...(restricted ? { departmentId: u.departmentId || '__none__' } : {}),
          ...(u.role === 'TEAM_LEAD'
            ? { teams: { some: { team: { members: { some: { userId: u.id } } } } } }
            : {}),
        },
        select: { id: true, name: true, email: true, role: true, departmentId: true },
      }),
      db.department.findMany({
        where: { companyId, ...(restricted ? { id: u.departmentId || '__none__' } : {}) },
      }),
      can(u.role, 'clients')
        ? db.client.findMany({ where: scope(u, 'clients'), select: { id: true, name: true } })
        : [],
      can(u.role, 'projects')
        ? db.project.findMany({ where: scope(u, 'projects'), select: { id: true, name: true } })
        : [],
    ]);
    return Response.json({ user: publicUser(u), users, departments, clients, projects });
  } catch (e) {
    return errorResponse(e);
  }
}
