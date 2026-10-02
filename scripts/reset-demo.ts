// Empties a demo-only database so `prisma/seed.ts` can recreate fresh demo data.
// Run with `npm run db:reset-demo`. Refuses to touch a database holding any real company.
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  if (process.env.DEMO_MODE !== 'true') throw new Error('Demo reset requires DEMO_MODE=true.');
  const realCompanies = await db.company.count({ where: { isDemo: false } });
  if (realCompanies > 0)
    throw new Error(`Refusing to reset: ${realCompanies} non-demo company record(s) exist.`);

  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (!tables.length) return console.log('No tables to reset.');
  const list = tables.map((t) => `"${t.tablename.replace(/"/g, '""')}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  console.log(`Demo reset: emptied ${tables.length} tables.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
