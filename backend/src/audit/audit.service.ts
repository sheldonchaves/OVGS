import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async log(params: {
    action: string;
    entityType: string;
    entityId: string;
    previousState?: Prisma.InputJsonValue | null;
    newState?: Prisma.InputJsonValue | null;
    user?: AuthUser | null;
    userId?: string | null;
    userEmail?: string | null;
  }) {
    const candidateUserId = params.user?.id ?? params.userId ?? undefined;
    let userId: string | undefined;
    if (candidateUserId) {
      const existing = await this.prisma.user.findUnique({
        where: { id: candidateUserId },
        select: { id: true },
      });
      userId = existing?.id;
    }

    const entry = await this.prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousState: params.previousState ?? undefined,
        newState: params.newState ?? undefined,
        userId,
        userEmail: params.user?.email ?? params.userEmail ?? undefined,
      },
    });

    this.eventEmitter.emit('audit.created', entry);
    return entry;
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(limit = 100, page = 1) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
