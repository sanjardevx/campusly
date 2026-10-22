import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { IMPORT_LIMIT } from '../../libs/config';
import { ErrorCode } from '../../libs/enums/common.enum';
import { ImportIssueCode, ParentRelation } from '../../libs/enums/user.enum';
import { normalizeUzPhone } from '../../libs/utils/phone';
import type { ImportIssue } from '../../libs/dto/user/user';

/** CSV template columns (the design's "Download CSV template") */
export const IMPORT_COLUMNS = [
  'first_name',
  'last_name',
  'class',
  'admission_year',
  'parent_name',
  'parent_phone',
  'parent_relation',
] as const;
const REQUIRED_COLUMNS = ['first_name', 'last_name', 'class'];

/** One CSV row after the checks that need no database */
export interface ImportRow {
  /** Line in the file (the header is line 1), shown next to errors */
  line: number;
  firstName: string;
  lastName: string;
  className: string;
  admissionYear?: number;
  parent?: {
    firstName: string;
    lastName: string;
    /** Normalized: +998901234567 */
    phone: string;
    relation: ParentRelation;
  };
  /** The parent name as written: shown in the preview even when the phone is wrong */
  parentNameRaw?: string;
  errors: ImportIssue[];
}

type RawRow = Partial<Record<(typeof IMPORT_COLUMNS)[number], string>>;

/**
 * Step 1 of the import: read the CSV and check every row on its own (names, year, phone).
 * Checks against the database (class exists, parent exists) happen in the service.
 */
export function parseStudentCsv(csv: string): ImportRow[] {
  if (csv.length > IMPORT_LIMIT.maxChars) {
    throw badRequest(
      ErrorCode.IMPORT_FILE_TOO_BIG,
      `The file is too big (max ${IMPORT_LIMIT.maxChars / 1000} KB)`,
    );
  }

  let records: RawRow[];
  try {
    records = parse<RawRow>(csv, {
      bom: true, // Excel adds a byte-order mark
      columns: (header: string[]) =>
        header.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_')),
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    throw badRequest(
      ErrorCode.IMPORT_INVALID_CSV,
      `The file is not a valid CSV: ${(err as Error).message}`,
    );
  }

  if (records.length === 0) {
    throw badRequest(ErrorCode.IMPORT_EMPTY, 'The file has no student rows');
  }
  if (records.length > IMPORT_LIMIT.maxRows) {
    throw badRequest(
      ErrorCode.IMPORT_TOO_MANY_ROWS,
      `Too many rows: ${records.length} (max ${IMPORT_LIMIT.maxRows})`,
    );
  }
  const missing = REQUIRED_COLUMNS.filter((c) => !(c in records[0]));
  if (missing.length) {
    throw badRequest(
      ErrorCode.IMPORT_MISSING_COLUMNS,
      `Missing columns: ${missing.join(', ')}. Use the CSV template.`,
    );
  }

  return records.map((raw, i) => checkRow(raw, i + 2));
}

function checkRow(raw: RawRow, line: number): ImportRow {
  const errors: ImportIssue[] = [];
  const issue = (code: ImportIssueCode, value?: string) =>
    errors.push({ code, value: value ?? null });
  const firstName = raw.first_name ?? '';
  const lastName = raw.last_name ?? '';
  const className = (raw.class ?? '').toUpperCase();

  if (!isName(firstName)) issue(ImportIssueCode.FIRST_NAME_LENGTH, firstName);
  if (!isName(lastName)) issue(ImportIssueCode.LAST_NAME_LENGTH, lastName);
  if (!className) issue(ImportIssueCode.CLASS_EMPTY);

  let admissionYear: number | undefined;
  if (raw.admission_year) {
    admissionYear = Number(raw.admission_year);
    if (
      !Number.isInteger(admissionYear) ||
      admissionYear < 2000 ||
      admissionYear > 2100
    ) {
      issue(ImportIssueCode.ADMISSION_YEAR_INVALID, raw.admission_year);
    }
  }

  let parent: ImportRow['parent'];
  const parentName = raw.parent_name ?? '';
  const parentPhone = raw.parent_phone ?? '';
  if (parentName || parentPhone) {
    const phone = normalizeUzPhone(parentPhone);
    // "Sardor Aliyev" → first name "Sardor", last name "Aliyev"
    const [parentFirst = '', ...rest] = parentName.split(/\s+/);
    const parentLast = rest.join(' ');
    const relation = (raw.parent_relation || 'OTHER').toUpperCase();

    if (!phone) issue(ImportIssueCode.PHONE_INVALID, parentPhone);
    if (!isName(parentFirst) || !isName(parentLast)) {
      issue(ImportIssueCode.PARENT_NAME_INVALID, parentName);
    }
    if (!(relation in ParentRelation)) {
      issue(ImportIssueCode.RELATION_UNKNOWN, raw.parent_relation);
    }
    if (phone) {
      parent = {
        firstName: parentFirst,
        lastName: parentLast,
        phone,
        relation: relation as ParentRelation,
      };
    }
  }

  return {
    line,
    firstName,
    lastName,
    className,
    admissionYear,
    parent,
    ...(parentName && { parentNameRaw: parentName }),
    errors,
  };
}

const isName = (value: string) => value.length >= 2 && value.length <= 50;

/** 400 with a specific code: the UI says what is wrong with the file in the admin's language */
export function badRequest(code: ErrorCode, message: string) {
  return new BadRequestException({ code, message });
}
