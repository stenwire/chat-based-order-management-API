import { Test, TestingModule } from '@nestjs/testing';
import { ChatsService } from './chats.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrismaService = {
  chatRoom: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
  order: {
    update: jest.fn(),
  },
};

describe('ChatsService', () => {
  let service: ChatsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ChatsService>(ChatsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChatRoom', () => {
    it('should fetch chat room from DB if not in cache', async () => {
      const orderId = 'test-order';
      const dbChatRoom = { id: 'room-id', orderId };
      prisma.chatRoom.findFirst.mockResolvedValueOnce(dbChatRoom);

      const result = await service['getChatRoom'](orderId);
      expect(result).toBe(dbChatRoom);
      expect(prisma.chatRoom.findFirst).toHaveBeenCalledWith({
        where: { orderId },
        include: { user: true },
      });
    });

    it('should throw NotFoundException if chat room is not found', async () => {
      const orderId = 'test-order';
      prisma.chatRoom.findFirst.mockResolvedValueOnce(null);

      await expect(service['getChatRoom'](orderId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateChatAccess', () => {
    it('should allow access if user is the chat room owner', async () => {
      const orderId = 'test-order';
      const userId = 'user-id';
      const chatRoom = { id: 'room-id', userId, status: 'ACTIVE' };
      prisma.chatRoom.findFirst.mockResolvedValueOnce(chatRoom);

      const result = await service.validateChatAccess(orderId, userId);
      expect(result).toBe(true);
    });

    it('should allow access if user is an admin', async () => {
      const orderId = 'test-order';
      const userId = 'admin-id';
      const chatRoom = {
        id: 'room-id',
        userId: 'other-user',
        status: 'ACTIVE',
      };
      const adminUser = { id: userId, role: 'ADMIN' };
      prisma.chatRoom.findFirst.mockResolvedValueOnce(chatRoom);
      prisma.user.findUnique.mockResolvedValueOnce(adminUser);

      const result = await service.validateChatAccess(orderId, userId);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if chat room is closed', async () => {
      const orderId = 'test-order';
      const userId = 'user-id';
      const chatRoom = { id: 'room-id', userId, status: 'CLOSED' };
      prisma.chatRoom.findFirst.mockResolvedValueOnce(chatRoom);

      await expect(service.validateChatAccess(orderId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('saveMessage', () => {
    it('should create a message in the chat room', async () => {
      const orderId = 'test-order';
      const userId = 'user-id';
      const content = 'Hello World';
      const chatRoom = { id: 'room-id', orderId };
      const createdMessage = { id: 'message-id', content };
      prisma.chatRoom.findFirst.mockResolvedValueOnce(chatRoom);
      prisma.message.create.mockResolvedValueOnce(createdMessage);

      const result = await service.saveMessage(userId, orderId, content);
      expect(result).toBe(createdMessage);
    });
  });
});
