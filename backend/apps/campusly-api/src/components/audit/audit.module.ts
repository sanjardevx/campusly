import { Global, Module } from '@nestjs/common';
import { AuditResolver } from './audit.resolver';
import { AuditService } from './audit.service';

// Global: every feature module writes audit rows without importing this module
@Global()
@Module({
  providers: [AuditService, AuditResolver],
  exports: [AuditService],
})
export class AuditModule {}
