import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('12345678', 10);

  await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: { passwordHash, name: 'Administrador', role: UserRole.ADMIN, active: true },
    create: {
      email: 'admin@gmail.com',
      name: 'Administrador',
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@gmail.com' },
    update: { passwordHash, name: 'Usuário', role: UserRole.USER, active: true },
    create: {
      email: 'user@gmail.com',
      name: 'Usuário',
      role: UserRole.USER,
      passwordHash,
    },
  });

  const caminhao = await prisma.transportType.upsert({
    where: { name: 'Caminhão' },
    update: {},
    create: { name: 'Caminhão', description: 'Transporte rodoviário padrão' },
  });

  const carreta = await prisma.transportType.upsert({
    where: { name: 'Carreta' },
    update: {},
    create: { name: 'Carreta', description: 'Transporte de maior capacidade' },
  });

  const biTruck = await prisma.transportType.upsert({
    where: { name: 'Bi-truck' },
    update: {},
    create: { name: 'Bi-truck', description: 'Duplo eixo para cargas médias' },
  });

  const client = await prisma.client.upsert({
    where: { document: '12.345.678/0001-90' },
    update: {},
    create: {
      name: 'Distribuidora Alfa Ltda',
      document: '12.345.678/0001-90',
      email: 'contato@alfa.com',
      phone: '(11) 3000-0000',
      authorizedTransports: {
        create: [
          { transportTypeId: caminhao.id },
          { transportTypeId: carreta.id },
        ],
      },
    },
  });

  const client2 = await prisma.client.upsert({
    where: { document: '98.765.432/0001-10' },
    update: {},
    create: {
      name: 'Comércio Beta SA',
      document: '98.765.432/0001-10',
      email: 'ops@beta.com',
      phone: '(21) 4000-0000',
      authorizedTransports: {
        create: [
          { transportTypeId: caminhao.id },
          { transportTypeId: biTruck.id },
        ],
      },
    },
  });

  await prisma.item.upsert({
    where: { sku: 'SKU-001' },
    update: {},
    create: { sku: 'SKU-001', name: 'Caixa Plástica 40L', unit: 'UN' },
  });

  await prisma.item.upsert({
    where: { sku: 'SKU-002' },
    update: {},
    create: { sku: 'SKU-002', name: 'Palete Madeira', unit: 'UN' },
  });

  await prisma.item.upsert({
    where: { sku: 'SKU-003' },
    update: {},
    create: { sku: 'SKU-003', name: 'Filme Stretch', unit: 'RL' },
  });

  console.log('Seed concluído:', {
    users: ['admin@gmail.com', 'user@gmail.com'],
    transports: [caminhao.name, carreta.name, biTruck.name],
    clients: [client.name, client2.name],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
