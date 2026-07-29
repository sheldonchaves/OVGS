import { Module } from '@nestjs/common';
import { TransportTypesService } from './transport-types.service';
import { TransportTypesController } from './transport-types.controller';
import { TransportTypesRepository } from './transport-types.repository';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [TransportTypesService, TransportTypesRepository],
  controllers: [TransportTypesController],
  exports: [TransportTypesService],
})
export class TransportTypesModule {}
