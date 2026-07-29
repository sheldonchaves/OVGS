import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let prisma: {
    salesOrder: { findUnique: jest.Mock };
    deliverySchedule: {
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      salesOrder: { findUnique: jest.fn() },
      deliverySchedule: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(SchedulingService);
  });

  describe('create', () => {
    it('should create schedule for CRIADA order', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CRIADA',
        schedule: null,
      });
      prisma.deliverySchedule.create.mockResolvedValue({
        id: 'sch-1',
        confirmed: false,
        deliveryDate: new Date('2026-07-20'),
        windowStart: '08:00',
        windowEnd: '12:00',
      });

      await service.create('order-1', {
        deliveryDate: '2026-07-20',
        windowStart: '08:00',
        windowEnd: '12:00',
      });

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SCHEDULE_CREATED' }),
      );
    });

    it('should reject invalid time window', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PLANEJADA',
        schedule: null,
      });

      await expect(
        service.create('order-1', {
          deliveryDate: '2026-07-20',
          windowStart: '14:00',
          windowEnd: '10:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when schedule already exists', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PLANEJADA',
        schedule: { id: 'sch-1' },
      });

      await expect(
        service.create('order-1', {
          deliveryDate: '2026-07-20',
          windowStart: '08:00',
          windowEnd: '12:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject schedule for order in transport', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'EM_TRANSPORTE',
        schedule: null,
      });

      await expect(
        service.create('order-1', {
          deliveryDate: '2026-07-20',
          windowStart: '08:00',
          windowEnd: '12:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirm', () => {
    it('should confirm existing schedule and audit', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PLANEJADA',
        schedule: {
          deliveryDate: new Date('2026-07-20'),
          windowStart: '08:00',
          windowEnd: '12:00',
          confirmed: false,
        },
      });
      prisma.deliverySchedule.update.mockResolvedValue({
        deliveryDate: new Date('2026-07-20'),
        windowStart: '08:00',
        windowEnd: '12:00',
        confirmed: true,
      });

      await service.confirm('order-1');

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SCHEDULE_CONFIRMED' }),
      );
    });

    it('should throw when schedule is missing', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PLANEJADA',
        schedule: null,
      });

      await expect(service.confirm('order-1')).rejects.toThrow(NotFoundException);
    });
  });
});
