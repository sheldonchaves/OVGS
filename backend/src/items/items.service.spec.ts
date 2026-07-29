import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsRepository } from './items.repository';
import { AuditService } from '../audit/audit.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let repository: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    repository = {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: ItemsRepository, useValue: repository },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(ItemsService);
  });

  it('should create item with unique sku and audit', async () => {
    repository.findUnique.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: 'i1',
      sku: 'SKU-100',
      name: 'Item',
      description: null,
      unit: 'UN',
    });

    await service.create({ sku: 'SKU-100', name: 'Item' });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ITEM_CREATED', entityId: 'i1' }),
    );
  });

  it('should reject duplicated sku', async () => {
    repository.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({ sku: 'SKU-100', name: 'Item' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should update item and audit previous/new state', async () => {
    repository.findUnique.mockResolvedValue({
      id: 'i1',
      sku: 'SKU-100',
      name: 'Old',
      description: null,
      unit: 'UN',
      active: true,
    });
    repository.update.mockResolvedValue({
      id: 'i1',
      sku: 'SKU-100',
      name: 'New',
      description: 'Desc',
      unit: 'CX',
      active: true,
    });

    await service.update('i1', { name: 'New', description: 'Desc', unit: 'CX' });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ITEM_UPDATED',
        previousState: expect.objectContaining({ name: 'Old' }),
        newState: expect.objectContaining({ name: 'New', unit: 'CX' }),
      }),
    );
  });
});
