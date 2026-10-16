import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { validateEnv } from '../src/libs/config';

class Rollback extends Error {}

// Needs the Docker Postgres. Everything runs inside a transaction that is rolled back.
describe('PrismaService global omit (e2e)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ validate: validateEnv })],
      providers: [PrismaService],
    }).compile();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('never returns passwordHash unless it is asked for explicitly', async () => {
    const check = prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          loginId: 'omit-test',
          role: 'STUDENT',
          passwordHash: 'hash-value',
          tempPasswordUsesLeft: 3,
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const normal = await tx.user.findUniqueOrThrow({
        where: { loginId: 'omit-test' },
      });
      expect(normal).not.toHaveProperty('passwordHash');
      expect(normal).not.toHaveProperty('tempPasswordUsesLeft');
      expect(normal.loginId).toBe('omit-test');

      // Login asks for the hash on purpose
      const forLogin = await tx.user.findUniqueOrThrow({
        where: { loginId: 'omit-test' },
        omit: { passwordHash: false },
      });
      expect(forLogin.passwordHash).toBe('hash-value');

      throw new Rollback();
    });

    await expect(check).rejects.toBeInstanceOf(Rollback);

    // Compile-time check on the normal client: `pnpm typecheck` fails if the omit typing breaks.
    // (Inside $transaction the `tx` type loses the omit info — a Prisma limitation; runtime is still safe.)
    const users = await prisma.user.findMany({ take: 1 });
    // @ts-expect-error passwordHash is not part of the result type
    void users[0]?.passwordHash;
    expect(await prisma.user.count({ where: { loginId: 'omit-test' } })).toBe(
      0,
    );
  });
});
