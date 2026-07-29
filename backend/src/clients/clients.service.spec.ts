import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsRepository } from './clients.repository';
import { AuditService } from '../audit/audit.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: {
    clientTransport: { deleteMany: jest.Mock };
    transportType: { findMany: jest.Mock };
  };
  let repository: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      clientTransport: { deleteMany: jest.fn() },
      transportType: { findMany: jest.fn() },
    };
    repository = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClientsRepository, useValue: repository },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(ClientsService);
  });

  it('should create client with authorized transports and audit', async () => {
    repository.findUnique.mockResolvedValue(null);
    prisma.transportType.findMany.mockResolvedValue([
      { id: 't1' },
      { id: 't2' },
    ]);
    repository.create.mockResolvedValue({
      id: 'c1',
      name: 'Cliente A',
      document: '11.111.111/0001-11',
      email: null,
      phone: null,
      authorizedTransports: [],
    });

    await service.create({
      name: 'Cliente A',
      document: '11.111.111/0001-11',
      transportTypeIds: ['t1', 't2'],
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CLIENT_CREATED', entityId: 'c1' }),
    );
  });

  it('should reject duplicated document', async () => {
    repository.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({
        name: 'Cliente A',
        document: '11.111.111/0001-11',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should update client and audit previous/new state', async () => {
    repository.findUnique.mockResolvedValue({
      id: 'c1',
      name: 'Old',
      email: null,
      phone: null,
      active: true,
      authorizedTransports: [{ transportTypeId: 't1' }],
    });
    prisma.transportType.findMany.mockResolvedValue([{ id: 't2' }]);
    prisma.clientTransport.deleteMany.mockResolvedValue({ count: 1 });
    repository.update.mockResolvedValue({
      id: 'c1',
      name: 'New',
      email: 'a@b.com',
      phone: null,
      active: true,
      authorizedTransports: [{ transportTypeId: 't2' }],
    });

    await service.update('c1', {
      name: 'New',
      email: 'a@b.com',
      transportTypeIds: ['t2'],
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CLIENT_UPDATED',
        previousState: expect.objectContaining({ name: 'Old' }),
        newState: expect.objectContaining({ name: 'New' }),
      }),
    );
  });

  it('should throw when client not found', async () => {
    repository.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
