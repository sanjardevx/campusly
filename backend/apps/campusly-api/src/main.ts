import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import type { Env } from './libs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  const config = app.get(ConfigService<Env, true>);
  await app.listen(config.get('PORT_API', { infer: true }));
}
void bootstrap();
