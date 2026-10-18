import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);
        const password = config.get('REDIS_PASSWORD');
        const tls = config.get('REDIS_TLS') === 'true';

        const redisConfig: any = { host, port };
        if (password) redisConfig.password = password;
        if (tls) {
          // Upstash e Railway Redis exigem TLS
          redisConfig.tls = { rejectUnauthorized: false };
        }

        return { redis: redisConfig };
      },
    }),
    BullModule.registerQueue(
      { name: 'ai-image-generation' },
      { name: 'ai-video-generation' },
      { name: 'social-publish' },
    ),
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}