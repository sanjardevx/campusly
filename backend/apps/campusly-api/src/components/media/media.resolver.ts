import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  FileLink,
  LessonVideo,
  MediaAsset,
  UploadTicket,
} from '../../libs/dto/media/media';
import {
  CreateSubmissionUploadInput,
  CreateUploadInput,
} from '../../libs/dto/media/media.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { MediaService } from './media.service';

// Course files: the course's teachers (AccessPolicy) and admins. Submission files: students of
// the course. Watching a lesson video: every role, decided by AccessPolicy.
@Roles(Role.ADMIN, Role.TEACHER)
@Resolver()
export class MediaResolver {
  constructor(private readonly mediaService: MediaService) {}

  @Mutation(() => UploadTicket)
  public createUpload(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateUploadInput,
  ): Promise<UploadTicket> {
    return this.mediaService.createUpload(user, input);
  }

  @Roles(Role.STUDENT)
  @Mutation(() => UploadTicket)
  public createSubmissionUpload(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateSubmissionUploadInput,
  ): Promise<UploadTicket> {
    return this.mediaService.createSubmissionUpload(user, input);
  }

  /** Only the uploader can confirm (others get NOT_FOUND) */
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @Mutation(() => MediaAsset)
  public confirmUpload(
    @CurrentUser() user: AuthUser,
    @Args('assetId', ParseUUIDPipe) assetId: string,
  ): Promise<MediaAsset> {
    return this.mediaService.confirmUpload(user, assetId);
  }

  /** A lesson file or assignment attachment: every role, AccessPolicy decides (others: NOT_FOUND) */
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @Query(() => FileLink)
  public courseFileUrl(
    @CurrentUser() user: AuthUser,
    @Args('assetId', ParseUUIDPipe) assetId: string,
  ): Promise<FileLink> {
    return this.mediaService.getCourseFileUrl(user, assetId);
  }

  /** Every role: AccessPolicy decides (not related or not published → NOT_FOUND) */
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @Query(() => LessonVideo)
  public lessonVideo(
    @CurrentUser() user: AuthUser,
    @Args('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<LessonVideo> {
    return this.mediaService.getLessonVideo(user, lessonId);
  }
}
