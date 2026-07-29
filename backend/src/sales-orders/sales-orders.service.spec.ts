import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('SalesOrdersService', () => {
  let service: SalesOrdersService;
  let prisma: {
    client: { findUnique: jest.Mock };
    transportType: { findUnique: jest.Mock };
    item: { findMany: jest.Mock };
    salesOrder: {
      count: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };

  const user = {
    id: 'user-1',
    email: 'admin@gmail.com',
    name: 'Admin',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    prisma = {
      client: { findUnique: jest.fn() },
      transportType: { findUnique: jest.fn() },
      item: { findMany: jest.fn() },
      salesOrder: {
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(SalesOrdersService);
  });

  describe('create', () => {
    it('should create order when transport is authorized and items exist', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'client-1',
        active: true,
        authorizedTransports: [{ transportTypeId: 'truck-1' }],
      });
      prisma.transportType.findUnique.mockResolvedValue({
        id: 'truck-1',
        active: true,
      });
      prisma.item.findMany.mockResolvedValue([{ id: 'item-1', active: true }]);
      prisma.salesOrder.count.mockResolvedValue(0);
      prisma.salesOrder.create.mockResolvedValue({
        id: 'order-1',
        code: 'OV-000001',
        status: 'CRIADA',
        clientId: 'client-1',
        transportTypeId: 'truck-1',
      });

      const result = await service.create(
        {
          clientId: 'client-1',
          transportTypeId: 'truck-1',
          items: [{ itemId: 'item-1', quantity: 2 }],
        },
        user,
      );

      expect(result.code).toBe('OV-000001');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SALES_ORDER_CREATED',
          entityId: 'order-1',
          user,
        }),
      );
    });

    it('should reject unauthorized transport type for client', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'client-1',
        active: true,
        authorizedTransports: [{ transportTypeId: 'truck-1' }],
      });

      await expect(
        service.create({
          clientId: 'client-1',
          transportTypeId: 'truck-2',
          items: [{ itemId: 'item-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject inactive client', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'client-1',
        active: false,
        authorizedTransports: [],
      });

      await expect(
        service.create({
          clientId: 'client-1',
          transportTypeId: 'truck-1',
          items: [{ itemId: 'item-1', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject invalid items', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'client-1',
        active: true,
        authorizedTransports: [{ transportTypeId: 'truck-1' }],
      });
      prisma.transportType.findUnique.mockResolvedValue({
        id: 'truck-1',
        active: true,
      });
      prisma.item.findMany.mockResolvedValue([]);

      await expect(
        service.create({
          clientId: 'client-1',
          transportTypeId: 'truck-1',
          items: [{ itemId: 'item-missing', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should advance status with audit', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CRIADA',
        schedule: null,
      });
      prisma.salesOrder.update.mockResolvedValue({
        id: 'order-1',
        status: 'PLANEJADA',
      });

      const updated = await service.updateStatus(
        'order-1',
        { status: 'PLANEJADA' as never },
        user,
      );

      expect(updated.status).toBe('PLANEJADA');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STATUS_CHANGED',
          previousState: { status: 'CRIADA' },
          newState: { status: 'PLANEJADA' },
          user,
        }),
      );
    });

    it('should reject AGENDADA without confirmed schedule', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PLANEJADA',
        schedule: { confirmed: false },
      });

      await expect(
        service.updateStatus('order-1', { status: 'AGENDADA' as never }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid status transition', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CRIADA',
        schedule: null,
      });

      await expect(
        service.updateStatus('order-1', { status: 'ENTREGUE' as never }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when order does not exist', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('missing', { status: 'PLANEJADA' as never }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTransport', () => {
    it('should update transport when authorized', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CRIADA',
        clientId: 'client-1',
        transportTypeId: 'truck-1',
      });
      prisma.client.findUnique.mockResolvedValue({
        id: 'client-1',
        authorizedTransports: [
          { transportTypeId: 'truck-1' },
          { transportTypeId: 'truck-2' },
        ],
      });
      prisma.salesOrder.update.mockResolvedValue({
        id: 'order-1',
        transportTypeId: 'truck-2',
      });

      await service.updateTransport(
        'order-1',
        { transportTypeId: 'truck-2' },
        user,
      );

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRANSPORT_CHANGED',
          user,
        }),
      );
    });

    it('should reject transport change for delivered order', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'ENTREGUE',
        clientId: 'client-1',
        transportTypeId: 'truck-1',
      });

      await expect(
        service.updateTransport('order-1', { transportTypeId: 'truck-2' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should apply monitoring filters', async () => {
      prisma.$transaction = jest.fn().mockResolvedValue([[], 0]);

      await service.findAll({
        status: 'CRIADA' as never,
        clientId: 'client-1',
        transportTypeId: 'truck-1',
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
