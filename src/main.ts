import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import {
  HttpStatus,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { HttpExceptionFilter } from './filters/exception-filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
    {
      cors: {
        origin: (origin, callback) => {
          // Allow any origin (use '*' for non-credentialed requests)
          callback(null, true); // Allow all origins
        },
        credentials: true, // Allow cookies and credentials in the request
      },
    },
  );

  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  // ✅ Correct port detection for Render
  const PORT = +(process.env.PORT ?? configService.get('PORT') ?? 3050);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors) => new UnprocessableEntityException(errors),
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter(reflector));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Panda Homes')
    .setDescription('This service enables users access Panda Homes')
    .setVersion('1.0')
    .addCookieAuth('access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('documentationView', app, document);

  await app.listen(PORT,  '0.0.0.0', () => {
    console.log(`🚀 Server running on port:: ${PORT}`);
  });

  return app;
}

void bootstrap();
