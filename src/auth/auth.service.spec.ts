import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

const id: string = uuid();

describe('AuthService', () => {
  let service: AuthService;
  // let prismaService: PrismaService;
  // let jwtService: JwtService;
  // let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    // prismaService = module.get<PrismaService>(PrismaService);
    // jwtService = module.get<JwtService>(JwtService);
    // configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const UserRole = {
      ADMIN: 'ADMIN',
      USER: 'USER',
    };
    const signUpDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: UserRole.USER,
    };

    it('should successfully create a new user', async () => {
      const hashedPassword = 'hashedPassword';
      // const hashedRefreshToken = 'hashedRefreshToken';
      const mockTokens = {
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: id,
        ...signUpDto,
        password: hashedPassword,
      });
      mockJwtService.signAsync.mockResolvedValueOnce(mockTokens.accessToken);
      mockJwtService.signAsync.mockResolvedValueOnce(mockTokens.refreshToken);

      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve(hashedPassword));

      const result = await service.signUp(signUpDto);

      expect(result).toEqual(mockTokens);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: signUpDto.email },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: id,
        ...signUpDto,
      });

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('signIn', () => {
    const signInDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: id,
      email: signInDto.email,
      password: 'hashedPassword',
      role: 'USER',
    };

    it('should successfully sign in a user', async () => {
      const mockTokens = {
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValueOnce(mockTokens.accessToken);
      mockJwtService.signAsync.mockResolvedValueOnce(mockTokens.refreshToken);

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      const result = await service.signIn(signInDto);

      expect(result).toEqual(mockTokens);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getCurrentUser', () => {
    const userId = id;
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return current user details', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refreshTokens', () => {
    const userId = id;
    const refreshToken = 'validRefreshToken';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      role: 'USER',
      refreshToken: 'hashedRefreshToken',
    };

    it('should successfully refresh tokens', async () => {
      const mockTokens = {
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValueOnce(mockTokens.accessToken);
      mockJwtService.signAsync.mockResolvedValueOnce(mockTokens.refreshToken);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      const result = await service.refreshTokens(userId, refreshToken);

      expect(result).toEqual(mockTokens);
    });

    it('should throw BadRequestException if userId or refreshToken is missing', async () => {
      await expect(service.refreshTokens('', refreshToken)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.refreshTokens(userId, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    const userId = id;

    it('should successfully logout user', async () => {
      mockPrismaService.user.update.mockResolvedValue({ id: userId });

      await service.logout(userId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { refreshToken: null },
      });
    });
  });
});
