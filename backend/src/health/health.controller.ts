import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }

  @ApiBearerAuth()
  @Get('metrics')
  async metrics() {
    const [clients, items, transportTypes, salesOrders, schedules, auditLogs] =
      await Promise.all([
        this.prisma.client.count(),
        this.prisma.item.count(),
        this.prisma.transportType.count(),
        this.prisma.salesOrder.count(),
        this.prisma.deliverySchedule.count(),
        this.prisma.auditLog.count(),
      ]);

    const byStatus = await this.prisma.salesOrder.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return {
      clients,
      items,
      transportTypes,
      salesOrders,
      schedules,
      auditLogs,
      salesOrdersByStatus: Object.fromEntries(
        byStatus.map((row) => [row.status, row._count._all]),
      ),
    };
  }
}
