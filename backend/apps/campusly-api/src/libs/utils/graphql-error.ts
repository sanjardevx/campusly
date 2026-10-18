import { HttpException, Logger } from '@nestjs/common';
import type { GraphQLFormattedError } from 'graphql';
import { ErrorCode } from '../enums/common.enum';
import { HttpErrorBody } from '../types/common';

const logger = new Logger('GraphQL');

/** Code for an HttpException that has no `code` in its body, e.g. `new NotFoundException()` */
const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHENTICATED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  429: ErrorCode.RATE_LIMITED,
};

/**
 * Shapes every GraphQL error the client receives: a readable message + a stable CODE.
 * Nestar sent only English text (the frontend compared strings), which breaks in 4 languages.
 *
 * `error` is the GraphQLError; the exception our code threw (guard, pipe or service) is in
 * `error.originalError`. Apollo does NOT copy a Nest HttpException body into `extensions`,
 * so the code is read from the exception itself.
 */
export function formatGraphqlError(
  formatted: GraphQLFormattedError,
  error: unknown,
  isProduction: boolean,
): GraphQLFormattedError {
  const thrown = (error as { originalError?: unknown } | undefined)
    ?.originalError;

  let code: string;
  let message = formatted.message;
  if (thrown instanceof HttpException) {
    const body = thrown.getResponse();
    const { code: bodyCode, message: bodyMessage } = (
      typeof body === 'object' ? body : { message: body }
    ) as HttpErrorBody;
    code =
      bodyCode ?? CODE_BY_STATUS[thrown.getStatus()] ?? ErrorCode.BAD_REQUEST;
    if (bodyMessage) {
      // ValidationPipe returns a list of messages
      message = Array.isArray(bodyMessage)
        ? bodyMessage.join(', ')
        : bodyMessage;
    }
  } else {
    // GraphQL's own errors keep their code (e.g. GRAPHQL_VALIDATION_FAILED); anything else is a bug
    code =
      (formatted.extensions?.code as string | undefined) ??
      ErrorCode.INTERNAL_SERVER_ERROR;
  }
  const isInternal = code === (ErrorCode.INTERNAL_SERVER_ERROR as string);

  // Server log (Nestar used console.log): unexpected errors keep the stack, expected ones are one line
  const path = formatted.path?.join('.') ?? '-';
  if (isInternal) logger.error(`${path}: ${message}`, stackOf(thrown ?? error));
  else logger.warn(`${path}: ${code} - ${message}`);

  // Never leak internal details (stack, SQL) to the client in production
  return {
    message: isProduction && isInternal ? 'Internal server error' : message,
    extensions: { code },
  };
}

function stackOf(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
