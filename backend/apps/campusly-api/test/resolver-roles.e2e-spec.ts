import 'reflect-metadata';
import { Role } from '../src/libs/enums/user.enum';
import { AnnouncementResolver } from '../src/components/announcement/announcement.resolver';
import { AssignmentResolver } from '../src/components/assignment/assignment.resolver';
import { GradingResolver } from '../src/components/assignment/grading.resolver';
import { SubmissionResolver } from '../src/components/assignment/submission.resolver';
import { AttendanceResolver } from '../src/components/attendance/attendance.resolver';
import { AuditResolver } from '../src/components/audit/audit.resolver';
import { ContentResolver } from '../src/components/course/content.resolver';
import { CourseResolver } from '../src/components/course/course.resolver';
import { DashboardResolver } from '../src/components/dashboard/dashboard.resolver';
import { GradeResolver } from '../src/components/grade/grade.resolver';
import { PeriodGradeResolver } from '../src/components/grade/period-grade.resolver';
import { GroupResolver } from '../src/components/group/group.resolver';
import { MediaResolver } from '../src/components/media/media.resolver';
import { OverviewResolver } from '../src/components/overview/overview.resolver';
import { ProgressResolver } from '../src/components/progress/progress.resolver';
import { QuizResolver } from '../src/components/assignment/quiz.resolver';
import { SchoolEventResolver } from '../src/components/school/school-event.resolver';
import { SchoolResolver } from '../src/components/school/school.resolver';
import { SiteAdminResolver } from '../src/components/site/site-admin.resolver';
import { SitePublicResolver } from '../src/components/site/site-public.resolver';
import { TeacherDashboardResolver } from '../src/components/dashboard/teacher-dashboard.resolver';
import { TelegramResolver } from '../src/components/telegram/telegram.resolver';
import { TutorResolver } from '../src/components/tutor/tutor.resolver';
import { UserAdminResolver } from '../src/components/user/user-admin.resolver';
import { UserResolver } from '../src/components/user/user.resolver';
import {
  IS_PUBLIC,
  ROLES,
} from '../src/components/auth/decorators/auth.decorators';

// No database needed (it reads decorator metadata); it lives here because the resolvers import the
// ESM Prisma client, which only the e2e Jest setup can load.
// "Secure by default" as a test: every query and mutation either names its roles (@Roles),
// is explicitly @Public, or is on the short list below — open to every signed-in role because
// AccessPolicy decides per record (and the e2e isolation tables prove it).
// A new resolver without @Roles makes this test fail until someone decides on purpose.
const RESOLVERS = [
  AnnouncementResolver,
  AssignmentResolver,
  AttendanceResolver,
  AuditResolver,
  ContentResolver,
  CourseResolver,
  DashboardResolver,
  GradeResolver,
  GradingResolver,
  GroupResolver,
  MediaResolver,
  OverviewResolver,
  PeriodGradeResolver,
  ProgressResolver,
  QuizResolver,
  SchoolEventResolver,
  SchoolResolver,
  SiteAdminResolver,
  SitePublicResolver,
  SubmissionResolver,
  TeacherDashboardResolver,
  TelegramResolver,
  TutorResolver,
  UserAdminResolver,
  UserResolver,
];

/** Every signed-in role; the record check is in the service (AccessPolicy) */
const ANY_SIGNED_IN = new Set([
  'announcements', // school-wide + the viewer's courses
  'markAnnouncementRead',
  'markAllAnnouncementsRead', // visibleTo(user): own scope only
  'assignment', // assertCanViewAssignment
  'courseAssignments', // assertCanViewCourse
  'courseDetail', // assertCanViewCourse
  'quizResult', // students / parents after publish, teachers per enrolled student (QuizService)
  'academicYears', // not secret: the school calendar
  'currentAcademicYear',
  'periods',
  'subjects',
  'me',
  'changePassword',
]);

// The public website: published content only, and a rate-limited enquiry form
const PUBLIC = new Set(['schoolSettings', 'siteHome', 'submitEnquiry']);

