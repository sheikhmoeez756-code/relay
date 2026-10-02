import { createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { db } from './db';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export async function sendToken(
  email: string,
  purpose: 'reset' | 'verify' | 'invite',
  metadata: Record<string, string> = {},
) {
  if (!process.env.SMTP_HOST)
    throw new Error(
      'Email delivery is not configured. Set SMTP_HOST before using account email flows.',
    );
  const raw = randomBytes(32).toString('hex');
  const token = await db.verificationToken.create({
    data: {
      identifier: email,
      token: tokenHash(raw),
      purpose,
      metadata,
      expires: new Date(Date.now() + 3600000),
    },
  });
  const route =
    purpose === 'reset' ? 'reset-password' : purpose === 'invite' ? 'register' : 'verify-email';
  const url = `${process.env.NEXTAUTH_URL}/${route}?token=${raw}`;
  try {
    await nodemailer
      .createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 1025),
        secure: process.env.SMTP_SECURE === 'true',
        ...(process.env.SMTP_USER
          ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
          : {}),
      })
      .sendMail({
        from: process.env.MAIL_FROM || 'Relay <noreply@localhost>',
        to: email,
        subject: `Relay: ${purpose === 'reset' ? 'reset your password' : purpose === 'invite' ? 'your workspace invitation' : 'verify your email'}`,
        text: `Open this single-use link within one hour:\n${url}\n\nIf you did not request this, ignore this email.`,
      });
  } catch (error) {
    await db.verificationToken.delete({ where: { token: token.token } });
    throw error;
  }
}
