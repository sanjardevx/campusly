import { HttpException } from '@nestjs/common';
import { parseStudentCsv } from './student-import.parser';

const HEADER =
  'First Name,Last Name,Class,Admission Year,Parent Name,Parent Phone,Parent Relation';

/** Excel puts a byte-order mark at the start of a CSV */
const BOM = String.fromCharCode(0xfeff);

/** The code the client gets for a refused file (and the message, for people reading logs) */
const refusal = (run: () => unknown) => {
  try {
    run();
  } catch (err) {
    return (err as HttpException).getResponse() as {
      code: string;
      message: string;
    };
  }
  return { code: 'NO_ERROR', message: '' };
};

describe('parseStudentCsv', () => {
  it('reads rows, normalizes the phone, splits the parent name, numbers the lines', () => {
    const rows = parseStudentCsv(
      `${BOM}${HEADER}\n` + // Excel BOM + "Title Case" headers
        'Azizbek,Aliyev,9a,2026,Sardor Aliyev,+998 90 123 45 67,father\n' +
        '"Dilnoza","Karimova",9A,,,,\n',
    );

    expect(rows).toEqual([
      {
        line: 2,
        firstName: 'Azizbek',
        lastName: 'Aliyev',
        className: '9A',
        admissionYear: 2026,
        parent: {
          firstName: 'Sardor',
          lastName: 'Aliyev',
          phone: '+998901234567',
          relation: 'FATHER',
        },
        parentNameRaw: 'Sardor Aliyev',
        errors: [],
      },
      {
        line: 3,
        firstName: 'Dilnoza',
        lastName: 'Karimova',
        className: '9A',
        admissionYear: undefined,
        parent: undefined,
        errors: [],
      },
    ]);
  });

  it('collects every problem of a row instead of stopping at the first', () => {
    const [row] = parseStudentCsv(
      `${HEADER}\nA,Kadyrov,10B,1850,Farrukh,+998 99 78,uncle\n`,
    );

    // Codes + the bad value, never English sentences: the UI translates them
    expect(row.errors).toEqual([
      { code: 'FIRST_NAME_LENGTH', value: 'A' },
      { code: 'ADMISSION_YEAR_INVALID', value: '1850' },
      { code: 'PHONE_INVALID', value: '+998 99 78' },
      { code: 'PARENT_NAME_INVALID', value: 'Farrukh' },
      { code: 'RELATION_UNKNOWN', value: 'uncle' },
    ]);
    // The phone is wrong, so there is no parent to create, but the preview still shows the name
    expect(row.parent).toBeUndefined();
    expect(row.parentNameRaw).toBe('Farrukh');
  });

  it('rejects the whole file for missing columns, no rows or too many rows', () => {
    const missing = refusal(() => parseStudentCsv('name,surname\nA,B\n'));
    expect(missing.code).toBe('IMPORT_MISSING_COLUMNS');
    expect(missing.message).toMatch('first_name, last_name, class');

    expect(refusal(() => parseStudentCsv(`${HEADER}\n`)).code).toBe(
      'IMPORT_EMPTY',
    );
    const big = `${HEADER}\n` + 'Ali,Valiyev,9A,,,,\n'.repeat(301);
    expect(refusal(() => parseStudentCsv(big))).toEqual({
      code: 'IMPORT_TOO_MANY_ROWS',
      message: 'Too many rows: 301 (max 300)',
    });
  });

  it('reports a broken CSV clearly', () => {
    const broken = refusal(() =>
      parseStudentCsv(`${HEADER}\n"unclosed,quote\n`),
    );
    expect(broken.code).toBe('IMPORT_INVALID_CSV');
    expect(broken.message).toMatch('The file is not a valid CSV');
  });
});
