import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { ClientsRepository } from './clients.repository';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [ClientsService, ClientsRepository],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
