import 'reflect-metadata';
import { Role } from '../src/libs/enums/user.enum';
import { AnnouncementResolver } from '../src/components/announcement/announcement.resolver';
import { AssignmentResolver } from '../src/components/assignment/assignment.resolver';
import { GradingResolver } from '../src/components/assignment/grading.resolver';
import { SubmissionResolver } from '../src/components/assignment/submission.resolver';
import { AttendanceResolver } from '../src/components/attendance/attendance.resolver';
import { ContentResolver } from '../src/components/course/content.resolver';
import { CourseResolver } from '../src/components/course/course.resolver';
import { GradeResolver } from '../src/components/grade/grade.resolver';
import { PeriodGradeResolver } from '../src/components/grade/period-grade.resolver';
import { GroupResolver } from '../src/components/group/group.resolver';
import { MediaResolver } from '../src/components/media/media.resolver';
import { OverviewResolver } from '../src/components/overview/overview.resolver';
import { ProgressResolver } from '../src/components/progress/progress.resolver';
import { SchoolResolver } from '../src/components/school/school.resolver';
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
  ContentResolver,
  CourseResolver,
  GradeResolver,
  GradingResolver,
  GroupResolver,
  MediaResolver,
  OverviewResolver,
  PeriodGradeResolver,
  ProgressResolver,
  SchoolResolver,
  SubmissionResolver,
  UserAdminResolver,
  UserResolver,
];

/** Every signed-in role; the record check is in the service (AccessPolicy) */
const ANY_SIGNED_IN = new Set([
  'announcements', // school-wide + the viewer's courses
  'markAnnouncementRead',
  'assignment', // assertCanViewAssignment
  'courseAssignments', // assertCanViewCourse
  'courseDetail', // assertCanViewCourse
  'academicYears', // not secret: the school calendar
  'currentAcademicYear',
  'periods',
  'subjects',
  'me',
  'changePassword',
]);

const PUBLIC = new Set(['schoolSettings']);

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
      ['UserAdminResolver', 'GroupResolver'].includes(o.resolver),
    );
    for (const op of adminOnly) expect(op.roles).toEqual([Role.ADMIN]);
  });

  it('parents never write: no mutation lists PARENT except the read-only comment check', () => {
    const parentMutations = ops
      .filter((o) => o.roles?.includes(Role.PARENT))
      .map((o) => o.name)
      .filter(
        (n) =>
          !n.startsWith('my') && n !== 'lessonVideo' && n !== 'studentOverview',
      );
    // addSubmissionComment lets parents in only to answer FORBIDDEN for their own child
    expect(parentMutations).toEqual(['addSubmissionComment']);
  });
});