type Op = {
  resolver: string;
  name: string;
  roles: Role[] | null;
  isPublic: boolean;
};

function operations(): Op[] {
  const ops: Op[] = [];
  for (const resolver of RESOLVERS) {
    const proto = resolver.prototype as unknown as Record<string, unknown>;
    for (const name of Object.getOwnPropertyNames(proto)) {
      const method = proto[name];
      if (typeof method !== 'function' || name === 'constructor') continue;
      const type = Reflect.getMetadata('graphql:resolver_type', method) as
        string | undefined;
      if (type !== 'Query' && type !== 'Mutation') continue;
      const roles =
        (Reflect.getMetadata(ROLES, method) as Role[] | undefined) ??
        (Reflect.getMetadata(ROLES, resolver) as Role[] | undefined) ??
        null;
      const isPublic =
        Reflect.getMetadata(IS_PUBLIC, method) === true ||
        Reflect.getMetadata(IS_PUBLIC, resolver) === true;
      ops.push({ resolver: resolver.name, name, roles, isPublic });
    }
  }
  return ops;
}

describe('Every GraphQL operation has a deliberate role rule', () => {
  const ops = operations();

  it('finds the operations (sanity check)', () => {
    expect(ops.length).toBeGreaterThan(70);
  });

  it('no operation is open to every role by accident', () => {
    const accidental = ops
      .filter((o) => !o.roles && !o.isPublic && !ANY_SIGNED_IN.has(o.name))
      .map((o) => `${o.resolver}.${o.name}`);
    expect(accidental).toEqual([]);
  });

  it('only the listed operations are public', () => {
    expect(ops.filter((o) => o.isPublic).map((o) => o.name)).toEqual([
      ...PUBLIC,
    ]);
  });

  it('the allow-list has no stale names', () => {
    const names = new Set(ops.map((o) => o.name));
    expect([...ANY_SIGNED_IN].filter((n) => !names.has(n))).toEqual([]);
  });

  it('admin-only areas never let other roles in', () => {
    const adminOnly = ops.filter((o) =>
      [
        'UserAdminResolver',
        'GroupResolver',
        'AuditResolver',
        'DashboardResolver',
        'SchoolEventResolver',
        'SiteAdminResolver',
      ].includes(o.resolver),
    );
    for (const op of adminOnly) expect(op.roles).toEqual([Role.ADMIN]);
  });

  it('the teacher dashboard is for teachers only', () => {
    const teacherOnly = ops.filter(
      (o) => o.resolver === 'TeacherDashboardResolver',
    );
    expect(teacherOnly.map((o) => o.name)).toEqual(['teacherDashboard']);
    for (const op of teacherOnly) expect(op.roles).toEqual([Role.TEACHER]);
  });

  it('parents never write: no mutation lists PARENT except the read-only comment check', () => {
    const parentMutations = ops
      .filter((o) => o.roles?.includes(Role.PARENT))
      .map((o) => o.name)
      .filter(
        (n) =>
          !n.startsWith('my') &&
          // Read-only queries open to parents (AccessPolicy decides per record)
          ![
            'lessonVideo',
            'courseFileUrl',
            'studentOverview',
            'studentCalendar',
            'studentAttendance',
            'courseProgress',
            'telegramStatus', // own account only: is Telegram connected
          ].includes(n),
      );
    // addSubmissionComment lets parents in only to answer FORBIDDEN for their own child
    expect(parentMutations).toEqual(['addSubmissionComment']);
  });

  it('parents never see AI tutor conversations: every tutor operation is STUDENT only', () => {
    const tutor = ops.filter((o) => o.resolver === 'TutorResolver');
    expect(tutor.map((o) => o.name).sort()).toEqual([
      'markTutorSolved',
      'tutorConversation',
      'tutorConversations',
      'tutorStatus',
    ]);
    for (const op of tutor) expect(op.roles).toEqual([Role.STUDENT]);
  });
});
