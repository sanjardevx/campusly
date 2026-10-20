import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { MediaAsset, UploadTicket } from '../../libs/dto/media/media';
import { CreateUploadInput } from '../../libs/dto/media/media.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { MediaService } from './media.service';

// Course files: the course's teachers (AccessPolicy) and admins.
// Student submission files come with assignments (day 7).
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
}
