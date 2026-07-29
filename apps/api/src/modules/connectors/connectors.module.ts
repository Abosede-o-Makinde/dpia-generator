import { Module } from '@nestjs/common';
import { DpiasModule } from '../dpias/dpias.module';
import { ConnectorsController } from './connectors.controller';
import { ConnectorsService } from './connectors.service';

@Module({
  imports: [DpiasModule],
  controllers: [ConnectorsController],
  providers: [ConnectorsService],
})
export class ConnectorsModule {}
