import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TEMP_PASSWORD } from '../../libs/config';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import { CreateStudentResult, LoginSlip } from '../../libs/dto/user/user';
import {
  CreateStudentInput,
  CreateTeacherInput,
  ParentInput,
} from '../../libs/dto/user/user.input';
import type { AuthUser } from '../../libs/types/auth';
import { normalizeUzPhone, parentLoginId } from '../../libs/utils/phone';
import {
  generateParentPassword,
  generateStudentPassword,
} from '../../libs/utils/temp-password';
import { AuditService } from '../audit/audit.service';
import { LoginIdService } from './login-id.service';

type Tx = Prisma.TransactionClient;

/** A generated temporary password and the DB fields for it (hashed BEFORE the transaction) */
interface PreparedPassword {
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
@Injectable()
export class UserAdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly loginIdService: LoginIdService,
    private readonly auditService: AuditService,
  ) {}

  // ───────────────────────── students ─────────────────────────

  public async createStudent(
    admin: AuthUser,
    input: CreateStudentInput,
  ): Promise<CreateStudentResult> {
    // bcrypt takes ~70 ms: hash before the transaction, which holds the id_counters row lock
    const studentPassword = await this.preparePassword(
      generateStudentPassword(),
    );
    const parentPassword = input.parent
      ? await this.preparePassword(generateParentPassword())
      : null;

    return this.prismaService.$transaction(async (tx) => {
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
          groupMemberships: { create: { groupId: input.groupId } },
        },
      });

      // A whole-class course (e.g. "Algebra · 9A") includes every student of the class
      const courses = await tx.course.findMany({
        where: {
          groupId: input.groupId,
          isSplitGroup: false,
          status: { not: 'ARCHIVED' },
        },
        select: { id: true },
      });
      await tx.enrollment.createMany({
        data: courses.map((c) => ({ courseId: c.id, studentId: student.id })),
      });

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
    });
  }

  // ───────────────────────── teachers ─────────────────────────

  public async createTeacher(
    admin: AuthUser,
    input: CreateTeacherInput,
  ): Promise<LoginSlip> {
    const password = await this.preparePassword(generateStudentPassword());

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
    const password = await this.preparePassword(generateParentPassword());

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

  // ───────────────────────── helpers ─────────────────────────

  private async preparePassword(plain: string): Promise<PreparedPassword> {
    return {
      plain,
      data: {
        passwordHash: await bcrypt.hash(plain, 10),
        tempPasswordUsesLeft: TEMP_PASSWORD.uses,
        tempPasswordExpiresAt: new Date(
          Date.now() + TEMP_PASSWORD.days * 24 * 60 * 60 * 1000,
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
}
