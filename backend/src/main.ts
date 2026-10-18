import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Segurança: não subir em produção com segredos de exemplo
  const insecureSecrets = ['dev-secret', 'dev-secret-change-in-production', 'sua-chave-secreta-aqui-mude-em-producao'];
  if (process.env.NODE_ENV === 'production' && insecureSecrets.includes(process.env.JWT_SECRET || 'dev-secret')) {
    throw new Error('JWT_SECRET inseguro/ausente. Defina um segredo forte antes de subir em produção.');
  }

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  // Serve os artefatos gerados (imagens de IA e vídeos) em /files/*
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/files/' });

  const config = new DocumentBuilder()
    .setTitle('Divulga.AI API')
    .setDescription('Plataforma SaaS de Divulgação de Produtos com IA')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(`🚀 Divulga.AI API running on http://localhost:${port}`);
  new Logger('Bootstrap').log(`📚 Docs available at http://localhost:${port}/docs`);
}
bootstrap();
