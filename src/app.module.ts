import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { TransfersModule } from './transfers/transfers.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: false, // synchronize: true
      migrations: ['dist/migrations/*.js'], // ONDE ESTÃO AS MIGRATIONS COMPILADAS
      migrationsRun: false, // NÃO roda sozinho, você roda na mão
    }),
    AuthModule,
    UsersModule,
    TransfersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
