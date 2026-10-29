// Run: pnpm tsx prisma/add-programs.ts — adds the seed's Programs & clubs (prisma/demo-site.ts) that
// the database does not have yet, matched by the English name, at the end of the site order.
// For prod, which is never seeded again: it changes and deletes nothing, and a program the admin
// archived is not brought back. Running it twice adds nothing the second time.
import 'dotenv/config';
import { createSeedClient } from './demo-seed';
import { SITE_PROGRAMS, programData } from './demo-site';

async function main() {
  const prisma = createSeedClient(process.env.DATABASE_URL ?? '');
  try {
    const existing = await prisma.siteProgram.findMany({
      select: { name: true, order: true },
    });
    const names = new Set(
      existing.map((p) => (p.name as { en?: string } | null)?.en),
    );
    const missing = SITE_PROGRAMS.filter((p) => !names.has(p.name.en));
    if (!missing.length) {
      console.log('Nothing to add: every program is already there');
      return;
    }

    const team = await prisma.sitePerson.findMany({
      where: { archivedAt: null },
      select: { id: true, lastName: true },
    });
    const teamIds = new Map(team.map((m) => [m.lastName, m.id]));
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    const last = Math.max(0, ...existing.map((p) => p.order));
    await prisma.siteProgram.createMany({
      data: missing.map((p, i) =>
        programData(p, last + i + 1, teamIds, admin?.id ?? null),
      ),
    });
    console.log(`Added: ${missing.map((p) => p.name.en).join(', ')}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
