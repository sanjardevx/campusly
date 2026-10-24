import { registerEnumType } from '@nestjs/graphql';

/** A row of the student's gradebook (DECISIONS §10): what happened to this assignment so far */
export enum GradeItemState {
  /** Grades published: the score (and feedback) are shown */
  GRADED = 'GRADED',
  /** Grades published, the student got the teacher's "0 for not submitted" */
  MISSING = 'MISSING',
  /** Handed in, grades not published yet */
  SUBMITTED = 'SUBMITTED',
  /** Past the due date, not handed in */
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  /** Due in the next 3 days */
  DUE_SOON = 'DUE_SOON',
  UPCOMING = 'UPCOMING',
  /** Grades published but this student has no score (the teacher left it empty) */
  NOT_GRADED = 'NOT_GRADED',
}
registerEnumType(GradeItemState, { name: 'GradeItemState' });
