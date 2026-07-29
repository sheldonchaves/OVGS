import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('OVGS API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let authHeader: { Authorization: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.auditLog.deleteMany();
    await prisma.deliverySchedule.deleteMany();
    await prisma.salesOrderItem.deleteMany();
    await prisma.salesOrder.deleteMany();
    await prisma.clientTransport.deleteMany();
    await prisma.client.deleteMany();
    await prisma.item.deleteMany();
    await prisma.transportType.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({
      data: {
        email: 'admin@gmail.com',
        name: 'Admin',
        role: 'ADMIN',
        passwordHash: await bcrypt.hash('12345678', 10),
      },
    });

    await prisma.user.create({
      data: {
        email: 'user@gmail.com',
        name: 'User',
        role: 'USER',
        passwordHash: await bcrypt.hash('12345678', 10),
      },
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@gmail.com', password: '12345678' })
      .expect(201);

    token = login.body.accessToken;
    authHeader = { Authorization: `Bearer ${token}` };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@gmail.com', password: 'wrong-password' })
        .expect(401);
    });

    it('should return current user with token', async () => {
      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(authHeader)
        .expect(200);

      expect(me.body.email).toBe('admin@gmail.com');
      expect(me.body.role).toBe('ADMIN');
    });

    it('should block protected routes without token', async () => {
      await request(app.getHttpServer()).get('/api/clients').expect(401);
    });
  });

  describe('Cadastros', () => {
    let transportId: string;
    let clientId: string;
    let itemId: string;

    it('should create and list transport types', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/transport-types')
        .set(authHeader)
        .send({ name: 'Caminhão E2E', description: 'Teste' })
        .expect(201);

      transportId = created.body.id;

      const list = await request(app.getHttpServer())
        .get('/api/transport-types')
        .set(authHeader)
        .expect(200);

      expect(list.body.some((t: { id: string }) => t.id === transportId)).toBe(
        true,
      );
    });

    it('should create and update clients with authorized transports', async () => {
      const secondTransport = await request(app.getHttpServer())
        .post('/api/transport-types')
        .set(authHeader)
        .send({ name: 'Carreta E2E' })
        .expect(201);

      const created = await request(app.getHttpServer())
        .post('/api/clients')
        .set(authHeader)
        .send({
          name: 'Cliente E2E Suite',
          document: '88.888.888/0001-88',
          transportTypeIds: [transportId],
        })
        .expect(201);

      clientId = created.body.id;
      expect(created.body.authorizedTransports).toHaveLength(1);

      const updated = await request(app.getHttpServer())
        .patch(`/api/clients/${clientId}`)
        .set(authHeader)
        .send({
          name: 'Cliente E2E Atualizado',
          transportTypeIds: [transportId, secondTransport.body.id],
        })
        .expect(200);

      expect(updated.body.name).toBe('Cliente E2E Atualizado');
      expect(updated.body.authorizedTransports).toHaveLength(2);
    });

    it('should create and list items', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/items')
        .set(authHeader)
        .send({ sku: 'E2E-SKU-001', name: 'Item Suite', unit: 'UN' })
        .expect(201);

      itemId = created.body.id;

      const list = await request(app.getHttpServer())
        .get('/api/items')
        .set(authHeader)
        .expect(200);

      expect(list.body.some((i: { id: string }) => i.id === itemId)).toBe(true);
    });

    it('should keep created refs available for order flow', () => {
      expect(transportId).toBeDefined();
      expect(clientId).toBeDefined();
      expect(itemId).toBeDefined();
    });
  });

  describe('Ordens, agendamento, monitoramento e auditoria', () => {
    let orderId: string;
    let clientId: string;
    let transportId: string;
    let otherTransportId: string;
    let itemId: string;

    beforeAll(async () => {
      const transports = await request(app.getHttpServer())
        .get('/api/transport-types')
        .set(authHeader);
      const clients = await request(app.getHttpServer())
        .get('/api/clients')
        .set(authHeader);
      const items = await request(app.getHttpServer())
        .get('/api/items')
        .set(authHeader);

      const client = clients.body.find(
        (c: { document: string }) => c.document === '88.888.888/0001-88',
      );
      clientId = client.id;
      transportId = client.authorizedTransports[0].transportTypeId;
      otherTransportId = client.authorizedTransports[1].transportTypeId;
      itemId = items.body.find(
        (i: { sku: string }) => i.sku === 'E2E-SKU-001',
      ).id;

      expect(transports.body.length).toBeGreaterThan(0);
    });

    it('should create order and reject unauthorized transport', async () => {
      const unauthorized = await request(app.getHttpServer())
        .post('/api/transport-types')
        .set(authHeader)
        .send({ name: 'Tipo Não Autorizado' })
        .expect(201);

      const created = await request(app.getHttpServer())
        .post('/api/sales-orders')
        .set(authHeader)
        .send({
          clientId,
          transportTypeId: transportId,
          items: [{ itemId, quantity: 2 }],
        })
        .expect(201);

      orderId = created.body.id;
      expect(created.body.code).toMatch(/^OV-/);
      expect(created.body.status).toBe('CRIADA');

      await request(app.getHttpServer())
        .post('/api/sales-orders')
        .set(authHeader)
        .send({
          clientId,
          transportTypeId: unauthorized.body.id,
          items: [{ itemId, quantity: 1 }],
        })
        .expect(400);
    });

    it('should update transport and reject invalid status jump', async () => {
      const updated = await request(app.getHttpServer())
        .patch(`/api/sales-orders/${orderId}/transport`)
        .set(authHeader)
        .send({ transportTypeId: otherTransportId })
        .expect(200);

      expect(updated.body.transportTypeId).toBe(otherTransportId);

      await request(app.getHttpServer())
        .patch(`/api/sales-orders/${orderId}/status`)
        .set(authHeader)
        .send({ status: 'ENTREGUE' })
        .expect(400);
    });

    it('should follow full operational flow with scheduling', async () => {
      await request(app.getHttpServer())
        .patch(`/api/sales-orders/${orderId}/status`)
        .set(authHeader)
        .send({ status: 'PLANEJADA' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/sales-orders/${orderId}/status`)
        .set(authHeader)
        .send({ status: 'AGENDADA' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/scheduling/${orderId}`)
        .set(authHeader)
        .send({
          deliveryDate: '2026-07-25',
          windowStart: '08:00',
          windowEnd: '12:00',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/scheduling/${orderId}/confirm`)
        .set(authHeader)
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/scheduling/${orderId}`)
        .set(authHeader)
        .send({
          deliveryDate: '2026-07-26',
          windowStart: '09:00',
          windowEnd: '13:00',
        })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/scheduling/${orderId}/confirm`)
        .set(authHeader)
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/sales-orders/${orderId}/status`)
        .set(authHeader)
        .send({ status: 'AGENDADA' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/sales-orders/${orderId}/status`)
        .set(authHeader)
        .send({ status: 'EM_TRANSPORTE' })
        .expect(200);

      const delivered = await request(app.getHttpServer())
        .patch(`/api/sales-orders/${orderId}/status`)
        .set(authHeader)
        .send({ status: 'ENTREGUE' })
        .expect(200);

      expect(delivered.body.status).toBe('ENTREGUE');
    });

    it('should filter monitoring by status and client', async () => {
      const filtered = await request(app.getHttpServer())
        .get('/api/sales-orders')
        .query({ status: 'ENTREGUE', clientId })
        .set(authHeader)
        .expect(200);

      const orders = filtered.body.data ?? filtered.body;
      expect(
        orders.every(
          (o: { status: string; clientId: string }) =>
            o.status === 'ENTREGUE' && o.clientId === clientId,
        ),
      ).toBe(true);
      expect(orders.some((o: { id: string }) => o.id === orderId)).toBe(true);
    });

    it('should list scheduling and audit events', async () => {
      const schedules = await request(app.getHttpServer())
        .get('/api/scheduling')
        .set(authHeader)
        .expect(200);

      expect(
        schedules.body.some(
          (s: { salesOrderId: string }) => s.salesOrderId === orderId,
        ),
      ).toBe(true);

      const audit = await request(app.getHttpServer())
        .get('/api/audit')
        .query({ limit: 200 })
        .set(authHeader)
        .expect(200);

      const auditRows = audit.body.data ?? audit.body;
      const actions = auditRows.map((a: { action: string }) => a.action);
      expect(actions).toEqual(
        expect.arrayContaining([
          'USER_LOGIN',
          'TRANSPORT_TYPE_CREATED',
          'CLIENT_CREATED',
          'CLIENT_UPDATED',
          'ITEM_CREATED',
          'SALES_ORDER_CREATED',
          'TRANSPORT_CHANGED',
          'STATUS_CHANGED',
          'SCHEDULE_CREATED',
          'SCHEDULE_CONFIRMED',
          'SCHEDULE_CHANGED',
        ]),
      );

      expect(
        auditRows.some(
          (a: { userEmail?: string }) => a.userEmail === 'admin@gmail.com',
        ),
      ).toBe(true);
    });

    it('should forbid USER from managing catalogs and viewing audit', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@gmail.com', password: '12345678' })
        .expect(201);

      const userAuth = { Authorization: `Bearer ${login.body.accessToken}` };

      await request(app.getHttpServer())
        .post('/api/clients')
        .set(userAuth)
        .send({
          name: 'Nao Permitido',
          document: '00.000.000/0001-00',
          transportTypeIds: [],
        })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/transport-types')
        .set(userAuth)
        .send({ name: 'Bloqueado' })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/items')
        .set(userAuth)
        .send({ sku: 'SKU-BLOCK', name: 'Bloqueado' })
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/audit')
        .set(userAuth)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/clients')
        .set(userAuth)
        .expect(200);
    });
  });
});
