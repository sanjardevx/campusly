import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  Announcement,
  Announcements,
} from '../../libs/dto/announcement/announcement';
import {
  AnnouncementsInquiry,
  CreateAnnouncementInput,
  CreateCourseAnnouncementsInput,
  UpdateAnnouncementInput,
} from '../../libs/dto/announcement/announcement.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { AnnouncementService } from './announcement.service';

@Resolver()
export class AnnouncementResolver {
  constructor(private readonly announcementService: AnnouncementService) {}

  /** Every role: school-wide plus the viewer's courses */
  @Query(() => Announcements)
  public announcements(
    @CurrentUser() user: AuthUser,
    @Args('input', { nullable: true }) input?: AnnouncementsInquiry,
  ): Promise<Announcements> {
    return this.announcementService.getAnnouncements(user, input);
  }

  @Mutation(() => Announcement)
  public markAnnouncementRead(
    @CurrentUser() user: AuthUser,
    @Args('id', ParseUUIDPipe) id: string,
  ): Promise<Announcement> {
    return this.announcementService.markAnnouncementRead(user, id);
  }

  /** Every role: only what the viewer may see (scope from the DB, no IDs from the client) */
  @Mutation(() => Int)
  public markAllAnnouncementsRead(
    @CurrentUser() user: AuthUser,
  ): Promise<number> {
    return this.announcementService.markAllAnnouncementsRead(user);
  }

  /** School-wide: admins. A course: its teachers (checked in the service). */
  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => Announcement)
  public createAnnouncement(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateAnnouncementInput,
  ): Promise<Announcement> {
    return this.announcementService.createAnnouncement(user, input);
  }

  /** The teacher's drawer: one announcement per chosen course (each course checked) */
  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => [Announcement])
  public createCourseAnnouncements(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateCourseAnnouncementsInput,
  ): Promise<Announcement[]> {
    return this.announcementService.createCourseAnnouncements(user, input);
  }

  /** Taken down for everyone; the row stays and the change is audited */
  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => Announcement)
  public archiveAnnouncement(
    @CurrentUser() user: AuthUser,
    @Args('id', ParseUUIDPipe) id: string,
  ): Promise<Announcement> {
    return this.announcementService.archiveAnnouncement(user, id);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => Announcement)
  public updateAnnouncement(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateAnnouncementInput,
  ): Promise<Announcement> {
    return this.announcementService.updateAnnouncement(user, input);
  }
}
