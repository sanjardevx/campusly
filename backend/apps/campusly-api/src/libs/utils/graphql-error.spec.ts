import { Logger } from '@nestjs/common';
import type { GraphQLFormattedError } from 'graphql';
import { formatGraphqlError } from './graphql-error';

describe('formatGraphqlError', () => {
  let errorLog: jest.SpyInstance;
  let warnLog: jest.SpyInstance;

  beforeEach(() => {
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnLog = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps our own code and readable message, logs a warning', () => {
    // What Apollo builds from `new UnauthorizedException({ code, message })`
    const formatted: GraphQLFormattedError = {
      message: 'Unauthorized',
      path: ['login'],
      extensions: {
        code: 'UNAUTHENTICATED',
        originalError: {
          code: 'INVALID_CREDENTIALS',
          message: 'Wrong login ID or password',
        },
      },
    };

    expect(formatGraphqlError(formatted, undefined, true)).toEqual({
      message: 'Wrong login ID or password',
      extensions: { code: 'INVALID_CREDENTIALS' },
    });
    expect(warnLog).toHaveBeenCalledWith(
      'login: INVALID_CREDENTIALS - Wrong login ID or password',
    );
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('joins ValidationPipe messages', () => {
    const formatted: GraphQLFormattedError = {
      message: 'Bad Request Exception',
      extensions: {
        code: 'BAD_REQUEST',
        originalError: {
          message: ['loginId must be a string', 'password is too short'],
        },
      },
    };

    expect(formatGraphqlError(formatted, undefined, false)).toEqual({
      message: 'loginId must be a string, password is too short',
      extensions: { code: 'BAD_REQUEST' },
    });
  });

  it('hides an unexpected error from the client in production but logs its stack', () => {
    const thrown = new Error('connect ECONNREFUSED 127.0.0.1:5432');
    const formatted: GraphQLFormattedError = {
      message: thrown.message,
      path: ['health'],
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    };

    expect(
      formatGraphqlError(formatted, { originalError: thrown }, true),
    ).toEqual({
      message: 'Internal server error',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
    expect(errorLog).toHaveBeenCalledWith(
      'health: connect ECONNREFUSED 127.0.0.1:5432',
      thrown.stack,
    );
  });

  it('shows the real message of an unexpected error in development', () => {
    const formatted: GraphQLFormattedError = { message: 'boom' };

    expect(formatGraphqlError(formatted, undefined, false)).toEqual({
      message: 'boom',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });
});
