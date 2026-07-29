import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/current-user.decorator';
import { TransportTypesRepository } from './transport-types.repository';
import { CreateTransportTypeDto, UpdateTransportTypeDto } from './dto/transport-type.dto';

@Injectable()
export class TransportTypesService {
  private cache: { expiresAt: number; data: unknown } | null = null;

  constructor(
    private readonly repository: TransportTypesRepository,
    private readonly auditService: AuditService,
  ) {}

  private invalidateCache() {
    this.cache = null;
  }

  async create(dto: CreateTransportTypeDto, user?: AuthUser) {
    const existing = await this.repository.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Tipo de transporte já existe');
    }

    const item = await this.repository.create({ data: dto });
    this.invalidateCache();

    await this.auditService.log({
      action: 'TRANSPORT_TYPE_CREATED',
      entityType: 'TransportType',
      entityId: item.id,
      newState: { name: item.name, description: item.description },
      user,
    });

    return item;
  }

  async findAll() {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.data;
    }

    const data = await this.repository.findMany({ orderBy: { name: 'asc' } });
    this.cache = { data, expiresAt: now + 30_000 };
    return data;
  }

  async findOne(id: string) {
    const item = await this.repository.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Tipo de transporte não encontrado');
    }
    return item;
  }

  async update(id: string, dto: UpdateTransportTypeDto, user?: AuthUser) {
    const previous = await this.findOne(id);

    if (dto.name && dto.name !== previous.name) {
      const existing = await this.repository.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException('Tipo de transporte já existe');
      }
    }

    const item = await this.repository.update({ where: { id }, data: dto });
    this.invalidateCache();

    await this.auditService.log({
      action: 'TRANSPORT_TYPE_UPDATED',
      entityType: 'TransportType',
      entityId: id,
      previousState: {
        name: previous.name,
        description: previous.description,
        active: previous.active,
      },
      newState: {
        name: item.name,
        description: item.description,
        active: item.active,
      },
      user,
    });

    return item;
  }
}
