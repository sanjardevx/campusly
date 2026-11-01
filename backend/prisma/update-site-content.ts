// Run: pnpm tsx prisma/update-site-content.ts — brings a database that is never seeded again (prod)
// up to the seed's site content, without touching anything else:
// - adds the seed's Programs & clubs it does not have yet (matched by the English name, at the end
//   of the site order; a program the admin archived is not brought back);
// - moves IELTS and SAT off the news photos they borrowed, only while they still point at them;
// - makes every honor medal gold and puts the seed's student on each honor photo (with their class
//   now). Run it right after the deploy: a silver or bronze the admin sets later would turn gold
//   if this ran again.
// It deletes nothing.
import 'dotenv/config';
import { createSeedClient } from './demo-seed';
import { HONOR_STUDENTS, SITE_PROGRAMS, programData } from './demo-site';

/** The news photos IELTS and SAT used before they had their own */
const BORROWED_PHOTOS = [
  { from: '/site/news-ielts.jpg', to: '/site/program-ielts.jpg' },
  { from: '/site/news-olympiad.jpg', to: '/site/program-sat.jpg' },
];

async function main() {
  const prisma = createSeedClient(process.env.DATABASE_URL ?? '');
  try {
    for (const { from, to } of BORROWED_PHOTOS) {
      const { count } = await prisma.siteProgram.updateMany({
        where: { photoPath: from },
        data: { photoPath: to },
      });
      if (count) console.log(`Photo: ${from} → ${to}`);
    }

    const medals = await prisma.siteHonorStudent.updateMany({
      where: { resultType: 'MEDAL', place: { gt: 1 } },
      data: { place: 1 },
    });
    if (medals.count) console.log(`Medals made gold: ${medals.count}`);

    for (const [key, loginId] of Object.entries(HONOR_STUDENTS)) {
      const student = await prisma.user.findUnique({
        where: { loginId },
        select: {
          id: true,
          groupMemberships: {
            where: { leftAt: null },
            select: { group: { select: { name: true } } },
          },
        },
      });
      if (!student) continue;
      const className = student.groupMemberships[0]?.group.name ?? null;
      const { count } = await prisma.siteHonorStudent.updateMany({
        where: {
          photoPath: `/site/honor-${key}.jpg`,
          NOT: { studentId: student.id },
        },
        data: { studentId: student.id, className },
      });
      if (count) console.log(`Honor ${key}: ${loginId}, ${className}`);
    }

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
