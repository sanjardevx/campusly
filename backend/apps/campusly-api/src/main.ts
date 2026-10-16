import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Env } from './libs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';

  // Security headers. The CSP is relaxed outside production so the Apollo Sandbox page can load.
  app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
  // Reads the httpOnly refresh-token cookie (used by /auth/* from day 3)
  app.use(cookieParser());
  // Only our frontend may call the API with cookies (Nestar allowed every origin)
  app.enableCors({
    origin: config.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  });
  // Unknown DTO fields are stripped, so a client cannot sneak in fields like `role`
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(config.get('PORT_API', { infer: true }));
}
void bootstrap();
