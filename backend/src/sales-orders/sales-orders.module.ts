import { Module } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersRepository } from './sales-orders.repository';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [SalesOrdersService, SalesOrdersRepository],
  controllers: [SalesOrdersController],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
