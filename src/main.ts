import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validação global de todas as rotas
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // só deixa passar o que está no DTO
      forbidNonWhitelisted: true, // dá erro 400 se tiver campo a mais do que no DTO
      transform: true, // converte os tipos que vem em HTTP de acordo com o DTO
    }),
  );

  app.enableCors();

  // Configurações do Swagger
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

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `API running in ${process.env.API_URL || 'http://localhost'}:${process.env.PORT || 3000}`,
  );
  console.log(
    `Documentation running in ${process.env.API_URL || 'http://localhost'}:${process.env.PORT || 3000}${process.env.SWAGGER_PATH ?? '/api/documentation'}`,
  );
}
void bootstrap();
