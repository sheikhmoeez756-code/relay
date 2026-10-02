import { HttpError } from './security';

/** Public demo mode: one-click role sign-in and protected shared accounts. Set DEMO_MODE=true. */
export const demoMode = () => process.env.DEMO_MODE === 'true';

export const demoAccounts = {
  admin: 'admin@example.com',
  manager: 'manager@example.com',
  sales: 'sales@example.com',
  employee: 'employee@example.com',
} as const;
export type DemoRole = keyof typeof demoAccounts;

/** Blocks changes that would break the shared demo accounts for the next visitor. */
export function assertNotDemo(user: { company: { isDemo: boolean } }) {
  if (demoMode() && user.company.isDemo)
    throw new HttpError(403, 'This action is disabled in the public demo.');
}
