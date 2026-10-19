import { ParseUUIDPipe } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  AcademicYear,
  Period,
  SchoolSettings,
} from '../../libs/dto/school/school';
import {
  CreateAcademicYearInput,
  CreatePeriodInput,
  UpdateAcademicYearInput,
  UpdatePeriodInput,
  UpdateSchoolSettingsInput,
} from '../../libs/dto/school/school.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Public, Roles } from '../auth/decorators/auth.decorators';
import { SchoolService } from './school.service';

// Reading is open (settings: to everyone, years/periods: to every signed-in user);
// every change is admin-only and audited.
@Resolver()
export class SchoolResolver {
  constructor(private readonly schoolService: SchoolService) {}

  // ───────────────────────── settings ─────────────────────────

  /** Public: the logged-out landing page shows the school name */
  @Public()
  @Query(() => SchoolSettings)
  public schoolSettings(): Promise<SchoolSettings> {
    return this.schoolService.getSettings();
  }

  @Roles(Role.ADMIN)
  @Mutation(() => SchoolSettings)
  public updateSchoolSettings(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: UpdateSchoolSettingsInput,
  ): Promise<SchoolSettings> {
    return this.schoolService.updateSettings(admin, input);
  }

  // ─────────────────────── academic years ───────────────────────

  @Query(() => [AcademicYear])
  public academicYears(): Promise<AcademicYear[]> {
    return this.schoolService.getAcademicYears();
  }

  @Query(() => AcademicYear, { nullable: true })
  public currentAcademicYear(): Promise<AcademicYear | null> {
    return this.schoolService.getCurrentAcademicYear();
  }

  @Roles(Role.ADMIN)
  @Mutation(() => AcademicYear)
  public createAcademicYear(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: CreateAcademicYearInput,
  ): Promise<AcademicYear> {
    return this.schoolService.createAcademicYear(admin, input);
  }

  @Roles(Role.ADMIN)
  @Mutation(() => AcademicYear)
  public updateAcademicYear(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: UpdateAcademicYearInput,
  ): Promise<AcademicYear> {
    return this.schoolService.updateAcademicYear(admin, input);
  }

  @Roles(Role.ADMIN)
  @Mutation(() => AcademicYear)
  public setCurrentAcademicYear(
    @CurrentUser() admin: AuthUser,
    @Args('id', ParseUUIDPipe) id: string,
  ): Promise<AcademicYear> {
    return this.schoolService.setCurrentAcademicYear(admin, id);
  }

  // ───────────────────────── periods ─────────────────────────

  @Query(() => [Period])
  public periods(
    @Args('academicYearId', ParseUUIDPipe) academicYearId: string,
  ): Promise<Period[]> {
    return this.schoolService.getPeriods(academicYearId);
  }

  @Roles(Role.ADMIN)
  @Mutation(() => Period)
  public createPeriod(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: CreatePeriodInput,
  ): Promise<Period> {
    return this.schoolService.createPeriod(admin, input);
  }

  @Roles(Role.ADMIN)
  @Mutation(() => Period)
  public updatePeriod(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: UpdatePeriodInput,
  ): Promise<Period> {
    return this.schoolService.updatePeriod(admin, input);
  }
}
