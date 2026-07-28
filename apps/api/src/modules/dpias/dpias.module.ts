import { Module } from '@nestjs/common';
import { RisksModule } from '../risks/risks.module';
import { DpiasController } from './dpias.controller';
import { DpiasService } from './dpias.service';

@Module({
  imports: [RisksModule],
  controllers: [DpiasController],
  providers: [DpiasService],
  exports: [DpiasService],
})
export class DpiasModule {}
