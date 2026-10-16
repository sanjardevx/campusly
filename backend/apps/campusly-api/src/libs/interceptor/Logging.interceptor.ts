import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { T } from '../types/common';

// Any key that looks like a secret is replaced before logging (Nestar logged raw req.body)
const SECRET_KEY = /password|token|secret|authorization/i;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: Logger = new Logger();

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const recordTime = Date.now();
    const requestType = context.getType<GqlContextType>();

    if (requestType === 'graphql') {
      /* (1) Print Request: operation name + redacted variables */
      const gqlContext = GqlExecutionContext.create(context);
      const info = gqlContext.getInfo<{ fieldName: string }>();
      this.logger.log(
        `${info.fieldName} ${this.stringify(gqlContext.getArgs())}`,
        'REQUEST',
      );

      /* (2) Errors are formatted by formatError in app.module */
      /* (3) No errors: print a short response */
      return next.handle().pipe(
        tap((response) => {
          const responseTime = Date.now() - recordTime;
          this.logger.log(
            `${this.stringify(response)} - ${responseTime}ms`,
            'RESPONSE',
          );
        }),
      );
    }
    return next.handle();
  }

  private stringify(value: unknown): string {
    return JSON.stringify(redact(value)).slice(0, 150);
  }
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const result: T = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = SECRET_KEY.test(key) ? '***' : redact(item);
    }
    return result;
  }
  return value;
}
