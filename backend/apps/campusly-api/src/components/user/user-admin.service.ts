import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction } from '../../libs/enums/audit.enum';
import { Direction, ErrorCode } from '../../libs/enums/common.enum';
import { PasswordState } from '../../libs/enums/user.enum';
import {
  CreateStudentResult,
  LoginSlip,
  UserListItem,
  Users,
} from '../../libs/dto/user/user';
import {
  CreateStudentInput,
  CreateTeacherInput,
  ParentInput,
  UsersInquiry,
} from '../../libs/dto/user/user.input';
import type { AuthUser } from '../../libs/types/auth';
import { normalizeUzPhone, parentLoginId } from '../../libs/utils/phone';
import {
  generateParentPassword,
  generateStudentPassword,
} from '../../libs/utils/temp-password';
import { AuditService } from '../audit/audit.service';
import { SchoolService } from '../school/school.service';
import { AuthService } from '../auth/auth.service';
import { EnrollmentService } from '../group/enrollment.service';
import { LoginIdService } from './login-id.service';

type Tx = Prisma.TransactionClient;

/** A generated temporary password and the DB fields for it (hashed BEFORE the transaction) */
export interface PreparedPassword {
  plain: string;
  data: {
    passwordHash: string;
    tempPasswordUsesLeft: number;
    tempPasswordExpiresAt: Date;
    mustChangePassword: false;
  };
}

/**
 * Accounts are created only by the admin: no public signup (Nestar let users sign up and even pick
 * their own role). Every method runs in one transaction and writes an audit row.
 */
/** N sign-ins or D days, whichever comes first */
export interface TempPasswordRule {
  uses: number;
  days: number;
}

