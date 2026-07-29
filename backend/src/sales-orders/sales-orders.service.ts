import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, SalesOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { canTransition } from '../common/sales-order-status';
import {
  CreateSalesOrderDto,
  MonitorQueryDto,
  UpdateStatusDto,
  UpdateTransportDto,
} from './dto/sales-order.dto';
import { AuthUser } from '../auth/current-user.decorator';

const orderInclude = {
  client: {
    include: {
      authorizedTransports: { include: { transportType: true } },
    },
  },
  transportType: true,
  items: { include: { item: true } },
  schedule: true,
} satisfies Prisma.SalesOrderInclude;

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSalesOrderDto, user?: AuthUser) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      include: { authorizedTransports: true },
    });
    if (!client || !client.active) {
      throw new NotFoundException('Cliente não encontrado ou inativo');
    }

    const authorized = client.authorizedTransports.some(
      (t) => t.transportTypeId === dto.transportTypeId,
    );
    if (!authorized) {
      throw new BadRequestException(
        'Tipo de transporte não autorizado para este cliente',
      );
    }

    const transport = await this.prisma.transportType.findUnique({
      where: { id: dto.transportTypeId },
    });
    if (!transport || !transport.active) {
      throw new BadRequestException('Tipo de transporte inválido ou inativo');
    }

    const itemIds = dto.items.map((i) => i.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds }, active: true },
    });
    if (items.length !== itemIds.length) {
      throw new BadRequestException('Um ou mais itens são inválidos ou inativos');
    }

    const count = await this.prisma.salesOrder.count();
    const code = `OV-${String(count + 1).padStart(6, '0')}`;

    const order = await this.prisma.salesOrder.create({
      data: {
        code,
        clientId: dto.clientId,
        transportTypeId: dto.transportTypeId,
        notes: dto.notes,
        status: SalesOrderStatus.CRIADA,
        items: {
          create: dto.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
          })),
        },
      },
      include: orderInclude,
    });

    await this.auditService.log({
      action: 'SALES_ORDER_CREATED',
      entityType: 'SalesOrder',
      entityId: order.id,
      newState: {
        code: order.code,
        status: order.status,
        clientId: order.clientId,
        transportTypeId: order.transportTypeId,
      },
      user,
    });

    return order;
  }

  async findAll(query: MonitorQueryDto) {
    const where: Prisma.SalesOrderWhereInput = {};
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.transportTypeId) where.transportTypeId = query.transportTypeId;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const end = new Date(query.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException('Ordem de venda não encontrada');
    }
    return order;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, user?: AuthUser) {
    const order = await this.findOne(id);

    if (order.status === dto.status) {
      throw new BadRequestException('A ordem já está neste status');
    }

    if (!canTransition(order.status, dto.status)) {
      throw new BadRequestException(
        `Transição inválida: ${order.status} → ${dto.status}`,
      );
    }

    if (dto.status === SalesOrderStatus.AGENDADA && !order.schedule?.confirmed) {
      throw new BadRequestException(
        'Não é possível avançar para AGENDADA sem agendamento confirmado',
      );
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: dto.status },
      include: orderInclude,
    });

    await this.auditService.log({
      action: 'STATUS_CHANGED',
      entityType: 'SalesOrder',
      entityId: id,
      previousState: { status: order.status },
      newState: { status: dto.status },
      user,
    });

    return updated;
  }

  async updateTransport(id: string, dto: UpdateTransportDto, user?: AuthUser) {
    const order = await this.findOne(id);

    if (order.status === SalesOrderStatus.ENTREGUE) {
      throw new BadRequestException(
        'Não é possível alterar transporte de ordem entregue',
      );
    }

    const client = await this.prisma.client.findUnique({
      where: { id: order.clientId },
      include: { authorizedTransports: true },
    });

    const authorized = client?.authorizedTransports.some(
      (t) => t.transportTypeId === dto.transportTypeId,
    );
    if (!authorized) {
      throw new BadRequestException(
        'Tipo de transporte não autorizado para este cliente',
      );
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { transportTypeId: dto.transportTypeId },
      include: orderInclude,
    });

    await this.auditService.log({
      action: 'TRANSPORT_CHANGED',
      entityType: 'SalesOrder',
      entityId: id,
      previousState: { transportTypeId: order.transportTypeId },
      newState: { transportTypeId: dto.transportTypeId },
      user,
    });

    return updated;
  }
}
