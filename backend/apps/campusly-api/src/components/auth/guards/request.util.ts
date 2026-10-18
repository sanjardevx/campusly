import { ExecutionContext } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import type { AuthUser } from '../../../libs/types/auth';

export type AuthRequest = Request & { user?: AuthUser };

/** The Express request for both REST and GraphQL calls (guards and @CurrentUser need it) */
export function getRequest(context: ExecutionContext): AuthRequest {
  if (context.getType<GqlContextType>() === 'graphql') {
    return GqlExecutionContext.create(context).getContext<{
      req: AuthRequest;
    }>().req;
  }
  return context.switchToHttp().getRequest<AuthRequest>();
}
