import { db } from './db';
import { createHash } from 'node:crypto';
export async function rateLimit(key: string, limit = 10, windowMs = 900000) {
  const hash = createHash('sha256').update(key).digest('hex');
  const now = new Date();
  const expires = new Date(Date.now() + windowMs);
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" ("key","count","expiresAt") VALUES (${hash},1,${expires}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."expiresAt" < ${now} THEN 1 ELSE "RateLimit"."count"+1 END, "expiresAt"=CASE WHEN "RateLimit"."expiresAt" < ${now} THEN ${expires} ELSE "RateLimit"."expiresAt" END RETURNING "count"`;
  return rows[0].count <= limit;
}
const keyHash = (key: string) => createHash('sha256').update(key).digest('hex');
/** Checks a counter without incrementing it. */
export async function isLimited(key: string, limit: number) {
  const row = await db.rateLimit.findUnique({ where: { key: keyHash(key) } });
  return !!row && row.expiresAt > new Date() && row.count >= limit;
}
export async function clearLimit(key: string) {
  await db.rateLimit.deleteMany({ where: { key: keyHash(key) } });
}
