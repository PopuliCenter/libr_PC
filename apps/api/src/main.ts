import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { assertProductionConfig } from './config/production-guard';

async function bootstrap() {
  assertProductionConfig();

  const app = await NestFactory.create(AppModule);

  // Twelve-factor IX (disposability): tutup koneksi DB dkk. dengan rapi saat SIGTERM/SIGINT.
  app.enableShutdownHooks();

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.enableCors({
    origin: process.env.WEB_URL ?? true,
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`Populi Library API berjalan di http://localhost:${port}/api/v1`);
}

bootstrap();
