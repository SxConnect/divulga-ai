import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';
import { ProductsModule } from './products/products.module';
import { AIModule } from './ai/ai.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PublicationsModule } from './publications/publications.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { FacebookModule } from './integrations/facebook/facebook.module';
import { MetricsModule } from './metrics/metrics.module';
import { CreditsModule } from './credits/credits.module';
import { QueueModule } from './common/queues/queue.module';
import { QueuesController } from './common/queues/queues.controller';
import { ImageGenerationWorker } from './common/queues/workers/image-generation.worker';
import { VideoGenerationWorker } from './common/queues/workers/video-generation.worker';
import { SocialPublishWorker } from './common/queues/workers/social-publish.worker';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { StorageModule } from './common/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    QueueModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    CatalogModule,
    ProductsModule,
    AIModule,
    CampaignsModule,
    PublicationsModule,
    IntegrationsModule,
    FacebookModule,
    MetricsModule,
    CreditsModule,
  ],
  controllers: [QueuesController],
  providers: [
    ImageGenerationWorker,
    VideoGenerationWorker,
    SocialPublishWorker,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
