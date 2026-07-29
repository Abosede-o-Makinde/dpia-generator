import { Module } from '@nestjs/common';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';
import { StorageService } from './storage.service';

@Module({
  controllers: [EvidenceController],
  providers: [EvidenceService, StorageService],
  exports: [EvidenceService, StorageService],
})
export class EvidenceModule {}
