import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Env } from './libs/config';

/**
 * HTTP-level setup shared by main.ts and the e2e tests,
 * so the tests run exactly the same app as production.
 */
export function setupApp(app: INestApplication) {
  const config = app.get(ConfigService<Env, true>);
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';

  // Security headers. The CSP is relaxed outside production so the Apollo Sandbox page can load.
  app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
  // Reads the httpOnly refresh-token cookie (/auth/*)
  app.use(cookieParser());
  // Only our frontend may call the API with cookies (Nestar allowed every origin)
  app.enableCors({
    origin: config.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  });
  // Unknown DTO fields are stripped, so a client cannot sneak in fields like `role`
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
}
