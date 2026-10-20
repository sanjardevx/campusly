import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProgressResolver } from './progress.resolver';
import { ProgressService } from './progress.service';

@Module({
  imports: [AuthModule],
  providers: [ProgressResolver, ProgressService],
})
export class ProgressModule {}
