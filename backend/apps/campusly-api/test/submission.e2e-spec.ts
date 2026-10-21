import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { StorageService } from '../src/components/media/storage.service';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis, not AWS (fake storage). Year "E2E Submit 2087":
//   course A: teacher tA, students sA and sA2, parent pA (of sA)
//   course B: teacher tB, student sB
// Course A assignments: hw (due in the future, 2 attempts, pdf only), late (past due, late allowed),
// closed (past due, no late), exam (offline), draft (not published).
const PASSWORD = 'E2e-Submit-Password-1';
const TAG = 'E2E Submit';
const DAY = 86_400_000;

type Key = 'tA' | 'tB' | 'sA' | 'sA2' | 'sB' | 'pA';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Sub {
  id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  attemptsLeft: number;
  attempts: {
    number: number;
    text: string | null;
    isLate: boolean;
    files: { assetId: string; url: string | null }[];
  }[];
  comments: { authorRole: string; body: string }[];
}

const fakeStorage = {
  isEnabled: true,
  presignUpload: (key: string) =>
    Promise.resolve(`https://fake-s3.test/${key}`),
  signedUrl: (key: string) => `https://fake-cdn.test/${key}?Signature=x`,
  head: () => Promise.resolve(null),
  delete: () => Promise.resolve(),
};

