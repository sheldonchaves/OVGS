import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditEventsListener } from './audit.events.listener';

@Module({
  providers: [AuditService, AuditEventsListener],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
