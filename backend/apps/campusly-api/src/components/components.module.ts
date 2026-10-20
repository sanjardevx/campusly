import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';
import { SchoolModule } from './school/school.module';
import { UserModule } from './user/user.module';

// Every feature module is registered here (same as Nestar's ComponentsModule)
@Module({
  imports: [AuditModule, AuthModule, GroupModule, SchoolModule, UserModule],
})
export class ComponentsModule {}
