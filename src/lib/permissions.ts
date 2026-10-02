import { RoleKey } from '@prisma/client';
export type Resource =
  | 'dashboard'
  | 'clients'
  | 'leads'
  | 'projects'
  | 'tasks'
  | 'tickets'
  | 'employees'
  | 'analytics'
  | 'messages'
  | 'notifications'
  | 'audit'
  | 'settings'
  | 'billing';
const reads: Record<RoleKey, Resource[]> = {
  SUPER_ADMIN: [
    'dashboard',
    'clients',
    'leads',
    'projects',
    'tasks',
    'tickets',
    'employees',
    'analytics',
    'messages',
    'notifications',
    'audit',
    'settings',
    'billing',
  ],
  ADMIN: [
    'dashboard',
    'clients',
    'leads',
    'projects',
    'tasks',
    'tickets',
    'employees',
    'analytics',
    'messages',
    'notifications',
    'settings',
    'billing',
  ],
  MANAGER: [
    'dashboard',
    'clients',
    'projects',
    'tasks',
    'tickets',
    'employees',
    'analytics',
    'messages',
    'notifications',
    'settings',
  ],
  TEAM_LEAD: [
    'dashboard',
    'projects',
    'tasks',
    'tickets',
    'employees',
    'messages',
    'notifications',
    'settings',
  ],
  SALES: ['dashboard', 'clients', 'leads', 'messages', 'notifications', 'settings'],
  EMPLOYEE: ['dashboard', 'projects', 'tasks', 'tickets', 'messages', 'notifications', 'settings'],
};
export function can(role: RoleKey, resource: string, action = 'read') {
  if (!reads[role]?.includes(resource as Resource)) return false;
  if (action === 'read') return true;
  if (resource === 'audit') return false;
  if (['SUPER_ADMIN', 'ADMIN'].includes(role)) return true;
  if (['settings', 'messages', 'notifications'].includes(resource)) return true;
  if (role === 'MANAGER') return ['clients', 'projects', 'tasks', 'tickets'].includes(resource);
  if (role === 'TEAM_LEAD') return ['tasks', 'tickets'].includes(resource);
  if (role === 'SALES') return ['clients', 'leads'].includes(resource);
  return role === 'EMPLOYEE' && action === 'update' && ['tasks', 'tickets'].includes(resource);
}
export const roleLabels: Record<RoleKey, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  TEAM_LEAD: 'Team Lead',
  SALES: 'Sales Representative',
  EMPLOYEE: 'Employee',
};
