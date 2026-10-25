import { Prisma } from '../../../../../generated/prisma/client';
import { auditChanges, auditTarget, toAuditJson } from './audit.service';

describe('toAuditJson', () => {
  it('hides secrets, keeps readable values', () => {
    expect(
      toAuditJson({
        loginId: '26100042',
        passwordHash: '$2b$10$abc',
        status: 'BLOCKED',
        updatedAt: new Date('2026-10-19T10:00:00.000Z'),
        size: 3_000_000_000n, // BigInt (MediaAsset.size)
        score: new Prisma.Decimal('18.50'),
        nested: { refreshToken: 'abc', name: 'Aziz' },
      }),
    ).toEqual({
      loginId: '26100042',
      passwordHash: '***',
      status: 'BLOCKED',
      updatedAt: '2026-10-19T10:00:00.000Z',
      size: '3000000000',
      score: '18.5',
      nested: { refreshToken: '***', name: 'Aziz' },
    });
  });

  it('stores nothing for a missing before/after', () => {
    expect(toAuditJson(undefined)).toBeUndefined();
    expect(toAuditJson(null)).toBeUndefined();
  });
});

describe('auditChanges', () => {
  it('lists only the fields that changed, without bookkeeping columns', () => {
    expect(
      auditChanges(
        { id: 'u1', status: 'ACTIVE', firstName: 'Aziz', updatedAt: '1' },
        { id: 'u1', status: 'BLOCKED', firstName: 'Aziz', updatedAt: '2' },
      ),
    ).toEqual([{ field: 'status', before: 'ACTIVE', after: 'BLOCKED' }]);
  });

  it('a create shows what was set; arrays and long values become short text', () => {
    const changes = auditChanges(undefined, {
      name: '9A',
      teacherIds: ['t1', 't2'],
      note: 'x'.repeat(500),
    });
    expect(changes[0]).toEqual({ field: 'name', before: null, after: '9A' });
    expect(changes[1].after).toBe('["t1","t2"]');
    expect(changes[2].after).toHaveLength(200);
  });

  it('nothing stored → no changes', () => {
    expect(auditChanges(null, null)).toEqual([]);
  });
});

describe('auditTarget', () => {
  it('names a person, a course or a class from its snapshot', () => {
    expect(auditTarget({ firstName: 'Aziz', lastName: 'Karimov' })).toBe(
      'Aziz Karimov',
    );
    expect(auditTarget({ title: 'Algebra · 9A' })).toBe('Algebra · 9A');
    expect(auditTarget({ name: '9A' })).toBe('9A');
    expect(auditTarget({ report: 'GRADES' })).toBeNull();
    expect(auditTarget(null)).toBeNull();
  });
});
