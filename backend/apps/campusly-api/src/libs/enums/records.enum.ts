import { registerEnumType } from '@nestjs/graphql';

/** The documents of the admin Records page (DECISIONS §9) */
export enum RecordReport {
  STUDENTS = 'STUDENTS',
  GRADES = 'GRADES',
  ATTENDANCE = 'ATTENDANCE',
  REPORT_CARD = 'REPORT_CARD',
}
registerEnumType(RecordReport, { name: 'RecordReport' });

export enum RecordFormat {
  CSV = 'CSV',
  PRINT = 'PRINT',
}
registerEnumType(RecordFormat, { name: 'RecordFormat' });
