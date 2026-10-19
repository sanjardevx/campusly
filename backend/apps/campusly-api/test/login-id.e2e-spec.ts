import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoginIdService } from '../src/components/user/login-id.service';
import { PrismaService } from '../src/database/prisma.service';
import { validateEnv } from '../src/libs/config';

// Needs the Docker Postgres. Uses the year 2099 so the real counters (2026) are not touched.
const TEST_YEAR = new Date(Date.UTC(2099, 5, 1));
class Rollback extends Error {}

describe('LoginIdService (e2e)', () => {
  let prisma: PrismaService;
  let loginIds: LoginIdService;

  const cleanUp = () => prisma.idCounter.deleteMany({ where: { year: 2099 } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ validate: validateEnv })],
      providers: [PrismaService, LoginIdService],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    loginIds = moduleRef.get(LoginIdService);
    await cleanUp();
  });

  afterAll(async () => {
    await cleanUp();
    await prisma.$disconnect();
  });

  it('formats YY + role digit + 5-digit sequence', async () => {
    expect(await loginIds.next('STUDENT', prisma, TEST_YEAR)).toBe('99100001');
    expect(await loginIds.next('TEACHER', prisma, TEST_YEAR)).toBe('99200001');
    await cleanUp();
  });

  it('30 parallel calls (each in its own transaction) get 30 different, consecutive IDs', async () => {
    const ids = await Promise.all(
      Array.from({ length: 30 }, () =>
        prisma.$transaction((tx) => loginIds.next('STUDENT', tx, TEST_YEAR)),
      ),
    );

    expect(new Set(ids).size).toBe(30);
    const numbers = ids.map((id) => Number(id.slice(3))).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('a rolled-back transaction gives its number back (no gaps)', async () => {
    const before = await loginIds.next('STUDENT', prisma, TEST_YEAR); // 99100031

    await expect(
      prisma.$transaction(async (tx) => {
        await loginIds.next('STUDENT', tx, TEST_YEAR); // would be 99100032
        throw new Rollback(); // e.g. creating the user failed
      }),
    ).rejects.toBeInstanceOf(Rollback);

    const after = await loginIds.next('STUDENT', prisma, TEST_YEAR);
    expect(Number(after) - Number(before)).toBe(1); // 99100032 again
  });
});
