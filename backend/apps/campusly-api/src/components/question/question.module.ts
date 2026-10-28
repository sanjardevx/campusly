import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuestionResolver } from './question.resolver';
import { QuestionService } from './question.service';

@Module({
  imports: [AuthModule],
  providers: [QuestionResolver, QuestionService],
})
export class QuestionModule {}
