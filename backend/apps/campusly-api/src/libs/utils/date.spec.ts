import { fromDbDate, isValidTimeZone, toDbDate } from './date';

describe('calendar dates', () => {
  it('round-trips "YYYY-MM-DD" through a UTC-midnight Date', () => {
    const date = toDbDate('2026-11-09');
    expect(date.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(fromDbDate(date)).toBe('2026-11-09');
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-10'])(
    'rejects the impossible date %s',
    (value) => {
      expect(() => toDbDate(value)).toThrow('is not a valid date');
    },
  );

  it('accepts real IANA timezones only', () => {
    expect(isValidTimeZone('Asia/Tashkent')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
