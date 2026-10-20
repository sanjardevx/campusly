import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import { Group } from '../../libs/dto/group/group';
import {
  CreateGroupInput,
  MoveStudentInput,
  UpdateGroupInput,
} from '../../libs/dto/group/group.input';
import type { AuthUser } from '../../libs/types/auth';
import { AuditService } from '../audit/audit.service';
import { EnrollmentService } from './enrollment.service';

const WITH_COUNT = {
  _count: { select: { members: { where: { leftAt: null } } } },
} as const;

/** Classes (9A, 10B, ...) of an academic year and who is in them. Admin only. */
@Injectable()
export class GroupService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  /** Classes of one year (default: the current year), sorted by name */
  public async getGroups(academicYearId?: string): Promise<Group[]> {
    const yearId = academicYearId ?? (await this.currentYearId());
    const groups = await this.prismaService.group.findMany({
      where: { academicYearId: yearId },
      orderBy: { name: 'asc' },
      include: WITH_COUNT,
    });
    return groups.map(toGroup);
  }

  public async createGroup(
    admin: AuthUser,
    input: CreateGroupInput,
  ): Promise<Group> {
    const year = await this.prismaService.academicYear.count({
      where: { id: input.academicYearId },
    });
    if (!year) throw notFound('Academic year not found');

    // "9A" twice in one year → unique index → CONFLICT
    return this.prismaService.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          academicYearId: input.academicYearId,
          name: input.name.toUpperCase(),
        },
        include: WITH_COUNT,
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.GROUP_CREATE,
        entityType: 'Group',
        entityId: group.id,
        after: { name: group.name, academicYearId: group.academicYearId },
      });
      return toGroup(group);
    });
  }

  public async updateGroup(
    admin: AuthUser,
    input: UpdateGroupInput,
  ): Promise<Group> {
    const before = await this.prismaService.group.findUnique({
      where: { id: input.id },
      include: WITH_COUNT,
    });
    if (!before) throw notFound('Class not found');
    if (input.status === 'ARCHIVED' && before._count.members > 0) {
      throw badRequest('Move the students to another class first');
    }

    return this.prismaService.$transaction(async (tx) => {
      const group = await tx.group.update({
        where: { id: input.id },
        data: {
          name: input.name?.toUpperCase(),
          status: input.status,
        },
        include: WITH_COUNT,
      });
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.GROUP_UPDATE,
        entityType: 'Group',
        entityId: group.id,
        before: { name: before.name, status: before.status },
        after: { name: group.name, status: group.status },
      });
      return toGroup(group);
    });
  }

  /**
   * Moves a student to another class of the same year: the old class (and its courses) is left,
   * the new class and its whole-class courses are joined — all in one transaction.
   */
  public async moveStudent(
    admin: AuthUser,
    input: MoveStudentInput,
  ): Promise<Group> {
    const student = await this.prismaService.user.count({
      where: { id: input.studentId, role: 'STUDENT' },
    });
    if (!student) throw notFound('Student not found');
    const target = await this.prismaService.group.findUnique({
      where: { id: input.groupId },
    });
    if (!target || target.status !== 'ACTIVE') {
      throw notFound('Class not found');
    }

    await this.prismaService.$transaction(async (tx) => {
      const now = new Date();
      const current = await tx.groupMember.findMany({
        where: {
          studentId: input.studentId,
          leftAt: null,
          group: { academicYearId: target.academicYearId },
        },
        select: { groupId: true },
      });
      const from = current.map((m) => m.groupId);
      if (from.includes(target.id)) {
        throw badRequest('The student is already in this class');
      }

      for (const groupId of from) {
        await this.enrollmentService.leaveClass(
          tx,
          input.studentId,
          groupId,
          now,
        );
      }
      await this.enrollmentService.joinClass(
        tx,
        input.studentId,
        target.id,
        now,
      );
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.STUDENT_MOVE,
        entityType: 'User',
        entityId: input.studentId,
        before: { groupIds: from },
        after: { groupId: target.id },
      });
    });

    const group = await this.prismaService.group.findUniqueOrThrow({
      where: { id: target.id },
      include: WITH_COUNT,
    });
    return toGroup(group);
  }

  private async currentYearId(): Promise<string> {
    const year = await this.prismaService.academicYear.findFirst({
      where: { isCurrent: true },
      select: { id: true },
    });
    if (!year) throw badRequest('Set the current academic year first');
    return year.id;
  }
}

function toGroup(group: {
  id: string;
  academicYearId: string;
  name: string;
  status: Group['status'];
  _count: { members: number };
}): Group {
  return {
    id: group.id,
    academicYearId: group.academicYearId,
    name: group.name,
    status: group.status,
    studentCount: group._count.members,
  };
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
