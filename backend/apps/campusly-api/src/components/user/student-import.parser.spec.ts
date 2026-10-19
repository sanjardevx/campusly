import { HttpException } from '@nestjs/common';
import { parseStudentCsv } from './student-import.parser';

const HEADER =
  'First Name,Last Name,Class,Admission Year,Parent Name,Parent Phone,Parent Relation';

/** Excel puts a byte-order mark at the start of a CSV */
const BOM = String.fromCharCode(0xfeff);

const messageOf = (run: () => unknown) => {
  try {
    run();
  } catch (err) {
    return ((err as HttpException).getResponse() as { message: string })
      .message;
  }
  return 'NO_ERROR';
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

    expect(row.errors).toEqual([
      'First name must be 2–50 characters',
      'Invalid admission year: 1850',
      'Invalid phone: +998 99 78',
      'Parent name must be "First Last"',
      'Unknown parent relation: uncle',
    ]);
  });

  it('rejects the whole file for missing columns, no rows or too many rows', () => {
    expect(messageOf(() => parseStudentCsv('name,surname\nA,B\n'))).toMatch(
      'Missing columns: first_name, last_name, class',
    );
    expect(messageOf(() => parseStudentCsv(`${HEADER}\n`))).toBe(
      'The file has no student rows',
    );
    const big = `${HEADER}\n` + 'Ali,Valiyev,9A,,,,\n'.repeat(301);
    expect(messageOf(() => parseStudentCsv(big))).toBe(
      'Too many rows: 301 (max 300)',
    );
  });

  it('reports a broken CSV clearly', () => {
    expect(
      messageOf(() => parseStudentCsv(`${HEADER}\n"unclosed,quote\n`)),
    ).toMatch('The file is not a valid CSV');
  });
});
