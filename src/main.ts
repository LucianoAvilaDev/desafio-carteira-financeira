import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exeptions.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle(process.env.SWAGGER_TITLE ?? 'Carteira Financeira')
    .setDescription(process.env.SWAGGER_DESCRIPTION ?? '')
    .setVersion(process.env.SWAGGER_VERSION ?? '1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(
    process.env.SWAGGER_PATH ?? 'api/documentation',
    app,
    doc,
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(
    `API running in ${process.env.API_URL || 'http://localhost'}:${port}`,
  );
  logger.log(
    `Documentation running in ${process.env.API_URL || 'http://localhost'}:${port}${process.env.SWAGGER_PATH ?? '/api/documentation'}`,
  );
}
void bootstrap();
