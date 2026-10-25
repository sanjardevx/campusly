import { ConfigService } from '@nestjs/config';
import { weekShiftMs } from '../../../prisma/demo-seed';
import { BatchCron } from '../../campusly-batch/src/batch.cron';
import { CampuslyBatchService } from '../../campusly-batch/src/campusly-batch.service';
import type { Env } from '../src/libs/config';

// No DB needed: it lives with the e2e tests because @nestjs/schedule is ESM-only
// (the e2e Jest config loads ES modules, the unit config does not).

const WEEK = 7 * 24 * 60 * 60 * 1000;

describe('demo week shift', () => {
  it.each([
    ['2026-10-17T00:00:00Z', 0], // the story's own "today" (Saturday)
    ['2026-10-23T18:00:00Z', 0], // Friday 23:00 in Tashkent: still the same week
    ['2026-10-23T19:30:00Z', 1], // already Saturday 00:30 in Tashkent
    ['2026-10-25T22:00:00Z', 1], // 03:00 Tashkent on Monday the 26th
    ['2026-11-20T21:30:00Z', 5],
    ['2026-09-01T00:00:00Z', 0], // before the story: never moves back
  ])('%s → +%i weeks', (now, weeks) => {
    expect(weekShiftMs(new Date(now))).toBe(weeks * WEEK);
  });
});

describe('BatchCron.resetDemo', () => {
  const setup = (demoMode: boolean, reset: () => Promise<unknown>) => {
    const batchService = { resetDemo: jest.fn(reset) };
    const config = { get: () => demoMode };
    const cron = new BatchCron(
      batchService as unknown as CampuslyBatchService,
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
      Promise.resolve({ shiftedWeeks: 1 }),
    );
    await cron.resetDemo();
    expect(batchService.resetDemo).toHaveBeenCalledTimes(1);
  });

  it('logs a failed reset instead of crashing the worker', async () => {
    const { cron } = setup(true, () => Promise.reject(new Error('DB down')));
    await expect(cron.resetDemo()).resolves.toBeUndefined();
  });
});
