import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { config } from './common/config';

async function bootstrap(): Promise<void> {
  const cfg = config();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      cfg.NODE_ENV === 'production' ? ['log', 'warn', 'error'] : ['debug', 'log', 'warn', 'error'],
  });

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      strictTransportSecurity: { maxAge: 63_072_000, includeSubDomains: true, preload: true },
    }),
  );
  app.enableCors({
    origin: [cfg.APP_URL],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Organisation-Id', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();

  if (cfg.NODE_ENV !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('Shieldwise Privacy Platform API')
      .setDescription(
        'AI-powered DPIA & privacy decision engine. All endpoints are tenant-scoped ' +
          '(X-Organisation-Id header) and require a bearer token unless marked public.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc), {
      jsonDocumentUrl: 'docs/openapi.json',
    });
  }

  await app.listen(cfg.PORT);
  new Logger('Bootstrap').log(`Shieldwise API listening on :${cfg.PORT} (${cfg.NODE_ENV})`);
}

void bootstrap();
