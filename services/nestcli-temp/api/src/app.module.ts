// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { FetchModule } from './fetch/fetch.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // This makes the config available globally
      envFilePath: '.env', // Explicitly specify the .env file path
    }),
    FetchModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}