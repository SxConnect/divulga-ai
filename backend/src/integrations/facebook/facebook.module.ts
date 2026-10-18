import { Module } from '@nestjs/common';
import { FacebookAuthService } from './facebook-auth.service';
import { FacebookController } from './facebook.controller';
import { IntegrationsModule } from '../integrations.module';

@Module({
  imports: [IntegrationsModule],
  providers: [FacebookAuthService],
  controllers: [FacebookController],
  exports: [FacebookAuthService],
})
export class FacebookModule {}
