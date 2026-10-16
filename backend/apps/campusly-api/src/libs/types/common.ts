export interface T {
  [key: string]: any;
}

// Body of a Nest HttpException as Apollo passes it in `extensions.originalError`.
// We throw e.g. `new UnauthorizedException({ code: ErrorCode.INVALID_CREDENTIALS })`.
export interface HttpErrorBody {
  code?: string;
  message?: string | string[];
  statusCode?: number;
}
