import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { CredentialsCipherService } from '../common/services/credentials-cipher.service';

@Module({
  providers: [IntegrationsService, CredentialsCipherService],
  controllers: [IntegrationsController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
