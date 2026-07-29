import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SalesOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/current-user.decorator';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(salesOrderId: string, dto: CreateScheduleDto, user?: AuthUser) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { schedule: true },
    });
    if (!order) {
      throw new NotFoundException('Ordem de venda não encontrada');
    }
    if (order.schedule) {
      throw new BadRequestException('Ordem já possui agendamento');
    }
    if (
      order.status !== SalesOrderStatus.CRIADA &&
      order.status !== SalesOrderStatus.PLANEJADA
    ) {
      throw new BadRequestException(
        'Agendamento só é permitido para ordens CRIADA ou PLANEJADA',
      );
    }

    this.validateWindow(dto.windowStart, dto.windowEnd);

    const schedule = await this.prisma.deliverySchedule.create({
      data: {
        salesOrderId,
        deliveryDate: new Date(dto.deliveryDate),
        windowStart: dto.windowStart,
        windowEnd: dto.windowEnd,
        confirmed: dto.confirmed ?? false,
      },
      include: {
        salesOrder: {
          include: { client: true, transportType: true },
        },
      },
    });

    await this.auditService.log({
      action: 'SCHEDULE_CREATED',
      entityType: 'SalesOrder',
      entityId: salesOrderId,
      newState: {
        deliveryDate: dto.deliveryDate,
        windowStart: dto.windowStart,
        windowEnd: dto.windowEnd,
        confirmed: schedule.confirmed,
      },
      user,
    });

    return schedule;
  }

  async update(salesOrderId: string, dto: UpdateScheduleDto, user?: AuthUser) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { schedule: true },
    });
    if (!order) {
      throw new NotFoundException('Ordem de venda não encontrada');
    }
    if (!order.schedule) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    if (
      order.status === SalesOrderStatus.EM_TRANSPORTE ||
      order.status === SalesOrderStatus.ENTREGUE
    ) {
      throw new BadRequestException(
        'Não é possível reagendar ordem em transporte ou entregue',
      );
    }

    const windowStart = dto.windowStart ?? order.schedule.windowStart;
    const windowEnd = dto.windowEnd ?? order.schedule.windowEnd;
    this.validateWindow(windowStart, windowEnd);

    const previousState = {
      deliveryDate: order.schedule.deliveryDate,
      windowStart: order.schedule.windowStart,
      windowEnd: order.schedule.windowEnd,
      confirmed: order.schedule.confirmed,
    };

    const schedule = await this.prisma.deliverySchedule.update({
      where: { salesOrderId },
      data: {
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
        windowStart: dto.windowStart,
        windowEnd: dto.windowEnd,
        confirmed: dto.confirmed,
      },
      include: {
        salesOrder: {
          include: { client: true, transportType: true },
        },
      },
    });

    const action =
      dto.confirmed === true && !previousState.confirmed
        ? 'SCHEDULE_CONFIRMED'
        : 'SCHEDULE_CHANGED';

    await this.auditService.log({
      action,
      entityType: 'SalesOrder',
      entityId: salesOrderId,
      previousState,
      newState: {
        deliveryDate: schedule.deliveryDate,
        windowStart: schedule.windowStart,
        windowEnd: schedule.windowEnd,
        confirmed: schedule.confirmed,
      },
      user,
    });

    return schedule;
  }

  async confirm(salesOrderId: string, user?: AuthUser) {
    return this.update(salesOrderId, { confirmed: true }, user);
  }

  async findAll(date?: string) {
    return this.prisma.deliverySchedule.findMany({
      where: date ? { deliveryDate: new Date(date) } : undefined,
      include: {
        salesOrder: {
          include: { client: true, transportType: true },
        },
      },
      orderBy: [{ deliveryDate: 'asc' }, { windowStart: 'asc' }],
    });
  }

  private validateWindow(start: string, end: string) {
    if (start >= end) {
      throw new BadRequestException(
        'Janela de atendimento inválida: início deve ser anterior ao fim',
      );
    }
  }
}
