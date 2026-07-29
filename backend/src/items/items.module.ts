import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { ItemsRepository } from './items.repository';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [ItemsService, ItemsRepository],
  controllers: [ItemsController],
  exports: [ItemsService],
})
export class ItemsModule {}
