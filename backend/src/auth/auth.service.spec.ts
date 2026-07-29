import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwt: { signAsync: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };
    jwt = { signAsync: jest.fn() };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('should login and audit successful authentication', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@gmail.com',
      name: 'Admin',
      role: 'ADMIN',
      active: true,
      passwordHash: 'hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwt.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login({
      email: 'admin@gmail.com',
      password: '12345678',
    });

    expect(result.accessToken).toBe('jwt-token');
    expect(result.user.email).toBe('admin@gmail.com');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_LOGIN', entityId: 'u1' }),
    );
  });

  it('should reject invalid password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@gmail.com',
      active: true,
      passwordHash: 'hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'admin@gmail.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'x@y.com', password: '12345678' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
