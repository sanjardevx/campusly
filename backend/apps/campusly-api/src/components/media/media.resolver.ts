import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  LessonVideo,
  MediaAsset,
  UploadTicket,
} from '../../libs/dto/media/media';
import { CreateUploadInput } from '../../libs/dto/media/media.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { MediaService } from './media.service';

// Uploads: the course's teachers (AccessPolicy) and admins; student submission files come with
// assignments (day 7). Watching a lesson video: every role, decided by AccessPolicy.
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

  @Mutation(() => MediaAsset)
  public confirmUpload(
    @CurrentUser() user: AuthUser,
    @Args('assetId', ParseUUIDPipe) assetId: string,
  ): Promise<MediaAsset> {
    return this.mediaService.confirmUpload(user, assetId);
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
