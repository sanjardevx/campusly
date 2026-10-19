import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoginIdService } from './login-id.service';
import { StudentImportService } from './student-import.service';
import { UserAdminResolver } from './user-admin.resolver';
import { UserAdminService } from './user-admin.service';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

@Module({
  imports: [AuthModule],
  providers: [
    UserResolver,
    UserService,
    UserAdminResolver,
    UserAdminService,
    StudentImportService,
    LoginIdService,
  ],
  exports: [UserService, LoginIdService],
})
export class UserModule {}
