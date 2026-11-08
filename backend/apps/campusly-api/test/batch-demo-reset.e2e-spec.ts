import { ConfigService } from '@nestjs/config';
import { schoolDate } from '../../../prisma/seed/clock';
import { BatchCron } from '../../campusly-batch/src/batch.cron';
import { TutorIndexService } from '../src/components/tutor/tutor-index.service';
import { CampuslyBatchService } from '../../campusly-batch/src/campusly-batch.service';
import type { Env } from '../src/libs/config';

// No DB needed: it lives with the e2e tests because @nestjs/schedule is ESM-only
// (the e2e Jest config loads ES modules, the unit config does not).

describe('demo "today" (the school date in Tashkent)', () => {
  it.each([
    ['2026-11-08T18:00:00Z', '2026-11-08'], // Sunday 23:00 in Tashkent
    ['2026-11-08T19:30:00Z', '2026-11-09'], // already Monday 00:30 in Tashkent
    ['2026-11-08T22:00:00Z', '2026-11-09'], // 03:00 Tashkent: the nightly reset
  ])('%s → %s', (now, day) => {
    expect(schoolDate(new Date(now))).toBe(day);
  });
});

describe('BatchCron.resetDemo', () => {
  const setup = (demoMode: boolean, reset: () => Promise<unknown>) => {
    const batchService = { resetDemo: jest.fn(reset) };
    const config = { get: () => demoMode };
    const cron = new BatchCron(
      batchService as unknown as CampuslyBatchService,
      { isEnabled: false } as TutorIndexService,
      config as unknown as ConfigService<Env, true>,
    );
    return { cron, batchService };
  };

  it('never touches the data when DEMO_MODE is off (a real school server)', async () => {
    const { cron, batchService } = setup(false, () => Promise.resolve());
    await cron.resetDemo();
    expect(batchService.resetDemo).not.toHaveBeenCalled();
  });

  it('restores the demo data when DEMO_MODE is on', async () => {
    const { cron, batchService } = setup(true, () =>
      Promise.resolve({ today: '2026-11-09', courses: 19 }),
    );
    await cron.resetDemo();
    expect(batchService.resetDemo).toHaveBeenCalledTimes(1);
  });

  it('logs a failed reset instead of crashing the worker', async () => {
    const { cron } = setup(true, () => Promise.reject(new Error('DB down')));
    await expect(cron.resetDemo()).resolves.toBeUndefined();
  });
});
