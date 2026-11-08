// Run: pnpm prisma db seed — WIPES all tables, then writes the demo data (prisma/demo-seed.ts).
// The story is written up to the real "today" (Tashkent), like the batch's nightly reset.
import 'dotenv/config';
import { countRows, createSeedClient, seedDemo } from './demo-seed';

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const password = process.env.SEED_PASSWORD ?? '';
  if (password.length < 8) {
    throw new Error(
      'Set SEED_PASSWORD (at least 8 characters) in backend/.env before seeding.',
    );
  }

  // Refuses to wipe a non-local DB by accident
  const { hostname } = new URL(databaseUrl);
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  if (!isLocal && process.env.SEED_ALLOW_RESET !== 'true') {
    throw new Error(
      `Refusing to wipe the database at ${hostname}. Set SEED_ALLOW_RESET=true if this is really the demo DB.`,
    );
  }

  const prisma = createSeedClient(databaseUrl);
  try {
    console.time('seed');
    await seedDemo(prisma, {
      password,
      demoMode: process.env.DEMO_MODE === 'true',
    });
    console.table(await countRows(prisma));
    console.log('Every account uses the SEED_PASSWORD from backend/.env');
    console.timeEnd('seed');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
