import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AuditService } from '../src/components/audit/audit.service';
import { PrismaService } from '../src/database/prisma.service';
import { validateEnv } from '../src/libs/config';
import { AuditAction } from '../src/libs/enums/audit.enum';

// Needs the Docker Postgres. Creates its own user (prefix "e2e-audit") and removes it afterwards.
const LOGIN_ID = 'e2e-audit';
class Rollback extends Error {}

describe('AuditService (e2e)', () => {
  let prisma: PrismaService;
  let audit: AuditService;

  async function cleanUp() {
    const user = await prisma.user.findUnique({ where: { loginId: LOGIN_ID } });
    if (!user) return;
    await prisma.auditLog.deleteMany({ where: { entityId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  /** Blocks the test user and writes the audit row in the same transaction */
  const blockWithAudit = (fail: boolean) =>
    prisma.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({
        where: { loginId: LOGIN_ID },
        omit: { passwordHash: false },
      });
      const after = await tx.user.update({
        where: { id: before.id },
        data: { status: 'BLOCKED' },
      });
      await audit.log(tx, {
        actor: null,
        action: AuditAction.USER_BLOCK,
        entityType: 'User',
        entityId: before.id,
        before,
        after,
      });
      if (fail) throw new Rollback();
      return before.id;
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ validate: validateEnv })],
      providers: [PrismaService, AuditService],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    audit = moduleRef.get(AuditService);
    await cleanUp();
    await prisma.user.create({
      data: {
        loginId: LOGIN_ID,
        role: 'STUDENT',
        passwordHash: 'hash',
        firstName: 'E2e',
        lastName: 'Audit',
      },
    });
  });

  afterAll(async () => {
    await cleanUp();
    await prisma.$disconnect();
  });

  it('a failed change leaves neither the change nor an audit row', async () => {
    await expect(blockWithAudit(true)).rejects.toBeInstanceOf(Rollback);

    const user = await prisma.user.findUniqueOrThrow({
      where: { loginId: LOGIN_ID },
    });
    expect(user.status).toBe('ACTIVE');
    expect(await prisma.auditLog.count({ where: { entityId: user.id } })).toBe(
      0,
    );
  });

  it('a saved change has exactly one audit row, without the password hash', async () => {
    const userId = await blockWithAudit(false);

    const rows = await prisma.auditLog.findMany({
      where: { entityId: userId },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'user.block',
      entityType: 'User',
      before: { status: 'ACTIVE', passwordHash: '***' },
      after: { status: 'BLOCKED' },
    });
  });
});
