import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';

// Every feature module is registered here (same as Nestar's ComponentsModule)
@Module({
  imports: [AuthModule],
})
export class ComponentsModule {}
