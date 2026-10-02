import { z } from 'zod';
import { hash, compare } from 'bcrypt';
import { db } from '@/lib/db';
import { checkOrigin, currentUser, errorResponse, HttpError } from '@/lib/security';
import { password } from '@/lib/validation';
import { sendToken, tokenHash } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';
import { assertNotDemo } from '@/lib/demo';
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('forgot'),
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
  }),
  z.object({ action: z.literal('reset'), token: z.string().regex(/^[a-f0-9]{64}$/), password }),
  z.object({ action: z.literal('verify'), token: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({
    action: z.literal('register'),
    token: z.string().regex(/^[a-f0-9]{64}$/),
    name: z.string().min(2).max(120),
    password,
  }),
  z.object({
    action: z.literal('invite'),
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    role: z.enum(['ADMIN', 'MANAGER', 'TEAM_LEAD', 'SALES', 'EMPLOYEE']),
    departmentId: z.string().cuid().optional(),
  }),
  z.object({ action: z.literal('password'), currentPassword: z.string().max(72), password }),
]);
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const data = schema.parse(await req.json());
    if (data.action === 'forgot') {
      if (!(await rateLimit('reset:' + data.email, 4)))
        throw new HttpError(429, 'Please wait before requesting another email.');
      const user = await db.user.findUnique({ where: { email: data.email } });
      // Send in the background so response time and mail failures don't reveal which emails exist.
      if (user?.active && !user.deletedAt)
        void sendToken(data.email, 'reset').catch((e) => console.error('Reset email failed', e));
      return Response.json({
        message: 'If an eligible account exists, a reset link has been sent.',
      });
    }
    if (data.action === 'invite') {
      const user = await currentUser();
      assertNotDemo(user);
      if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role))
        throw new HttpError(403, 'Only administrators can invite users.');
      if (data.role === 'ADMIN' && user.role !== 'SUPER_ADMIN')
        throw new HttpError(403, 'Only the super administrator can invite administrators.');
      if (!(await rateLimit('invite:' + user.id, 20)))
        throw new HttpError(429, 'Invitation limit reached.');
      if (
        data.departmentId &&
        !(await db.department.findFirst({
          where: { id: data.departmentId, companyId: user.companyId },
        }))
      )
        throw new HttpError(422, 'Invalid department');
      if (await db.user.findUnique({ where: { email: data.email } }))
        throw new HttpError(409, 'This email address cannot be invited.');
      await sendToken(data.email, 'invite', {
        companyId: user.companyId,
        role: data.role,
        departmentId: data.departmentId || '',
      });
      await db.auditLog.create({
        data: {
          companyId: user.companyId,
          actorId: user.id,
          action: 'INVITE',
          target: 'user',
          targetId: data.email,
        },
      });
      return Response.json({ message: 'Invitation sent.' });
    }
    if (data.action === 'password') {
      const user = await currentUser();
      assertNotDemo(user);
      if (!(await rateLimit('password:' + user.id, 5)))
        throw new HttpError(429, 'Too many attempts.');
      if (!(await compare(data.currentPassword, user.passwordHash)))
        throw new HttpError(422, 'Current password is incorrect.');
      const passwordHash = await hash(data.password, 12);
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
        }),
        db.auditLog.create({
          data: {
            companyId: user.companyId,
            actorId: user.id,
            action: 'PASSWORD_CHANGE',
            target: 'user',
            targetId: user.id,
          },
        }),
      ]);
      return Response.json({ message: 'Password updated. Sign in again with your new password.' });
    }
    if (!(await rateLimit('token:' + tokenHash(data.token), 6)))
      throw new HttpError(429, 'Too many attempts.');
    const purpose = data.action === 'register' ? 'invite' : data.action;
    const passwordHash = 'password' in data ? await hash(data.password, 12) : undefined;
    await db.$transaction(async (tx) => {
      const token = await tx.verificationToken.findUnique({
        where: { token: tokenHash(data.token) },
      });
      if (!token || token.expires < new Date() || token.purpose !== purpose)
        throw new HttpError(422, 'This link is invalid or expired.');
      const consumed = await tx.verificationToken.deleteMany({
        where: { token: token.token, expires: { gt: new Date() } },
      });
      if (consumed.count !== 1) throw new HttpError(422, 'This link has already been used.');
      if (data.action === 'register') {
        const meta = token.metadata as Record<string, string>;
        if (await tx.user.findUnique({ where: { email: token.identifier } }))
          throw new HttpError(
            409,
            'An account for this invitation already exists. Please sign in.',
          );
        const newUser = await tx.user.create({
          data: {
            name: data.name,
            email: token.identifier,
            passwordHash: passwordHash!,
            companyId: meta.companyId,
            role: meta.role as any,
            departmentId: meta.departmentId || null,
            emailVerified: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            companyId: newUser.companyId,
            actorId: newUser.id,
            action: 'REGISTER',
            target: 'user',
            targetId: newUser.id,
          },
        });
      } else {
        const user = await tx.user.findUnique({ where: { email: token.identifier } });
        if (!user || !user.active || user.deletedAt)
          throw new HttpError(422, 'Account is unavailable.');
        if (data.action === 'reset')
          await tx.verificationToken.deleteMany({
            where: { identifier: token.identifier, purpose: 'reset' },
          });
        await tx.user.update({
          where: { id: user.id },
          data:
            data.action === 'reset'
              ? { passwordHash, sessionVersion: { increment: 1 }, mustChangePassword: false }
              : { emailVerified: new Date() },
        });
        await tx.auditLog.create({
          data: {
            companyId: user.companyId,
            actorId: user.id,
            action: data.action === 'reset' ? 'PASSWORD_RESET' : 'EMAIL_VERIFIED',
            target: 'user',
            targetId: user.id,
          },
        });
      }
    });
    return Response.json({
      message:
        data.action === 'reset'
          ? 'Password reset. You can now sign in.'
          : 'Email confirmed. You can now sign in.',
    });
  } catch (e) {
    return errorResponse(e);
  }
}
