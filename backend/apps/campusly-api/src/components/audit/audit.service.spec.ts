import { Prisma } from '../../../../../generated/prisma/client';
import { toAuditJson } from './audit.service';

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
