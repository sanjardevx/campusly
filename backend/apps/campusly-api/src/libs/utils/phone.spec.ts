import { normalizeUzPhone, parentLoginId } from './phone';

describe('normalizeUzPhone', () => {
  it.each([
    '+998 90 111-22-33',
    '+998901112233',
    '998901112233',
    '90 111 22 33',
    '901112233',
  ])('"%s" → +998901112233', (input) => {
    expect(normalizeUzPhone(input)).toBe('+998901112233');
  });

  it.each(['12345', '+7 900 111 22 33', '9989011122334', ''])(
    'rejects "%s"',
    (input) => {
      expect(normalizeUzPhone(input)).toBeNull();
    },
  );

  it('parent login ID is the last 9 digits', () => {
    expect(parentLoginId('+998901112233')).toBe('901112233');
  });
});
