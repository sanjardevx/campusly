import {
  BadRequestException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { GraphQLFormattedError } from 'graphql';
import { Prisma } from '../../../../../generated/prisma/client';
import { formatGraphqlError, uniqueFields } from './graphql-error';

// The real shape (checked against a running server): Apollo passes a GraphQLError whose
// `originalError` is the exception our code threw; `formatted.extensions.code` is INTERNAL_SERVER_ERROR.
function apolloError(thrown: Error, path = 'me') {
  const formatted: GraphQLFormattedError = {
    message: thrown.message,
    path: [path],
    extensions: { code: 'INTERNAL_SERVER_ERROR', stacktrace: ['...'] },
  };
  return { formatted, error: { originalError: thrown } };
}

describe('formatGraphqlError', () => {
  let errorLog: jest.SpyInstance;
  let warnLog: jest.SpyInstance;

  beforeEach(() => {
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnLog = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps our own code and message from the exception body, logs a warning', () => {
    const { formatted, error } = apolloError(
      new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is wrong',
      }),
      'changePassword',
    );

    expect(formatGraphqlError(formatted, error, true)).toEqual({
      message: 'Current password is wrong',
      extensions: { code: 'INVALID_CREDENTIALS' },
    });
    expect(warnLog).toHaveBeenCalledWith(
      'changePassword: INVALID_CREDENTIALS - Current password is wrong',
    );
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('derives the code from the HTTP status when the body has none', () => {
    const { formatted, error } = apolloError(
      new NotFoundException('No course'),
    );

    expect(formatGraphqlError(formatted, error, true)).toEqual({
      message: 'No course',
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('joins ValidationPipe messages', () => {
    // What ValidationPipe throws for an invalid input
    const { formatted, error } = apolloError(
      new BadRequestException([
        'newPassword must be longer than or equal to 8 characters',
        'currentPassword should not be empty',
      ]),
    );

    expect(formatGraphqlError(formatted, error, false)).toEqual({
      message:
        'newPassword must be longer than or equal to 8 characters, currentPassword should not be empty',
      extensions: { code: 'BAD_REQUEST' },
    });
  });

  it('keeps GraphQL validation codes (no exception thrown by our code)', () => {
    const formatted: GraphQLFormattedError = {
      message: 'Cannot query field "nope" on type "Query".',
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
    };

    expect(formatGraphqlError(formatted, {}, true).extensions).toEqual({
      code: 'GRAPHQL_VALIDATION_FAILED',
    });
  });

  it('hides an unexpected error from the client in production but logs its stack', () => {
    const thrown = new Error('connect ECONNREFUSED 127.0.0.1:5432');
    const { formatted, error } = apolloError(thrown, 'health');

    expect(formatGraphqlError(formatted, error, true)).toEqual({
      message: 'Internal server error',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
    expect(errorLog).toHaveBeenCalledWith(
      'health: connect ECONNREFUSED 127.0.0.1:5432',
      thrown.stack,
    );
  });

  it('shows the real message of an unexpected error in development', () => {
    const { formatted, error } = apolloError(new Error('boom'));

    expect(formatGraphqlError(formatted, error, false)).toEqual({
      message: 'boom',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });

  it('turns a Prisma unique violation into CONFLICT with the field names', () => {
    // The real shape from Prisma 7 + @prisma/adapter-pg (checked against the database)
    const thrown = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: {
          modelName: 'Period',
          driverAdapterError: {
            cause: {
              kind: 'UniqueConstraintViolation',
              table: 'periods',
              constraint: { index: 'periods_academicYearId_name_key' },
            },
          },
        },
      },
    );
    const { formatted, error } = apolloError(thrown, 'createPeriod');

    expect(formatGraphqlError(formatted, error, true)).toEqual({
      message: 'Already exists: academicYearId, name',
      extensions: { code: 'CONFLICT' },
    });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('reads the unique fields from meta.target when Prisma provides it', () => {
    expect(uniqueFields({ target: ['loginId'] })).toEqual(['loginId']);
    expect(uniqueFields(undefined)).toEqual([]);
  });
});
