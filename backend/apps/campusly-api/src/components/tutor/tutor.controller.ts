import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TutorChatInput } from '../../libs/dto/tutor/tutor.input';
import { Role } from '../../libs/enums/user.enum';
import type { AuthUser } from '../../libs/types/auth';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { type TutorEvent, TutorService } from './tutor.service';

/**
 * The tutor's answer as Server-Sent Events, so the student sees it being written.
 * GraphQL here has no streaming (no subscriptions server), and EventSource cannot send the
 * Authorization header, so the browser POSTs with fetch and reads the stream:
 *   event: meta  → the saved question, conversation id and help level
 *   event: delta → the next piece of the answer
 *   event: done  → the saved answer, its sources, today's count
 *   event: error → { code } (the request was not counted)
 * Checks that fail (limits, quiz open, wrong course) answer with a normal HTTP error first.
 */
@Controller('tutor')
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Roles(Role.STUDENT)
  @Post('chat')
  public async chat(
    @CurrentUser() user: AuthUser,
    @Body() input: TutorChatInput,
    @Res() res: Response,
  ): Promise<void> {
    const chat = await this.tutorService.prepareChat(user, input);

    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Proxies must pass each piece on at once, not collect the whole answer
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    // The student closed the page or lost the network: stop the model (and the cost)
    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abort.abort();
    });
    const emit = (event: TutorEvent, data: object) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };
    await this.tutorService.runChat(chat, emit, abort.signal);
    res.end();
  }
}
