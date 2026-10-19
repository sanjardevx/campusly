import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

// Global: every feature module writes audit rows without importing this module
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
