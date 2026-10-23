import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GradeCategory } from '../../libs/dto/course/course';
import { SetGradeCategoriesInput } from '../../libs/dto/grade/grade.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AuditService } from '../audit/audit.service';
import { AccessPolicy } from '../auth/policies/access.policy';

/**
 * The gradebook's "Category weights" modal (DECISIONS §10): each course has its own weights,
 * starting from the school default. A category is never deleted (assignments point to it);
 * weight 0 switches it off.
 */
@Injectable()
export class GradeCategoryService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly auditService: AuditService,
  ) {}

  public async setGradeCategories(
    user: AuthUser,
    input: SetGradeCategoriesInput,
  ): Promise<GradeCategory[]> {
    await this.accessPolicy.assertCanEditCourse(user, input.courseId);
    const before = await this.prismaService.gradeCategory.findMany({
      where: { courseId: input.courseId },
      orderBy: { order: 'asc' },
    });

    // Ids from the client: each must be this course's; none may be left out
    const known = new Set(before.map((c) => c.id));
    const sent = input.categories.filter((c) => c.id).map((c) => c.id!);
    if (sent.some((id) => !known.has(id))) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Grade category not found in this course',
      });
    }
    if (new Set(sent).size !== sent.length || sent.length !== known.size) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        message: 'Send every category of the course exactly once',
      });
    }
    const names = input.categories.map((c) => c.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      throw new BadRequestException({
        code: ErrorCode.CATEGORY_NAME_TAKEN,
        message: 'Two categories have the same name',
      });
    }
    const total = input.categories.reduce((sum, c) => sum + c.weight, 0);
    if (total !== 100) {
      throw new BadRequestException({
        code: ErrorCode.WEIGHTS_SUM,
        message: `Category weights must add up to 100 (now ${total})`,
      });
    }

    const after = await this.prismaService.$transaction(async (tx) => {
      for (const [order, c] of input.categories.entries()) {
        const data = { name: c.name.trim(), weight: c.weight, order };
        if (c.id) await tx.gradeCategory.update({ where: { id: c.id }, data });
        else
          await tx.gradeCategory.create({
            data: { courseId: input.courseId, ...data },
          });
      }
      const rows = await tx.gradeCategory.findMany({
        where: { courseId: input.courseId },
        orderBy: { order: 'asc' },
      });
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.COURSE_GRADE_CATEGORIES,
        entityType: 'Course',
        entityId: input.courseId,
        before: before.map(({ name, weight }) => ({ name, weight })),
        after: rows.map(({ name, weight }) => ({ name, weight })),
      });
      return rows;
    });
    return after.map(({ id, name, weight, order }) => ({
      id,
      name,
      weight,
      order,
    }));
  }
}
