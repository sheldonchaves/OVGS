import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/current-user.decorator';
import { ClientsRepository } from './clients.repository';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ClientsRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateClientDto, user?: AuthUser) {
    const existing = await this.repository.findUnique({
      where: { document: dto.document },
    });
    if (existing) {
      throw new ConflictException('Cliente com este documento já existe');
    }

    if (dto.transportTypeIds?.length) {
      await this.validateTransportTypes(dto.transportTypeIds);
    }

    const client = await this.repository.create({
      data: {
        name: dto.name,
        document: dto.document,
        email: dto.email,
        phone: dto.phone,
        authorizedTransports: dto.transportTypeIds?.length
          ? {
              create: dto.transportTypeIds.map((transportTypeId) => ({
                transportTypeId,
              })),
            }
          : undefined,
      },
      include: {
        authorizedTransports: { include: { transportType: true } },
      },
    });

    await this.auditService.log({
      action: 'CLIENT_CREATED',
      entityType: 'Client',
      entityId: client.id,
      newState: {
        name: client.name,
        document: client.document,
        email: client.email,
        phone: client.phone,
        transportTypeIds: dto.transportTypeIds ?? [],
      },
      user,
    });

    return client;
  }

  async findAll() {
    return this.repository.findMany({
      include: {
        authorizedTransports: { include: { transportType: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const client = await this.repository.findUnique({
      where: { id },
      include: {
        authorizedTransports: { include: { transportType: true } },
      },
    });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return client as typeof client & {
      authorizedTransports: Array<{ transportTypeId: string }>;
    };
  }

  async update(id: string, dto: UpdateClientDto, user?: AuthUser) {
    const previous = await this.findOne(id);

    if (dto.transportTypeIds) {
      await this.validateTransportTypes(dto.transportTypeIds);
      await this.prisma.clientTransport.deleteMany({ where: { clientId: id } });
    }

    const client = (await this.repository.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        active: dto.active,
        authorizedTransports: dto.transportTypeIds
          ? {
              create: dto.transportTypeIds.map((transportTypeId) => ({
                transportTypeId,
              })),
            }
          : undefined,
      },
      include: {
        authorizedTransports: { include: { transportType: true } },
      },
    })) as unknown as {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      active: boolean;
      authorizedTransports: Array<{ transportTypeId: string }>;
    };

    await this.auditService.log({
      action: 'CLIENT_UPDATED',
      entityType: 'Client',
      entityId: id,
      previousState: {
        name: previous.name,
        email: previous.email,
        phone: previous.phone,
        active: previous.active,
        transportTypeIds: previous.authorizedTransports.map((t) => t.transportTypeId),
      },
      newState: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        active: client.active,
        transportTypeIds: client.authorizedTransports.map((t) => t.transportTypeId),
      },
      user,
    });

    return client;
  }

  private async validateTransportTypes(ids: string[]) {
    const found = await this.prisma.transportType.findMany({
      where: { id: { in: ids }, active: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Um ou mais tipos de transporte são inválidos');
    }
  }
}
