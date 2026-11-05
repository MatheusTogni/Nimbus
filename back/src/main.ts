import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AppEnv } from './config/env';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  app.enableShutdownHooks();

  const port = app
    .get<ConfigService<AppEnv, true>>(ConfigService)
    .get('PORT', { infer: true });
  // Listen on localhost only: Nginx is the public entry point.
  await app.listen(port, process.env.HOST ?? '127.0.0.1');
  Logger.log(
    `Nimbus API on http://localhost:${port}/api (docs: /api/docs)`,
    'Bootstrap',
  );
}

void bootstrap();
