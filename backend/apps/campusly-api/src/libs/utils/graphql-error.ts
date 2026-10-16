import { Logger } from '@nestjs/common';
import type { GraphQLFormattedError } from 'graphql';
import { ErrorCode } from '../enums/common.enum';
import { HttpErrorBody } from '../types/common';

const logger = new Logger('GraphQL');

// Shapes every GraphQL error the client receives: a readable message + a stable CODE.
// Nestar sent only English text (the frontend compared strings), which breaks in 4 languages.
export function formatGraphqlError(
  formatted: GraphQLFormattedError,
  error: unknown,
  isProduction: boolean,
): GraphQLFormattedError {
  const original = (formatted.extensions?.originalError ?? {}) as HttpErrorBody;
  const message = Array.isArray(original.message)
    ? original.message.join(', ') // ValidationPipe returns a list of messages
    : (original.message ?? formatted.message);
  const code: string =
    original.code ??
    (formatted.extensions?.code as string | undefined) ??
    ErrorCode.INTERNAL_SERVER_ERROR;
  const isInternal = code === (ErrorCode.INTERNAL_SERVER_ERROR as string);

  // Server log (Nestar used console.log): unexpected errors keep the stack, expected ones are one line
  const path = formatted.path?.join('.') ?? '-';
  if (isInternal) logger.error(`${path}: ${message}`, stackOf(error));
  else logger.warn(`${path}: ${code} - ${message}`);

  // Never leak internal details (stack, SQL) to the client in production
  return {
    message: isProduction && isInternal ? 'Internal server error' : message,
    extensions: { code },
  };
}

function stackOf(error: unknown): string | undefined {
  // Apollo passes a GraphQLError; the error our code threw is in `originalError`
  const thrown =
    (error as { originalError?: unknown } | undefined)?.originalError ?? error;
  return thrown instanceof Error ? thrown.stack : undefined;
}
