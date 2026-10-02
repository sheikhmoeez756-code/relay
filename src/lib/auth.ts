import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import { db } from './db';
import { loginSchema } from './validation';
import { rateLimit, isLimited, clearLimit } from './rate-limit';
import { demoAccounts, demoMode, type DemoRole } from './demo';

const LOCKOUT = 'Too many attempts. Try again in 15 minutes.';
// The last x-forwarded-for entry is appended by the hosting proxy; earlier entries are client-controlled.
function clientIp(headers: Record<string, unknown> | undefined) {
  const forwarded = String(headers?.['x-forwarded-for'] ?? '')
    .split(',')
    .pop()
    ?.trim();
  return forwarded || 'direct';
}
async function signedIn(user: {
  id: string;
  companyId: string;
  email: string;
  name: string;
  sessionVersion: number;
}) {
  await db.auditLog.create({
    data: {
      companyId: user.companyId,
      actorId: user.id,
      action: 'SIGN_IN',
      target: 'user',
      targetId: user.id,
    },
  });
  return { id: user.id, email: user.email, name: user.name, sessionVersion: user.sessionVersion };
}
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        // Per-IP cap on all attempts, plus a per-account cap on failures only.
        if (!(await rateLimit('login-ip:' + clientIp(req?.headers), 60))) throw new Error(LOCKOUT);
        if (await isLimited('login-fail:' + email, 8)) throw new Error(LOCKOUT);
        const user = await db.user.findUnique({ where: { email } });
        const dummy = '$2b$12$6KAK3nDwL7HdNRhkxpQLOOgDJKXtsWSbD31LcZxQRHyzsrR9LwiiK';
        const valid = await compare(password, user?.passwordHash || dummy);
        if (!user || !valid || !user.active || user.deletedAt || !user.emailVerified) {
          await rateLimit('login-fail:' + email, 8);
          return null;
        }
        await clearLimit('login-fail:' + email);
        return signedIn(user);
      },
    }),
    // One-click sign-in to seeded demo accounts; disabled unless DEMO_MODE=true.
    CredentialsProvider({
      id: 'demo',
      name: 'Demo account',
      credentials: { role: { label: 'Role', type: 'text' } },
      async authorize(credentials, req) {
        if (!demoMode()) return null;
        const role = credentials?.role as DemoRole;
        if (!Object.hasOwn(demoAccounts, role)) return null;
        if (!(await rateLimit('login-ip:' + clientIp(req?.headers), 60))) throw new Error(LOCKOUT);
        const user = await db.user.findUnique({
          where: { email: demoAccounts[role] },
          include: { company: true },
        });
        if (!user?.company.isDemo || !user.active || user.deletedAt) return null;
        return signedIn(user);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.sessionVersion = (user as unknown as { sessionVersion: number }).sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { id: string; sessionVersion: number }).id = String(
          token.userId,
        );
        (session.user as unknown as { sessionVersion: number }).sessionVersion = Number(
          token.sessionVersion,
        );
      }
      return session;
    },
  },
};
