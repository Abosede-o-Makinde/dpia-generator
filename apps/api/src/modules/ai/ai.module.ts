import { Module } from '@nestjs/common';
import { DpiasModule } from '../dpias/dpias.module';
import { AiClientService } from './ai-client.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [DpiasModule],
  controllers: [AiController],
  providers: [AiService, AiClientService],
})
export class AiModule {}
