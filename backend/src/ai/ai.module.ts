import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { CreditsModule } from '../credits/credits.module';
import { ProviderFactory } from './providers/provider.factory';

@Module({
  imports: [CreditsModule],
  providers: [AIService, ProviderFactory],
  controllers: [AIController],
  exports: [AIService, ProviderFactory],
})
export class AIModule {}
