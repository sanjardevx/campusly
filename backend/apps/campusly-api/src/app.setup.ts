import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import helmet from 'helmet';
import type { Env } from './libs/config';

/**
 * HTTP-level setup shared by main.ts and the e2e tests,
 * so the tests run exactly the same app as production.
 */
export function setupApp(app: INestApplication) {
  const config = app.get(ConfigService<Env, true>);
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';

  // Production runs behind Caddy: trust its one X-Forwarded-For hop, so req.ip is the visitor
  // (login and demo rate limits count per IP). Without a proxy (dev) the header is not trusted.
  if (isProduction) {
    const server = app.getHttpAdapter().getInstance() as Express;
    server.set('trust proxy', 1);
  }

  // Security headers. The CSP is relaxed outside production so the Apollo Sandbox page can load.
  app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
  // Reads the httpOnly refresh-token cookie (/auth/*)
  app.use(cookieParser());
  // Only our frontend may call the API with cookies (Nestar allowed every origin)
  app.enableCors({
    origin: config.get('FRONTEND_URL', { infer: true }),
    credentials: true,
    // The browser keeps the preflight answer for 2 hours (Chrome's cap). Without it every API
    // call waited for an extra OPTIONS round trip (the default cache is 5 seconds).
    maxAge: 7200,
  });
  // Unknown DTO fields are stripped, so a client cannot sneak in fields like `role`
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
}
