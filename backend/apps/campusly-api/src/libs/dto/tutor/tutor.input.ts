import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { TUTOR_QUESTION_MAX } from '../../config';
import { TutorAction } from '../../enums/tutor.enum';

/**
 * Body of POST /tutor/chat (REST, because the answer streams back as Server-Sent Events).
 * A new conversation names the course and, optionally, one lesson or assignment; later requests
 * name only the conversation (its course and topic come from the DB, not from the client).
 */
export class TutorChatInput {
  @IsEnum(TutorAction)
  action: TutorAction;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  /** ASK only: the question */
  @IsOptional()
  @IsString()
  @Length(1, TUTOR_QUESTION_MAX)
  text?: string;
}
