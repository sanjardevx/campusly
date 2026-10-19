/**
 * Uzbek mobile numbers come in many shapes: "+998 90 111-22-33", "998901112233", "901112233".
 * Everything is stored as "+998901112233"; otherwise one parent could get two accounts.
 * Returns null when it is not a 9-digit Uzbek number.
 */
export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const local =
    digits.length === 12 && digits.startsWith('998')
      ? digits.slice(3)
      : digits.length === 9
        ? digits
        : null;
  return local ? `+998${local}` : null;
}

/** Parent login ID = the last 9 digits of the phone (DECISIONS §6) */
export const parentLoginId = (normalizedPhone: string) =>
  normalizedPhone.slice(-9);
