import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import type { LocalizedText } from '../../libs/dto/site/site';
import type { LocalizedTextInput } from '../../libs/dto/site/site.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { SiteLocale } from '../../libs/enums/site.enum';

const LOCALES = ['en', 'uz', 'ru', 'ko'] as const;

/**
 * Cleans a four-language text for the DB: trimmed, empty translations dropped, English required
 * (and every language within `max`). Returns null for an optional text left empty.
 */
export function cleanText(
  input: LocalizedTextInput | undefined | null,
  field: string,
  max: number,
  required = true,
): Prisma.InputJsonObject | null {
  const out: Record<string, string> = {};
  for (const locale of LOCALES) {
    const value = input?.[locale]?.trim();
    if (!value) continue;
    if (value.length > max) {
      throw badRequest(`${field} (${locale}) is longer than ${max} characters`);
    }
    out[locale] = value;
  }
  if (!out.en) {
    if (required || Object.keys(out).length) {
      throw badRequest(`${field}: the English text is required`);
    }
    return null;
  }
  return out;
}

/** The DB JSON back as the GraphQL object (admin forms) */
export function toLocalized(
  value: Prisma.JsonValue | null,
): LocalizedText | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const pick = (k: string) => (typeof v[k] === 'string' ? v[k] : null);
  return {
    en: pick('en') ?? '',
    uz: pick('uz'),
    ru: pick('ru'),
    ko: pick('ko'),
  };
}

/** One language for the public site; a missing translation falls back to English */
export function inLocale(
  value: Prisma.JsonValue | null,
  locale: SiteLocale,
): string | null {
  const text = toLocalized(value);
  if (!text) return null;
  return text[locale] || text.en || null;
}

export const badRequest = (message: string) =>
  new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });

/** "Dilnoza Rahimova" → "Dilnoza R." (the CMS lists who edited a row); no last name → "Simon" */
export const shortName = (u: { firstName: string; lastName: string } | null) =>
  u
    ? [u.firstName, u.lastName.trim() ? `${u.lastName.trim().charAt(0)}.` : '']
        .filter(Boolean)
        .join(' ')
    : null;
