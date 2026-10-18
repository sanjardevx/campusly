import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

// Every feature module is registered here (same as Nestar's ComponentsModule)
@Module({
  imports: [AuthModule, UserModule],
})
export class ComponentsModule {}
