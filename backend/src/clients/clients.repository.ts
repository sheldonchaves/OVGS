import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(args: Prisma.ClientCreateArgs) {
    return this.prisma.client.create(args);
  }

  findMany(args?: Prisma.ClientFindManyArgs) {
    return this.prisma.client.findMany(args);
  }

  findUnique(args: Prisma.ClientFindUniqueArgs) {
    return this.prisma.client.findUnique(args);
  }

  update(args: Prisma.ClientUpdateArgs) {
    return this.prisma.client.update(args);
  }
}
