import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { CourseStatus } from '../../enums/course.enum';

@InputType()
export class CreateCourseInput {
  /** The class (its academic year becomes the course's year) */
  @Field(() => String)
  @IsUUID()
  groupId: string;

  @Field(() => String)
  @IsUUID()
  subjectId: string;

  /** Default: "<subject> · <class>", e.g. "Algebra · 9A" */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  title?: string;

  /** Only for a course that runs in one semester / quarter */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  periodId?: string;

  /** The first teacher is the OWNER, the others are ASSISTANTs */
  @Field(() => [String])
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  teacherIds: string[];

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isSplitGroup?: boolean;

  /** Split group only: students of the class picked by hand */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(60)
  @ArrayUnique()
  studentIds?: string[];
}

/** Only the given fields change. Class, subject and "split group" are fixed after creation. */
@InputType()
export class UpdateCourseInput {
  @Field(() => String)
  @IsUUID()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  title?: string;

  /** DRAFT → ACTIVE makes the course visible to its students and parents */
  @Field(() => CourseStatus, { nullable: true })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  periodId?: string;
}

@InputType()
export class SetCourseTeachersInput {
  @Field(() => String)
  @IsUUID()
  courseId: string;

  /** Replaces the list. The first teacher is the OWNER. */
  @Field(() => [String])
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  teacherIds: string[];
}

@InputType()
export class SetCourseStudentsInput {
  @Field(() => String)
  @IsUUID()
  courseId: string;

  /** Replaces the list of a split-group course; everyone must be in the course's class */
  @Field(() => [String])
  @IsUUID('all', { each: true })
  @ArrayMaxSize(60)
  @ArrayUnique()
  studentIds: string[];
}

/** Admin course list. Default year: the current one. */
@InputType()
export class CoursesFilter {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @Field(() => CourseStatus, { nullable: true })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
