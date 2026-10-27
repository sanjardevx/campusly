import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  EnquiryList,
  EnquiryRow,
  SiteHonorStudentAdmin,
  SiteMockTestAdmin,
  SiteOpenCourseAdmin,
  SitePersonAdmin,
  SitePostAdmin,
  SiteProgramAdmin,
  SiteTranslation,
} from '../../libs/dto/site/site';
import {
  EnquiriesInput,
  SaveSiteHonorStudentInput,
  SaveSiteMockTestInput,
  SaveSiteOpenCourseInput,
  SaveSitePersonInput,
  SaveSitePostInput,
  SaveSiteProgramInput,
  TranslateSiteTextInput,
} from '../../libs/dto/site/site.input';
import { EnquiryStatus } from '../../libs/enums/site.enum';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { EnquiryService } from './enquiry.service';
import { SiteHonorService } from './site-honor.service';
import { SiteMockTestService } from './site-mock-test.service';
import { SiteOpenCourseService } from './site-open-course.service';
import { SitePersonService } from './site-person.service';
import { SitePostService } from './site-post.service';
import { SiteProgramService } from './site-program.service';
import { SiteTranslateService } from './site-translate.service';

const Id = (name = 'id') => Args(name, { type: () => String }, ParseUUIDPipe);

/** The public website CMS and the enquiries inbox: admins only (DECISIONS §14) */
@Roles(Role.ADMIN)
@Resolver()
export class SiteAdminResolver {
  constructor(
    private readonly posts: SitePostService,
    private readonly programs: SiteProgramService,
    private readonly people: SitePersonService,
    private readonly mockTests: SiteMockTestService,
    private readonly openCourses: SiteOpenCourseService,
    private readonly honors: SiteHonorService,
    private readonly enquiries: EnquiryService,
    private readonly translator: SiteTranslateService,
  ) {}

  // ─────────────── News & Events ───────────────

  @Query(() => [SitePostAdmin])
  public adminSitePosts(): Promise<SitePostAdmin[]> {
    return this.posts.list();
  }

  @Mutation(() => SitePostAdmin)
  public saveSitePost(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: SaveSitePostInput,
  ): Promise<SitePostAdmin> {
    return this.posts.save(admin, input);
  }

  @Mutation(() => SitePostAdmin)
  public archiveSitePost(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
  ): Promise<SitePostAdmin> {
    return this.posts.archive(admin, id);
  }

  // ─────────────── Programs & clubs ───────────────

  @Query(() => [SiteProgramAdmin])
  public adminSitePrograms(): Promise<SiteProgramAdmin[]> {
    return this.programs.list();
  }

  @Mutation(() => SiteProgramAdmin)
  public saveSiteProgram(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: SaveSiteProgramInput,
  ): Promise<SiteProgramAdmin> {
    return this.programs.save(admin, input);
  }

  @Mutation(() => SiteProgramAdmin)
  public setSiteProgramVisible(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
    @Args('showOnSite', { type: () => Boolean }) showOnSite: boolean,
  ): Promise<SiteProgramAdmin> {
    return this.programs.setVisible(admin, id, showOnSite);
  }

  @Mutation(() => [SiteProgramAdmin])
  public reorderSitePrograms(
    @CurrentUser() admin: AuthUser,
    @Args('ids', { type: () => [String] }) ids: string[],
  ): Promise<SiteProgramAdmin[]> {
    return this.programs.reorder(admin, ids);
  }

  @Mutation(() => SiteProgramAdmin)
  public archiveSiteProgram(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
  ): Promise<SiteProgramAdmin> {
    return this.programs.archive(admin, id);
  }

  // ─────────────── Our team ───────────────

  @Query(() => [SitePersonAdmin])
  public adminSitePeople(): Promise<SitePersonAdmin[]> {
    return this.people.list();
  }

  @Mutation(() => SitePersonAdmin)
  public saveSitePerson(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: SaveSitePersonInput,
  ): Promise<SitePersonAdmin> {
    return this.people.save(admin, input);
  }

  @Mutation(() => SitePersonAdmin)
  public setSitePersonVisible(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
    @Args('showOnSite', { type: () => Boolean }) showOnSite: boolean,
  ): Promise<SitePersonAdmin> {
    return this.people.setVisible(admin, id, showOnSite);
  }

  @Mutation(() => [SitePersonAdmin])
  public reorderSitePeople(
    @CurrentUser() admin: AuthUser,
    @Args('ids', { type: () => [String] }) ids: string[],
  ): Promise<SitePersonAdmin[]> {
    return this.people.reorder(admin, ids);
  }

  @Mutation(() => SitePersonAdmin)
  public archiveSitePerson(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
  ): Promise<SitePersonAdmin> {
    return this.people.archive(admin, id);
  }

