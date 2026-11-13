import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Role } from '../../../libs/enums/user.enum';
import type { AuthUser } from '../../../libs/types/auth';
import { getRequest } from '../guards/request.util';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';
export const ALLOW_PASSWORD_CHANGE = 'allowPasswordChange';
export const NOT_FOR_DEMO = 'notForDemo';

/** Open endpoint: no access token needed (login, refresh, health) */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Only these roles may call the endpoint */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/** Still allowed while the user must set a new password (me, changePassword) */
export const AllowPasswordChange = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE, true);

/** Demo accounts may not call this (DECISIONS §12: no password change, no user management) */
export const NotForDemo = () => SetMetadata(NOT_FOR_DEMO, true);

/**
 * The signed-in user from req.user, set by the guard. Never from req.body: the body is
 * client data, so the server's user must not live there.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, context: ExecutionContext) => {
    const user = getRequest(context).user;
    return field ? user?.[field] : user;
  },
);
