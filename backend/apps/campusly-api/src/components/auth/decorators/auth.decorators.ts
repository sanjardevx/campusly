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

/** Open endpoint: no access token needed (login, refresh, health). Replaces Nestar's WithoutGuard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Only these roles may call the endpoint (same idea as Nestar's @Roles) */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/** Still allowed while the user must set a new password (me, changePassword) */
export const AllowPasswordChange = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE, true);

/**
 * The signed-in user from req.user (Nestar's @AuthMember read req.body.authMember;
 * the body is client data, so the server's user must not live there).
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, context: ExecutionContext) => {
    const user = getRequest(context).user;
    return field ? user?.[field] : user;
  },
);
