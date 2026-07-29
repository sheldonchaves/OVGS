import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(args: Prisma.ItemCreateArgs) {
    return this.prisma.item.create(args);
  }

  findMany(args?: Prisma.ItemFindManyArgs) {
    return this.prisma.item.findMany(args);
  }

  findUnique(args: Prisma.ItemFindUniqueArgs) {
    return this.prisma.item.findUnique(args);
  }

  update(args: Prisma.ItemUpdateArgs) {
    return this.prisma.item.update(args);
  }
}
