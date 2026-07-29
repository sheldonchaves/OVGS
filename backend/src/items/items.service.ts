import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/current-user.decorator';
import { ItemsRepository } from './items.repository';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';

@Injectable()
export class ItemsService {
  constructor(
    private readonly repository: ItemsRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateItemDto, user?: AuthUser) {
    const existing = await this.repository.findUnique({
      where: { sku: dto.sku },
    });
    if (existing) {
      throw new ConflictException('SKU já cadastrado');
    }

    const item = await this.repository.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        unit: dto.unit ?? 'UN',
      },
    });

    await this.auditService.log({
      action: 'ITEM_CREATED',
      entityType: 'Item',
      entityId: item.id,
      newState: {
        sku: item.sku,
        name: item.name,
        description: item.description,
        unit: item.unit,
      },
      user,
    });

    return item;
  }

  async findAll() {
    return this.repository.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.repository.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    return item;
  }

  async update(id: string, dto: UpdateItemDto, user?: AuthUser) {
    const previous = await this.findOne(id);

    const item = await this.repository.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        unit: dto.unit,
        active: dto.active,
      },
    });

    await this.auditService.log({
      action: 'ITEM_UPDATED',
      entityType: 'Item',
      entityId: id,
      previousState: {
        sku: previous.sku,
        name: previous.name,
        description: previous.description,
        unit: previous.unit,
        active: previous.active,
      },
      newState: {
        sku: item.sku,
        name: item.name,
        description: item.description,
        unit: item.unit,
        active: item.active,
      },
      user,
    });

    return item;
  }
}
