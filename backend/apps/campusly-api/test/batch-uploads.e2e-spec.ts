import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { CampuslyBatchService } from '../../campusly-batch/src/campusly-batch.service';
import { StorageService } from '../src/components/media/storage.service';
import { PrismaService } from '../src/database/prisma.service';
import { validateEnv } from '../src/libs/config';

// Needs the Docker Postgres, not AWS (fake storage). The batch job is called directly:
// the cron schedule itself is @nestjs/schedule's job, not ours.
const TAG = 'E2E Batch';
const HOUR = 3_600_000;

describe('Batch: stale uploads → FAILED (e2e)', () => {
  let prisma: PrismaService;
  let batch: CampuslyBatchService;
  const deleted: string[] = [];
  const fakeStorage = {
    isEnabled: true,
    delete: (key: string) => {
      deleted.push(key);
      return Promise.resolve();
    },
  };
  let ownerId: string;

  const asset = async (
    name: string,
    status: 'UPLOADING' | 'READY',
    hoursAgo: number,
  ) =>
    (
      await prisma.mediaAsset.create({
        data: {
          ownerId,
          kind: 'VIDEO',
          originalName: name,
          mimeType: 'video/mp4',
          size: 1n,
          status,
          s3Key: `raw/e2e-batch/${name}-${Date.now()}.mp4`,
          createdAt: new Date(Date.now() - hoursAgo * HOUR),
        },
      })
    ).id;

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.mediaAsset.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ validate: validateEnv })],
      providers: [
        PrismaService,
        CampuslyBatchService,
        { provide: StorageService, useValue: fakeStorage },
      ],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    batch = moduleRef.get(CampuslyBatchService);
    await cleanUp();
    ownerId = (
      await prisma.user.create({
        data: {
          loginId: 'e2e-batch-teacher',
          role: 'TEACHER',
          passwordHash: 'x',
          firstName: 'Batch',
          lastName: TAG,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await cleanUp();
    await prisma.$disconnect();
  });

  it('only uploads stuck in UPLOADING for 24 h fail; their files are deleted', async () => {
    const stale = await asset('stale', 'UPLOADING', 25);
    const fresh = await asset('fresh', 'UPLOADING', 2);
    const oldReady = await asset('old-ready', 'READY', 100);

    expect(await batch.failStaleUploads()).toBeGreaterThanOrEqual(1);

    const status = async (id: string) =>
      (await prisma.mediaAsset.findUniqueOrThrow({ where: { id } })).status;
    expect(await status(stale)).toBe('FAILED');
    expect(await status(fresh)).toBe('UPLOADING');
    expect(await status(oldReady)).toBe('READY');
    expect(deleted.some((k) => k.includes('/stale-'))).toBe(true);
    expect(deleted.some((k) => k.includes('/fresh-'))).toBe(false);

    // Running again changes nothing (safe if two runs overlap)
    deleted.length = 0;
    await batch.failStaleUploads();
    expect(deleted.some((k) => k.includes('/stale-'))).toBe(false);
  });
});
