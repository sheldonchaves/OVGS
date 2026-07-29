import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { TransportTypesModule } from './transport-types/transport-types.module';
import { ItemsModule } from './items/items.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    ClientsModule,
    TransportTypesModule,
    ItemsModule,
    SalesOrdersModule,
    SchedulingModule,
    AuditModule,
    HealthModule,
  ],
})
export class AppModule {}
