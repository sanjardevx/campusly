import {
  fromDbDate,
  isValidTimeZone,
  nextDay,
  startOfDayInZone,
  toDbDate,
  todayInZone,
  weekDays,
} from './date';

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

describe('days in the school timezone', () => {
  it('a Tashkent day starts at 19:00 UTC the day before (UTC+5)', () => {
    expect(startOfDayInZone('2026-09-02', 'Asia/Tashkent').toISOString()).toBe(
      '2026-09-01T19:00:00.000Z',
    );
  });

  it('a quarter ending on 31 October ends at 1 November 00:00 Tashkent', () => {
    const end = startOfDayInZone(nextDay('2026-10-31'), 'Asia/Tashkent');
    expect(end.toISOString()).toBe('2026-10-31T19:00:00.000Z');
    // Due 31 Oct 23:59 in Tashkent → inside; due 1 Nov 03:00 in Tashkent → outside
    expect(new Date('2026-10-31T18:59:00Z') < end).toBe(true);
    expect(new Date('2026-10-31T22:00:00Z') < end).toBe(false);
  });

  it('handles a timezone with daylight saving time', () => {
    // Berlin: summer UTC+2, winter UTC+1
    expect(startOfDayInZone('2026-07-01', 'Europe/Berlin').toISOString()).toBe(
      '2026-06-30T22:00:00.000Z',
    );
    expect(startOfDayInZone('2026-12-01', 'Europe/Berlin').toISOString()).toBe(
      '2026-11-30T23:00:00.000Z',
    );
  });

  it('nextDay crosses months and years', () => {
    expect(nextDay('2026-10-31')).toBe('2026-11-01');
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
  });
});

describe('todayInZone', () => {
  it('is already tomorrow in Tashkent when it is 20:00 UTC', () => {
    const now = new Date('2026-10-21T20:00:00Z');
    expect(todayInZone('Asia/Tashkent', now)).toBe('2026-10-22');
    expect(todayInZone('UTC', now)).toBe('2026-10-21');
  });
});

describe('weekDays (admin dashboard)', () => {
  const WEEK = [
    '2026-10-19',
    '2026-10-20',
    '2026-10-21',
    '2026-10-22',
    '2026-10-23',
  ];

  it('Monday to Friday of the same week, from any school day', () => {
    expect(weekDays('2026-10-19')).toEqual(WEEK);
    expect(weekDays('2026-10-23')).toEqual(WEEK);
  });

  it('Saturday and Sunday show the week that just ended', () => {
    expect(weekDays('2026-10-24')).toEqual(WEEK);
    expect(weekDays('2026-10-25')).toEqual(WEEK);
  });

  it('crosses a month end', () => {
    expect(weekDays('2026-10-30')).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
    ]);
    expect(weekDays('2026-11-02')[0]).toBe('2026-11-02');
  });
});