@Injectable()
export class UserAdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly loginIdService: LoginIdService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly enrollmentService: EnrollmentService,
    private readonly schoolService: SchoolService,
  ) {}

  // ───────────────────────── students ─────────────────────────

  public async createStudent(
    admin: AuthUser,
    input: CreateStudentInput,
  ): Promise<CreateStudentResult> {
    // bcrypt takes ~70 ms: hash before the transaction, which holds the id_counters row lock
    const rule = await this.tempPasswordRule();
    const studentPassword = await this.preparePassword(
      generateStudentPassword(),
      rule,
    );
    const parentPassword = input.parent
      ? await this.preparePassword(generateParentPassword(), rule)
      : null;

    return this.prismaService.$transaction((tx) =>
      this.createStudentTx(tx, admin, input, studentPassword, parentPassword),
    );
  }

  /**
   * Creates one student (ID, class, its whole-class courses, parent, audit) inside the caller's
   * transaction. Used by createStudent and by the CSV import, so both follow the same rules.
   */
  public async createStudentTx(
    tx: Tx,
    admin: AuthUser,
    input: CreateStudentInput,
    studentPassword: PreparedPassword,
    parentPassword: PreparedPassword | null,
  ): Promise<CreateStudentResult> {
    const group = await tx.group.findUnique({
      where: { id: input.groupId },
      select: { status: true },
    });
    if (!group || group.status !== 'ACTIVE') {
      throw this.notFound('Class not found');
    }

    const loginId = await this.loginIdService.next('STUDENT', tx);
    const student = await tx.user.create({
      data: {
        loginId,
        role: 'STUDENT',
        ...studentPassword.data,
        firstName: input.firstName,
        lastName: input.lastName,
        studentProfile: {
          create: {
            birthDate: input.birthDate,
            admissionYear: input.admissionYear ?? new Date().getUTCFullYear(),
          },
        },
      },
    });
    // The class and its whole-class courses (e.g. "Algebra · 9A")
    await this.enrollmentService.joinClass(tx, student.id, input.groupId);

    await this.auditService.log(tx, {
      actor: admin,
      action: AuditAction.USER_CREATE,
      entityType: 'User',
      entityId: student.id,
      after: student,
    });

    const parent =
      input.parent && parentPassword
        ? await this.linkParentTx(
            tx,
            admin,
            student.id,
            input.parent,
            parentPassword,
          )
        : null;

    return {
      student: this.slip(student, studentPassword.plain, true),
      parent,
    };
  }

  // ───────────────────────── teachers ─────────────────────────

  public async createTeacher(
    admin: AuthUser,
    input: CreateTeacherInput,
  ): Promise<LoginSlip> {
    const password = await this.preparePassword(
      generateStudentPassword(),
      await this.tempPasswordRule(),
    );

    return this.prismaService.$transaction(async (tx) => {
      const loginId = await this.loginIdService.next('TEACHER', tx);
      const teacher = await tx.user.create({
        data: {
          loginId,
          role: 'TEACHER',
          ...password.data,
          firstName: input.firstName,
          lastName: input.lastName,
          teacherProfile: { create: { title: input.title } },
        },
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.USER_CREATE,
        entityType: 'User',
        entityId: teacher.id,
        after: teacher,
      });
      return this.slip(teacher, password.plain, true);
    });
  }

  // ───────────────────────── parents ─────────────────────────

  /** Adds a parent to an existing student (finds the parent by phone or creates one) */
  public async linkParent(
    admin: AuthUser,
    studentId: string,
    input: ParentInput,
  ): Promise<LoginSlip> {
    const password = await this.preparePassword(
      generateParentPassword(),
      await this.tempPasswordRule(),
    );

    return this.prismaService.$transaction(async (tx) => {
      const student = await tx.user.findUnique({
        where: { id: studentId },
        select: { role: true },
      });
      if (student?.role !== 'STUDENT') throw this.notFound('Student not found');
      return this.linkParentTx(tx, admin, studentId, input, password);
    });
  }

  /** The link row stays with revokedAt (history); the parent loses access to this child */
  public async unlinkParent(
    admin: AuthUser,
    studentId: string,
    parentId: string,
  ): Promise<boolean> {
    return this.prismaService.$transaction(async (tx) => {
      const link = await tx.parentStudent.findUnique({
        where: { parentId_studentId: { parentId, studentId } },
      });
      if (!link || link.revokedAt) throw this.notFound('Link not found');

      const after = await tx.parentStudent.update({
        where: { id: link.id },
        data: { revokedAt: new Date() },
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.PARENT_UNLINK,
        entityType: 'ParentStudent',
        entityId: link.id,
        before: link,
        after,
      });
      return true;
    });
  }

  /**
   * One parent account for all children: found by the normalized phone, created only if new.
   * An existing parent keeps their own password (tempPassword = null on the slip).
   */
  private async linkParentTx(
    tx: Tx,
    admin: AuthUser,
    studentId: string,
    input: ParentInput,
    password: PreparedPassword,
  ): Promise<LoginSlip> {
    const phone = normalizeUzPhone(input.phone);
    if (!phone) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        message: 'Phone must be an Uzbek mobile number, e.g. +998 90 123 45 67',
      });
    }

    let parent = await tx.user.findFirst({
      where: { parentProfile: { phone } },
    });
    const isNew = !parent;
    if (!parent) {
      const loginId = parentLoginId(phone);
      if (
        await tx.user.findUnique({ where: { loginId }, select: { id: true } })
      ) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          message: `Login ID ${loginId} is already used`,
        });
      }
      parent = await tx.user.create({
        data: {
          loginId,
          role: 'PARENT',
          ...password.data,
          firstName: input.firstName,
          lastName: input.lastName,
          parentProfile: { create: { phone } },
        },
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.USER_CREATE,
        entityType: 'User',
        entityId: parent.id,
        after: parent,
      });
    }

    // Re-linking a previously unlinked parent re-activates the same row (unique parentId+studentId)
    const link = await tx.parentStudent.upsert({
      where: { parentId_studentId: { parentId: parent.id, studentId } },
      create: {
        parentId: parent.id,
        studentId,
        relation: input.relation,
        createdById: admin.id,
      },
      update: { revokedAt: null, relation: input.relation },
    });
    await this.auditService.log(tx, {
      actor: admin,
      action: AuditAction.PARENT_LINK,
      entityType: 'ParentStudent',
      entityId: link.id,
      after: link,
    });

    return this.slip(parent, isNew ? password.plain : null, isNew);
  }

  // ─────────────────── reset password, block ───────────────────

  /**
   * New temporary password (3 sign-ins / 14 days). Every session is revoked: changing only the
   * password would leave a thief who is already signed in with a working refresh token.
   */
  public async resetPassword(
    admin: AuthUser,
    userId: string,
  ): Promise<LoginSlip> {
    const target = await this.findManagedUser(userId);
    const password = await this.preparePassword(
      target.role === 'PARENT'
        ? generateParentPassword()
        : generateStudentPassword(),
      await this.tempPasswordRule(),
    );

    const user = await this.prismaService.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: password.data,
      });
      await this.authService.revokeAllSessions(userId, tx);
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.USER_RESET_PASSWORD,
        entityType: 'User',
        entityId: userId,
        // The hash is redacted to "***" in the audit row
        before: { mustChangePassword: target.mustChangePassword },
        after: { tempPasswordUsesLeft: password.data.tempPasswordUsesLeft },
      });
      return updated;
    });
    // A user locked out by 5 wrong passwords can sign in again right away
    await this.authService.clearLoginFailures(user.loginId);

    return this.slip(user, password.plain, false);
  }

  /** Blocked users cannot sign in or refresh; all their sessions end now */
  public async blockUser(admin: AuthUser, userId: string): Promise<boolean> {
    if (userId === admin.id) {
      // Otherwise the last admin could lock everyone out
      throw this.forbidden('You cannot block yourself');
    }
    return this.setStatus(admin, userId, 'BLOCKED', AuditAction.USER_BLOCK);
  }

  public async unblockUser(admin: AuthUser, userId: string): Promise<boolean> {
    return this.setStatus(admin, userId, 'ACTIVE', AuditAction.USER_UNBLOCK);
  }

  private async setStatus(
    admin: AuthUser,
    userId: string,
    status: 'ACTIVE' | 'BLOCKED',
    action: AuditAction,
  ): Promise<boolean> {
    const target = await this.findManagedUser(userId);
    if (target.status === status) return true; // nothing to change

    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status } });
      if (status === 'BLOCKED') {
        await this.authService.revokeAllSessions(userId, tx);
      }
      await this.auditService.log(tx, {
        actor: admin,
        action,
        entityType: 'User',
        entityId: userId,
        before: { status: target.status },
        after: { status },
      });
    });
    return true;
  }

  /** Students, teachers and parents can be managed here; other admins cannot */
  private async findManagedUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw this.notFound('User not found');
    if (user.role === 'ADMIN') {
      throw this.forbidden('Admin accounts cannot be changed here');
    }
    return user;
  }

  // ───────────────────────── lists ─────────────────────────

  /** Admin Users page: one role per tab, filters, paging (Nestar "Inquiry" style) */
  public async getUsers(input: UsersInquiry): Promise<Users> {
    const now = new Date();
    const { role, status, groupId, groupIds, passwordState, text } =
      input.search;

    // Every filter is its own AND item (CLAUDE.md): later a role scope is added the same way,
    // and a client filter can never overwrite it the way `{ ...scope, ...filters }` could
    const where: Prisma.UserWhereInput = {
      AND: [
        { role },
        status ? { status } : {},
        groupId
          ? { groupMemberships: { some: { groupId, leftAt: null } } }
          : {},
        groupIds?.length
          ? {
              groupMemberships: {
                some: { groupId: { in: groupIds }, leftAt: null },
              },
            }
          : {},
        passwordState ? passwordStateWhere(passwordState, now) : {},
        text ? textWhere(text) : {},
      ],
    };

    const [total, users] = await this.prismaService.$transaction([
      this.prismaService.user.count({ where }),
      this.prismaService.user.findMany({
        where,
        // id as a tie-breaker: rows with the same name never jump between pages
        orderBy: [
          { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC },
          { id: 'asc' },
        ],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        // Admin view: the temp-password fields are needed for the "Password" column
        omit: { tempPasswordUsesLeft: false, tempPasswordExpiresAt: false },
        include: {
          teacherProfile: { select: { title: true } },
          parentProfile: { select: { phone: true } },
          groupMemberships: {
            where: { leftAt: null },
            select: { group: { select: { name: true } } },
          },
          parents: {
            where: { revokedAt: null },
            select: { relation: true, parent: { select: LINKED_USER } },
          },
          children: {
            where: { revokedAt: null },
            select: { relation: true, student: { select: LINKED_USER } },
          },
          refreshTokens: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
    ]);

    const list: UserListItem[] = users.map((u) => ({
      id: u.id,
      loginId: u.loginId,
      role: u.role,
      status: u.status,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt,
      passwordState: passwordStateOf(u, now),
      tempPasswordUsesLeft:
        passwordStateOf(u, now) === PasswordState.TEMPORARY
          ? u.tempPasswordUsesLeft
          : null,
      lastActiveAt: u.refreshTokens[0]?.createdAt ?? null,
      className: u.groupMemberships[0]?.group.name ?? null,
      title: u.teacherProfile?.title ?? null,
      phone: u.parentProfile?.phone ?? null,
      links: [
        ...u.parents.map((l) => linked(l.parent, l.relation)),
        ...u.children.map((l) => linked(l.student, l.relation)),
      ],
    }));

    return { list, metaCounter: { total } };
  }

  // ───────────────────────── helpers ─────────────────────────

  /** The school's rule for NEW temporary passwords (Settings → Accounts); read once per action */
  public async tempPasswordRule(): Promise<TempPasswordRule> {
    const settings = await this.schoolService.getSettings();
    return { uses: settings.tempPasswordUses, days: settings.tempPasswordDays };
  }

  public async preparePassword(
    plain: string,
    rule: TempPasswordRule,
  ): Promise<PreparedPassword> {
    return {
      plain,
      data: {
        passwordHash: await bcrypt.hash(plain, 10),
        tempPasswordUsesLeft: rule.uses,
        tempPasswordExpiresAt: new Date(
          Date.now() + rule.days * 24 * 60 * 60 * 1000,
        ),
        mustChangePassword: false,
      },
    };
  }

  private slip(
    user: {
      id: string;
      loginId: string;
      role: LoginSlip['role'];
      firstName: string;
      lastName: string;
    },
    tempPassword: string | null,
    isNew: boolean,
  ): LoginSlip {
    return {
      userId: user.id,
      loginId: user.loginId,
      role: user.role,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      tempPassword,
      isNew,
    };
  }

  private notFound(message: string) {
    return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
  }

  private forbidden(message: string) {
    return new ForbiddenException({ code: ErrorCode.FORBIDDEN, message });
  }
}

// ───────────────────────── list helpers ─────────────────────────

const LINKED_USER = {
  id: true,
  loginId: true,
  firstName: true,
  lastName: true,
} as const;

function linked(
  user: { id: string; loginId: string; firstName: string; lastName: string },
  relation: UserListItem['links'][number]['relation'],
) {
  return {
    id: user.id,
    loginId: user.loginId,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    relation,
  };
}

/** Plain-text search: name, login ID, parent phone. `contains` is a parameter, never a regex */
function textWhere(text: string): Prisma.UserWhereInput {
  const term = text.trim();
  const digits = term.replace(/\D/g, '');
  return {
    OR: [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { loginId: { startsWith: term } },
      ...(digits.length >= 3
        ? [{ parentProfile: { phone: { contains: digits } } }]
        : []),
    ],
  };
}

/** The same rules as login (DECISIONS §6), so the list shows what will happen at the next sign-in */
function passwordStateOf(
  user: {
    mustChangePassword: boolean;
    tempPasswordUsesLeft: number | null;
    tempPasswordExpiresAt: Date | null;
  },
  now: Date,
): PasswordState {
  if (user.mustChangePassword) return PasswordState.MUST_CHANGE;
  if (user.tempPasswordUsesLeft === null) return PasswordState.SET;
  const isOver =
    user.tempPasswordUsesLeft <= 0 ||
    !user.tempPasswordExpiresAt ||
    user.tempPasswordExpiresAt <= now;
  return isOver ? PasswordState.EXPIRED : PasswordState.TEMPORARY;
}

function passwordStateWhere(
  state: PasswordState,
  now: Date,
): Prisma.UserWhereInput {
  switch (state) {
    case PasswordState.MUST_CHANGE:
      return { mustChangePassword: true };
    case PasswordState.SET:
      return { mustChangePassword: false, tempPasswordUsesLeft: null };
    case PasswordState.TEMPORARY:
      return {
        mustChangePassword: false,
        tempPasswordUsesLeft: { gt: 0 },
        tempPasswordExpiresAt: { gt: now },
      };
    case PasswordState.EXPIRED:
      return {
        mustChangePassword: false,
        tempPasswordUsesLeft: { not: null },
        OR: [
          { tempPasswordUsesLeft: { lte: 0 } },
          { tempPasswordExpiresAt: { lte: now } },
        ],
      };
  }
}
