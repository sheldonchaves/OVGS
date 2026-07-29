import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiOkResponse({ description: 'Lista paginada de eventos de auditoria' })
  findAll(@Query('limit') limit?: string, @Query('page') page?: string) {
    return this.auditService.findAll(
      limit ? Number(limit) : 100,
      page ? Number(page) : 1,
    );
  }

  @Get(':entityType/:entityId')
  @ApiOkResponse({ description: 'Eventos de auditoria por entidade' })
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }
}
