import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { TransportTypesService } from './transport-types.service';
import { TransportTypesRepository } from './transport-types.repository';
import { AuditService } from '../audit/audit.service';

describe('TransportTypesService', () => {
  let service: TransportTypesService;
  let repository: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    repository = {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportTypesService,
        { provide: TransportTypesRepository, useValue: repository },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(TransportTypesService);
  });

  it('should create transport type and audit', async () => {
    repository.findUnique.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: 't1',
      name: 'Van',
      description: 'Pequeno porte',
    });

    await service.create({ name: 'Van', description: 'Pequeno porte' });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSPORT_TYPE_CREATED',
        entityId: 't1',
      }),
    );
  });

  it('should reject duplicated name', async () => {
    repository.findUnique.mockResolvedValue({ id: 't1' });

    await expect(service.create({ name: 'Van' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('should update transport type and audit', async () => {
    repository.findUnique.mockResolvedValue({
      id: 't1',
      name: 'Van',
      description: 'Old',
      active: true,
    });
    repository.update.mockResolvedValue({
      id: 't1',
      name: 'Van Plus',
      description: 'New',
      active: true,
    });

    await service.update('t1', { name: 'Van Plus', description: 'New' });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TRANSPORT_TYPE_UPDATED' }),
    );
  });

  it('should cache findAll results briefly', async () => {
    repository.findMany.mockResolvedValue([{ id: 't1', name: 'Van' }]);

    await service.findAll();
    await service.findAll();

    expect(repository.findMany).toHaveBeenCalledTimes(1);
  });
});