  // ─────────────── Mock tests ───────────────

  @Query(() => [SiteMockTestAdmin])
  public adminSiteMockTests(): Promise<SiteMockTestAdmin[]> {
    return this.mockTests.list();
  }

  @Mutation(() => SiteMockTestAdmin)
  public saveSiteMockTest(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: SaveSiteMockTestInput,
  ): Promise<SiteMockTestAdmin> {
    return this.mockTests.save(admin, input);
  }

  @Mutation(() => SiteMockTestAdmin)
  public setSiteMockTestSeats(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
    @Args('takenSeats', { type: () => Int }) takenSeats: number,
  ): Promise<SiteMockTestAdmin> {
    return this.mockTests.setTakenSeats(admin, id, takenSeats);
  }

  @Mutation(() => SiteMockTestAdmin)
  public setSiteMockTestVisible(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
    @Args('showOnSite', { type: () => Boolean }) showOnSite: boolean,
  ): Promise<SiteMockTestAdmin> {
    return this.mockTests.setVisible(admin, id, showOnSite);
  }

  @Mutation(() => SiteMockTestAdmin)
  public archiveSiteMockTest(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
  ): Promise<SiteMockTestAdmin> {
    return this.mockTests.archive(admin, id);
  }

  // ─────────────── Open Courses ───────────────

  @Query(() => [SiteOpenCourseAdmin])
  public adminSiteOpenCourses(): Promise<SiteOpenCourseAdmin[]> {
    return this.openCourses.list();
  }

  @Mutation(() => SiteOpenCourseAdmin)
  public saveSiteOpenCourse(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: SaveSiteOpenCourseInput,
  ): Promise<SiteOpenCourseAdmin> {
    return this.openCourses.save(admin, input);
  }

  @Mutation(() => SiteOpenCourseAdmin)
  public setSiteOpenCoursePublished(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
    @Args('published', { type: () => Boolean }) published: boolean,
  ): Promise<SiteOpenCourseAdmin> {
    return this.openCourses.setPublished(admin, id, published);
  }

  @Mutation(() => SiteOpenCourseAdmin)
  public archiveSiteOpenCourse(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
  ): Promise<SiteOpenCourseAdmin> {
    return this.openCourses.archive(admin, id);
  }

  // ─────────────── Honor Students ───────────────

  @Query(() => [SiteHonorStudentAdmin])
  public adminSiteHonorStudents(): Promise<SiteHonorStudentAdmin[]> {
    return this.honors.list();
  }

  @Mutation(() => SiteHonorStudentAdmin)
  public saveSiteHonorStudent(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: SaveSiteHonorStudentInput,
  ): Promise<SiteHonorStudentAdmin> {
    return this.honors.save(admin, input);
  }

  @Mutation(() => SiteHonorStudentAdmin)
  public setSiteHonorStudentVisible(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
    @Args('showOnSite', { type: () => Boolean }) showOnSite: boolean,
  ): Promise<SiteHonorStudentAdmin> {
    return this.honors.setVisible(admin, id, showOnSite);
  }

  @Mutation(() => [SiteHonorStudentAdmin])
  public reorderSiteHonorStudents(
    @CurrentUser() admin: AuthUser,
    @Args('ids', { type: () => [String] }) ids: string[],
  ): Promise<SiteHonorStudentAdmin[]> {
    return this.honors.reorder(admin, ids);
  }

  @Mutation(() => SiteHonorStudentAdmin)
  public archiveSiteHonorStudent(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
  ): Promise<SiteHonorStudentAdmin> {
    return this.honors.archive(admin, id);
  }

  // ─────────────── Enquiries ───────────────

  @Query(() => EnquiryList)
  public adminEnquiries(
    @Args('input') input: EnquiriesInput,
  ): Promise<EnquiryList> {
    return this.enquiries.list(input);
  }

  @Mutation(() => EnquiryRow)
  public setEnquiryStatus(
    @CurrentUser() admin: AuthUser,
    @Id() id: string,
    @Args('status', { type: () => EnquiryStatus }) status: EnquiryStatus,
  ): Promise<EnquiryRow> {
    return this.enquiries.setStatus(admin, id, status);
  }

  // ─────────────── Translate from English ───────────────

  /** Whether the drawers' "Translate from English" button works on this server */
  @Query(() => Boolean)
  public siteTranslateAvailable(): boolean {
    return this.translator.isEnabled;
  }

  @Mutation(() => [SiteTranslation])
  public translateSiteText(
    @Args('input') input: TranslateSiteTextInput,
  ): Promise<SiteTranslation[]> {
    return this.translator.translate(input.texts);
  }
}
