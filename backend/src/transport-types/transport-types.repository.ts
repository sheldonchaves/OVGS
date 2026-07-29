import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransportTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(args: Prisma.TransportTypeCreateArgs) {
    return this.prisma.transportType.create(args);
  }

  findMany(args?: Prisma.TransportTypeFindManyArgs) {
    return this.prisma.transportType.findMany(args);
  }

  findUnique(args: Prisma.TransportTypeFindUniqueArgs) {
    return this.prisma.transportType.findUnique(args);
  }

  update(args: Prisma.TransportTypeUpdateArgs) {
    return this.prisma.transportType.update(args);
  }
}
