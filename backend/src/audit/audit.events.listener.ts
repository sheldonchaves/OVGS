import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AuditEventsListener implements OnModuleInit {
  private readonly logger = new Logger('AuditEvents');

  onModuleInit() {
    this.logger.log('Listener de auditoria registrado');
  }

  @OnEvent('audit.created')
  handleAuditCreated(payload: { action: string; entityType: string; entityId: string }) {
    this.logger.log(
      JSON.stringify({
        event: 'audit.created',
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
      }),
    );
  }
}
