import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const common = {
          autoLoadEntities: true,
          // Dev only — di produksi ganti dengan migration.
          synchronize: config.get('DB_SYNC', 'true') === 'true',
        };
        if (config.get('DB_TYPE', 'sqlite') === 'postgres') {
          return {
            type: 'postgres' as const,
            host: config.get<string>('DB_HOST', 'localhost'),
            port: Number(config.get('DB_PORT', 5432)),
            username: config.get<string>('DB_USER', ''),
            password: config.get<string>('DB_PASSWORD', ''),
            database: config.get<string>('DB_NAME', ''),
            // Saat sync dimatikan (produksi), skema dikelola migration
            // dan dijalankan otomatis ketika aplikasi boot.
            migrations: [join(__dirname, 'migrations', '*.js')],
            migrationsRun: config.get('DB_SYNC', 'true') !== 'true',
            ...common,
          };
        }
        return {
          type: 'better-sqlite3' as const,
          database: join(
            process.cwd(),
            config.get('DB_SQLITE_PATH', 'data/library.dev.sqlite'),
          ),
          ...common,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
