import './env';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { db } from './db';
import { can } from './permissions';
import { ZodError } from 'zod';
import { rateLimit } from './rate-limit';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function currentUser() {
  const session = await getServerSession(authOptions);
  const identity = session?.user as { id?: string; sessionVersion?: number } | undefined;
  if (!identity?.id) throw new HttpError(401, 'Your session has expired. Please sign in.');
  const user = await db.user.findUnique({
    where: { id: identity.id },
    include: { company: true, department: true },
  });
  if (!user || !user.active || user.deletedAt || user.sessionVersion !== identity.sessionVersion)
    throw new HttpError(401, 'Your session has expired. Please sign in.');
  return user;
}
export type Actor = Awaited<ReturnType<typeof currentUser>>;
export async function authorize(resource: string, action = 'read') {
  const user = await currentUser();
  if (!can(user.role, resource, action))
    throw new HttpError(403, 'You do not have permission for this action.');
  if (action !== 'read' && !(await rateLimit('write:' + user.id, 120, 60000)))
    throw new HttpError(429, 'Too many changes. Please wait a minute.');
  return user;
}
export function checkOrigin(request: Request) {
  const expected = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000').origin;
  if (request.headers.get('origin') !== expected)
    throw new HttpError(403, 'Request origin is not allowed.');
}
export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return Response.json(
      { error: e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 422 },
    );
  console.error('Request failed', e);
  return Response.json(
    { error: 'Unable to complete this request. Please try again.' },
    { status: 500 },
  );
}
export function publicUser(u: Actor) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    companyId: u.companyId,
    company: u.company,
    department: u.department,
    preferences: u.preferences,
    mustChangePassword: u.mustChangePassword,
  };
}
