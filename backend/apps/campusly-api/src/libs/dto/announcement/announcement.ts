import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Role } from '../../enums/user.enum';
import { CourseFile } from '../media/media';

@ObjectType()
export class Announcement {
  @Field(() => String)
  id: string;

  /** null = school-wide */
  @Field(() => String, { nullable: true })
  courseId: string | null;

  /** e.g. "Algebra · 9A"; null for school-wide */
  @Field(() => String, { nullable: true })
  courseTitle: string | null;

  @Field(() => String)
  authorName: string;

  @Field(() => Role)
  authorRole: Role;

  @Field(() => String)
  title: string;

  @Field(() => String)
  body: string;

  @Field(() => Boolean)
  isPinned: boolean;

  /** "YYYY-MM-DD" shown on the calendar */
  @Field(() => String, { nullable: true })
  eventDate: string | null;

  @Field(() => Date)
  publishedAt: Date;

  /** Has the viewer read it */
  @Field(() => Boolean)
  isRead: boolean;

  /** Read receipts for teachers and admins; null for students and parents */
  @Field(() => Int, { nullable: true })
  readCount: number | null;

  /** Staff only: the course's active students, and how many of them opened it ("52 / 56 read") */
  @Field(() => Int, { nullable: true })
  audience: number | null;

  @Field(() => Int, { nullable: true })
  studentReads: number | null;

  /** Attachments, in order; the link comes from `courseFileUrl` */
  @Field(() => [CourseFile])
  files: CourseFile[];
}

@ObjectType()
export class Announcements {
  @Field(() => [Announcement])
  list: Announcement[];

  @Field(() => Int)
  total: number;

  /** Not read by the viewer, in the whole list (not only this page) */
  @Field(() => Int)
  unread: number;
}