describe('Submissions: upload, submit, attempts, hidden grades, comments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const id = {} as Record<Key, string>;
  const token = {} as Record<Key, string>;
  const course = { A: '', B: '' };
  const a = { hw: '', late: '', closed: '', exam: '', draft: '' };
  let submissionId: string;

  async function gql<T>(query: string, variables: object, as: Key = 'sA') {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token[as]}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const UPLOAD = `mutation($i: CreateSubmissionUploadInput!) { createSubmissionUpload(input: $i) { assetId uploadUrl } }`;
  const SUB = `id status score feedback attemptsLeft
    attempts { number text isLate files { assetId url } }
    comments { authorRole body }`;
  const SUBMIT = `mutation($i: SubmitAssignmentInput!) { submitAssignment(input: $i) { ${SUB} } }`;
  const MINE = `query($a: String!, $s: String) { mySubmission(assignmentId: $a, studentId: $s) { ${SUB} } }`;
  const COMMENT = `mutation($i: AddSubmissionCommentInput!) { addSubmissionComment(input: $i) { ${SUB} } }`;

  const pdf = (assignmentId: string, extra: object = {}) => ({
    i: {
      assignmentId,
      kind: 'DOCUMENT',
      fileName: 'answer.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      ...extra,
    },
  });
  /** Upload through the API, then mark READY (the confirm step is tested in media.e2e-spec) */
  async function readyFile(as: Key, assignmentId: string) {
    const res = await gql<{ createSubmissionUpload: { assetId: string } }>(
      UPLOAD,
      pdf(assignmentId),
      as,
    );
    const assetId = res.data!.createSubmissionUpload.assetId;
    await prisma.mediaAsset.update({
      where: { id: assetId },
      data: { status: 'READY' },
    });
    return assetId;
  }
  const submit = (assignmentId: string, extra: object = {}, as: Key = 'sA') =>
    gql<{ submitAssignment: Sub }>(
      SUBMIT,
      { i: { assignmentId, ...extra } },
      as,
    );
  const mine = (assignmentId: string, as: Key = 'sA', studentId?: string) =>
    gql<{ mySubmission: Sub | null }>(
      MINE,
      { a: assignmentId, s: studentId },
      as,
    );

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const courses = { title: { startsWith: TAG } };
    const subs = { assignment: { course: courses } };
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.parentStudent.deleteMany({
      where: { studentId: { in: ids } },
    });
    await prisma.submissionComment.deleteMany({ where: { submission: subs } });
    await prisma.submissionFile.deleteMany({
      where: { attempt: { submission: subs } },
    });
    await prisma.submissionAttempt.deleteMany({ where: { submission: subs } });
    await prisma.submission.deleteMany({ where: subs });
    await prisma.mediaAsset.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.assignment.deleteMany({ where: { course: courses } });
    await prisma.gradeCategory.deleteMany({ where: { course: courses } });
    await prisma.enrollment.deleteMany({ where: { course: courses } });
    await prisma.courseTeacher.deleteMany({ where: { course: courses } });
    await prisma.course.deleteMany({ where: courses });
    await prisma.group.deleteMany({
      where: { academicYear: { name: `${TAG} 2087` } },
    });
    await prisma.subject.deleteMany({ where: { name: TAG } });
    await prisma.academicYear.deleteMany({ where: { name: `${TAG} 2087` } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useValue(fakeStorage)
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanUp();

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const [key, role] of [
      ['tA', 'TEACHER'],
      ['tB', 'TEACHER'],
      ['sA', 'STUDENT'],
      ['sA2', 'STUDENT'],
      ['sB', 'STUDENT'],
      ['pA', 'PARENT'],
    ] as const) {
      id[key] = (
        await prisma.user.create({
          data: {
            loginId: `e2e-submit-${key}`,
            role,
            passwordHash,
            firstName: key,
            lastName: TAG,
          },
        })
      ).id;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-submit-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }
    await prisma.parentStudent.create({
      data: {
        parentId: id.pA,
        studentId: id.sA,
        relation: 'FATHER',
        createdById: id.tA,
      },
    });

    const year = await prisma.academicYear.create({
      data: {
        name: `${TAG} 2087`,
        startsAt: new Date('2087-09-01'),
        endsAt: new Date('2088-05-31'),
      },
    });
    const subject = await prisma.subject.create({ data: { name: TAG } });
    for (const [key, teacherId, students] of [
      ['A', id.tA, [id.sA, id.sA2]],
      ['B', id.tB, [id.sB]],
    ] as const) {
      const group = await prisma.group.create({
        data: { academicYearId: year.id, name: `E2E-SU${key}` },
      });
      course[key] = (
        await prisma.course.create({
          data: {
            academicYearId: year.id,
            groupId: group.id,
            subjectId: subject.id,
            title: `${TAG} ${key}`,
            status: 'ACTIVE',
            teachers: { create: { teacherId } },
            enrollments: {
              create: students.map((studentId) => ({ studentId })),
            },
            gradeCategories: { create: { name: 'Homework', weight: 100 } },
          },
        })
      ).id;
    }

    const category = await prisma.gradeCategory.findFirstOrThrow({
      where: { courseId: course.A },
    });
    const now = Date.now();
    const make = async (
      title: string,
      data: {
        type?: 'HOMEWORK' | 'EXAM';
        dueAt: Date;
        allowLate?: boolean;
        maxAttempts?: number;
        published?: boolean;
      },
    ) =>
      (
        await prisma.assignment.create({
          data: {
            courseId: course.A,
            categoryId: category.id,
            type: data.type ?? 'HOMEWORK',
            title,
            maxScore: 20,
            dueAt: data.dueAt,
            allowLate: data.allowLate ?? true,
            maxAttempts: data.maxAttempts ?? 1,
            acceptedFileTypes: data.type === 'EXAM' ? [] : ['pdf'],
            publishedAt: data.published === false ? null : new Date(now - DAY),
            createdById: id.tA,
          },
        })
      ).id;
    a.hw = await make('Homework', {
      dueAt: new Date(now + DAY),
      maxAttempts: 2,
    });
    a.late = await make('Late allowed', { dueAt: new Date(now - DAY) });
    a.closed = await make('No late', {
      dueAt: new Date(now - DAY),
      allowLate: false,
    });
    a.exam = await make('Exam', { type: 'EXAM', dueAt: new Date(now + DAY) });
    a.draft = await make('Draft', {
      dueAt: new Date(now + DAY),
      published: false,
    });
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('createSubmissionUpload: key per assignment, only the types it accepts', async () => {
    const res = await gql<{
      createSubmissionUpload: { assetId: string; uploadUrl: string };
    }>(UPLOAD, pdf(a.hw));
    const { assetId } = res.data!.createSubmissionUpload;
    const row = await prisma.mediaAsset.findUniqueOrThrow({
      where: { id: assetId },
    });
    expect(row.s3Key).toBe(
      `raw/${course.A}/submissions/${a.hw}/${assetId}.pdf`,
    );

    const docx = pdf(a.hw, {
      fileName: 'answer.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(code(await gql(UPLOAD, docx))).toBe('BAD_REQUEST');
    expect(code(await gql(UPLOAD, pdf(a.exam)))).toBe('BAD_REQUEST');
    expect(code(await gql(UPLOAD, pdf(a.draft)))).toBe('NOT_FOUND');
    expect(code(await gql(UPLOAD, pdf(a.hw), 'sB'))).toBe('NOT_FOUND');
    expect(code(await gql(UPLOAD, pdf(a.hw), 'tA'))).toBe('FORBIDDEN');
  });

  it('submit refuses empty answers and files that are not the student’s own for this assignment', async () => {
    expect(code(await submit(a.hw))).toBe('BAD_REQUEST');

    const classmates = await readyFile('sA2', a.hw);
    expect(code(await submit(a.hw, { assetIds: [classmates] }))).toBe(
      'NOT_FOUND',
    );
    const otherAssignment = await readyFile('sA', a.late);
    expect(code(await submit(a.hw, { assetIds: [otherAssignment] }))).toBe(
      'NOT_FOUND',
    );
    const notReady = (
      await gql<{ createSubmissionUpload: { assetId: string } }>(
        UPLOAD,
        pdf(a.hw),
      )
    ).data!.createSubmissionUpload.assetId;
    expect(code(await submit(a.hw, { assetIds: [notReady] }))).toBe(
      'NOT_FOUND',
    );
  });

  it('submit: attempts until maxAttempts, files come back with a short link', async () => {
    const file = await readyFile('sA', a.hw);
    const first = (await submit(a.hw, { text: 'x = 4', assetIds: [file] }))
      .data!.submitAssignment;
    expect(first).toMatchObject({
      status: 'SUBMITTED',
      attemptsLeft: 1,
      attempts: [{ number: 1, text: 'x = 4', isLate: false }],
    });
    expect(first.attempts[0].files[0]).toEqual({
      assetId: file,
      url: expect.stringContaining('/submissions/') as string,
    });
    submissionId = first.id;

    const second = (await submit(a.hw, { text: 'x = 4 (fixed)' })).data!
      .submitAssignment;
    expect(second.attempts.map((x) => x.number)).toEqual([1, 2]);
    expect(second.attemptsLeft).toBe(0);
    expect(code(await submit(a.hw, { text: 'third' }))).toBe('BAD_REQUEST');
  });

  it('deadlines: LATE when allowed, refused when not; exams, drafts and teachers cannot submit', async () => {
    const late = (await submit(a.late, { text: 'late answer' })).data!
      .submitAssignment;
    expect(late).toMatchObject({
      status: 'LATE',
      attempts: [{ isLate: true }],
    });
    expect(code(await submit(a.closed, { text: 'too late' }))).toBe(
      'BAD_REQUEST',
    );
    expect(code(await submit(a.exam, { text: 'exam' }))).toBe('BAD_REQUEST');
    expect(code(await submit(a.draft, { text: 'draft' }))).toBe('NOT_FOUND');
    expect(code(await submit(a.hw, { text: 'b' }, 'sB'))).toBe('NOT_FOUND');
    expect(code(await submit(a.hw, { text: 't' }, 'tA'))).toBe('FORBIDDEN');
  });

  it('grades stay hidden from the student and parent until published', async () => {
    // Graded by the teacher (grading API is the next step)
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'GRADED', score: 18, feedback: 'Good work' },
    });
    for (const as of ['sA', 'pA'] as const) {
      expect((await mine(a.hw, as)).data!.mySubmission).toMatchObject({
        status: 'SUBMITTED',
        score: null,
        feedback: null,
      });
    }

    await prisma.assignment.update({
      where: { id: a.hw },
      data: { gradesPublishedAt: new Date() },
    });
    expect((await mine(a.hw)).data!.mySubmission).toMatchObject({
      status: 'GRADED',
      score: 18,
      feedback: 'Good work',
    });
    // Published grades close the assignment
    expect(code(await submit(a.late, { text: 'again' }))).toBe('BAD_REQUEST');
  });

  it('comments: the student and the course teacher write; others cannot', async () => {
    const say = (as: Key, body: string) =>
      gql<{ addSubmissionComment: Sub }>(
        COMMENT,
        { i: { submissionId, body } },
        as,
      );
    expect(code(await say('sA', 'Is my answer right?'))).toBeUndefined();
    const res = await say('tA', 'Check step 2 again.');
    expect(res.data!.addSubmissionComment.comments).toEqual([
      { authorRole: 'STUDENT', body: 'Is my answer right?' },
      { authorRole: 'TEACHER', body: 'Check step 2 again.' },
    ]);

    expect(code(await say('tB', 'hi'))).toBe('NOT_FOUND');
    expect(code(await say('sA2', 'hi'))).toBe('NOT_FOUND');
    expect(code(await say('pA', 'hi'))).toBe('FORBIDDEN');
    // The parent can read them
    expect((await mine(a.hw, 'pA')).data!.mySubmission!.comments).toHaveLength(
      2,
    );
  });

  it('mySubmission: null before submitting; a parent cannot ask for someone else’s child', async () => {
    expect((await mine(a.hw, 'sA2')).data!.mySubmission).toBeNull();
    expect(code(await mine(a.hw, 'pA', id.sA2))).toBe('NOT_FOUND');
    expect(code(await mine(a.hw, 'tA'))).toBe('FORBIDDEN');
  });
});
