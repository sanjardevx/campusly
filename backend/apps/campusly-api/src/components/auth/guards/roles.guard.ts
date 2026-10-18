import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '../../../libs/enums/common.enum';
import type { Role } from '../../../libs/enums/user.enum';
import { ROLES } from '../decorators/auth.decorators';
import { getRequest } from './request.util';

/**
 * Global guard, runs after JwtAuthGuard: "may this ROLE call this operation?"
 * Whether this user may touch THIS record is checked later in the service (AccessPolicy).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true; // any signed-in user

    const user = getRequest(context).user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Not allowed for your role',
      });
    }
    return true;
  }
}
