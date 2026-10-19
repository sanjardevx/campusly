import { redact } from './Logging.interceptor';

describe('redact', () => {
  it('hides secret-looking keys at any depth', () => {
    const input = {
      input: { loginId: '26100042', password: 'Rus6738#' },
      refreshToken: 'abc',
      list: [{ newPassword: 'x', name: 'Aziz' }],
    };

    expect(redact(input)).toEqual({
      input: { loginId: '26100042', password: '***' },
      refreshToken: '***',
      list: [{ newPassword: '***', name: 'Aziz' }],
    });
  });

  it('keeps Dates and other class instances as they are', () => {
    const createdAt = new Date('2026-10-19T10:00:00Z');
    expect(redact({ createdAt, password: 'x' })).toEqual({
      createdAt,
      password: '***',
    });
  });

  it('keeps plain values unchanged', () => {
    expect(redact('hello')).toBe('hello');
    expect(redact(null)).toBe(null);
  });
});
