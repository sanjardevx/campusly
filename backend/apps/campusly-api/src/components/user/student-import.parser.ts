import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { IMPORT_LIMIT } from '../../libs/config';
import { ErrorCode } from '../../libs/enums/common.enum';
import { ParentRelation } from '../../libs/enums/user.enum';
import { normalizeUzPhone } from '../../libs/utils/phone';

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
  errors: string[];
}

type RawRow = Partial<Record<(typeof IMPORT_COLUMNS)[number], string>>;

/**
 * Step 1 of the import: read the CSV and check every row on its own (names, year, phone).
 * Checks against the database (class exists, parent exists) happen in the service.
 */
export function parseStudentCsv(csv: string): ImportRow[] {
  if (csv.length > IMPORT_LIMIT.maxChars) {
    throw badRequest(
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
    throw badRequest(`The file is not a valid CSV: ${(err as Error).message}`);
  }

  if (records.length === 0) throw badRequest('The file has no student rows');
  if (records.length > IMPORT_LIMIT.maxRows) {
    throw badRequest(
      `Too many rows: ${records.length} (max ${IMPORT_LIMIT.maxRows})`,
    );
  }
  const missing = REQUIRED_COLUMNS.filter((c) => !(c in records[0]));
  if (missing.length) {
    throw badRequest(
      `Missing columns: ${missing.join(', ')}. Use the CSV template.`,
    );
  }

  return records.map((raw, i) => checkRow(raw, i + 2));
}

function checkRow(raw: RawRow, line: number): ImportRow {
  const errors: string[] = [];
  const firstName = raw.first_name ?? '';
  const lastName = raw.last_name ?? '';
  const className = (raw.class ?? '').toUpperCase();

  if (!isName(firstName)) errors.push('First name must be 2–50 characters');
  if (!isName(lastName)) errors.push('Last name must be 2–50 characters');
  if (!className) errors.push('Class is empty');

  let admissionYear: number | undefined;
  if (raw.admission_year) {
    admissionYear = Number(raw.admission_year);
    if (
      !Number.isInteger(admissionYear) ||
      admissionYear < 2000 ||
      admissionYear > 2100
    ) {
      errors.push(`Invalid admission year: ${raw.admission_year}`);
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

    if (!phone) errors.push(`Invalid phone: ${parentPhone || '(empty)'}`);
    if (!isName(parentFirst) || !isName(parentLast)) {
      errors.push('Parent name must be "First Last"');
    }
    if (!(relation in ParentRelation)) {
      errors.push(`Unknown parent relation: ${raw.parent_relation}`);
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
    errors,
  };
}

const isName = (value: string) => value.length >= 2 && value.length <= 50;

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}
