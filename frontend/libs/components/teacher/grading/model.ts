import { zip } from 'fflate';
import type { AssignmentSubmissionsQuery, GradingAssignmentQuery } from '@/libs/gql/graphql';

export type GradingAssignment = GradingAssignmentQuery['assignment'];
export type Row = AssignmentSubmissionsQuery['assignmentSubmissions'][number];
export type Attempt = NonNullable<Row['submission']>['attempts'][number];

/** What the teacher needs to see in a row (worked out from the submission, DECISIONS) */
export type RowState = 'NOT_SUBMITTED' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'MISSING' | 'RETURNED';
export type Filter = 'ALL' | 'NEEDS_GRADING' | 'GRADED' | 'NOT_SUBMITTED' | 'LATE';

export interface RowView {
  row: Row;
  state: RowState;
  score: number | null;
  /** The last attempt, if any */
  last: Attempt | null;
  /** Minutes after the deadline (late attempts only) */
  lateBy: number | null;
  /** The student uploaded again after the grade was given */
  changedAfterGrading: boolean;
}

export function viewOf(row: Row, assignment: Pick<GradingAssignment, 'dueAt'>): RowView {
  const s = row.submission;
  const last = s?.attempts.at(-1) ?? null;
  const score = s?.score ?? null;
  let state: RowState;
  if (!s || (s.status === 'DRAFT' && !last)) state = 'NOT_SUBMITTED';
  else if (s.status === 'MISSING') state = 'MISSING';
  else if (s.status === 'RETURNED') state = 'RETURNED';
  else if (s.status === 'GRADED' && !last) state = 'GRADED';
  else state = last?.isLate ? 'LATE' : 'SUBMITTED';
  const lateBy =
    last?.isLate && assignment.dueAt ? Math.max(1, Math.round((new Date(last.submittedAt).getTime() - new Date(assignment.dueAt).getTime()) / 60_000)) : null;
  const changedAfterGrading = !!(last && s?.gradedAt && new Date(last.submittedAt) > new Date(s.gradedAt));
  return { row, state, score, last, lateBy, changedAfterGrading };
}

/** Work handed in that has no score yet (or changed since it was graded) */
export const needsGrading = (v: RowView) =>
  (v.state === 'SUBMITTED' || v.state === 'LATE') && (v.score === null || v.changedAfterGrading);

export function matches(v: RowView, filter: Filter): boolean {
  switch (filter) {
    case 'ALL':
      return true;
    case 'NEEDS_GRADING':
      return needsGrading(v);
    case 'GRADED':
      return v.score !== null;
    case 'NOT_SUBMITTED':
      return v.state === 'NOT_SUBMITTED' || v.state === 'MISSING';
    case 'LATE':
      return v.state === 'LATE';
  }
}

/** "1h 12m" · "2d 3h" · "45m" */
export function span(minutes: number): string {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

/** "Oct 3, 23:59" in a timezone (the school's, for deadlines); Uzbek: "03.10, 23:59" */
export function formatInZone(iso: string, timeZone: string, locale = 'en'): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  if (locale === 'uz') {
    const day = new Intl.DateTimeFormat('en-GB', { timeZone, day: '2-digit', month: '2-digit' }).format(date).replace('/', '.');
    return `${day}, ${time}`;
  }
  return `${new Intl.DateTimeFormat(locale, { timeZone, month: 'short', day: 'numeric' }).format(date)}, ${time}`;
}

/** Same on the viewer's own clock (when something was handed in) */
export const formatLocal = (iso: string, locale = 'en') => formatInZone(iso, Intl.DateTimeFormat().resolvedOptions().timeZone, locale);

/**
 * "Download all (ZIP)": the browser fetches every last-attempt file through its signed link and
 * zips them itself (fflate), one folder per student. Nothing passes through our API (DECISIONS §11).
 */
export async function downloadAllZip(views: RowView[], fileName: string, onProgress: (done: number, total: number) => void) {
  const files = views.flatMap((v) =>
    (v.last?.files ?? []).filter((f) => f.url).map((f) => ({ folder: `${v.row.loginId} ${v.row.lastName} ${v.row.firstName}`, name: f.originalName, url: f.url! })),
  );
  const entries: Record<string, Uint8Array> = {};
  let done = 0;
  onProgress(0, files.length);
  for (const f of files) {
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`DOWNLOAD_${res.status}`);
    let path = `${f.folder}/${f.name}`;
    // Two files with the same name from one student: keep both
    for (let n = 2; entries[path]; n++) path = `${f.folder}/${n}-${f.name}`;
    entries[path] = new Uint8Array(await res.arrayBuffer());
    onProgress(++done, files.length);
  }
  const data = await new Promise<Uint8Array>((resolve, reject) =>
    // Files are already compressed (PDF, JPG): store them, do not compress again
    zip(entries, { level: 0 }, (err, out) => (err ? reject(err) : resolve(out))),
  );
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return files.length;
}
