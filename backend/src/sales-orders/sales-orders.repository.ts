import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(args: Prisma.SalesOrderCreateArgs) {
    return this.prisma.salesOrder.create(args);
  }

  findMany(args: Prisma.SalesOrderFindManyArgs) {
    return this.prisma.salesOrder.findMany(args);
  }

  findUnique(args: Prisma.SalesOrderFindUniqueArgs) {
    return this.prisma.salesOrder.findUnique(args);
  }

  update(args: Prisma.SalesOrderUpdateArgs) {
    return this.prisma.salesOrder.update(args);
  }

  count(args?: Prisma.SalesOrderCountArgs) {
    return this.prisma.salesOrder.count(args);
  }
}
