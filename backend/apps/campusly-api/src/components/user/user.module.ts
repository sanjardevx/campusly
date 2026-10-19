import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoginIdService } from './login-id.service';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

@Module({
  imports: [AuthModule],
  providers: [UserResolver, UserService, LoginIdService],
  exports: [UserService, LoginIdService],
})
export class UserModule {}
