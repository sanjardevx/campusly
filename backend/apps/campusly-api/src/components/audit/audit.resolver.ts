import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuditLogs } from '../../libs/dto/audit/audit';
import { AuditLogsInquiry } from '../../libs/dto/audit/audit.input';
import { RecordExportInput } from '../../libs/dto/records/records.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { AuditService } from './audit.service';

@Resolver()
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  /** Activity log page: who changed what, newest first (read only) */
  @Roles(Role.ADMIN)
  @Query(() => AuditLogs)
  public auditLogs(@Args('input') input: AuditLogsInquiry): Promise<AuditLogs> {
    return this.auditService.getAuditLogs(input);
  }

  /**
   * Records page: every CSV download and print leaves a row ("who took which document, when").
   * The data was already read through the normal, policy-checked queries; this only logs it.
   */
  @Roles(Role.ADMIN)
  @Mutation(() => Boolean)
  public async logRecordExport(
    @CurrentUser() admin: AuthUser,
    @Args('input') input: RecordExportInput,
  ): Promise<boolean> {
    await this.auditService.logRecordExport(admin, input);
    return true;
  }
}
