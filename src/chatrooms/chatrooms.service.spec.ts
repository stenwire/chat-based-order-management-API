import { Test, TestingModule } from '@nestjs/testing';
import { ChatRoomsService } from './chatrooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { ChatRoomStatus, UserRole } from '@prisma/client';

describe('ChatroomsService', () => {
  let service: ChatRoomsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    chatRoom: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockChatRoom = {
    id: '1',
    orderId: '1',
    adminId: '1',
    userId: '1',
    status: ChatRoomStatus.OPEN,
    closingSummary: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      id: '1',
      description: 'Test Order',
    },
    admin: {
      id: '1',
      name: 'Admin',
      email: 'admin@test.com',
    },
    user: {
      id: '1',
      name: 'User',
      email: 'user@test.com',
    },
    messages: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatRoomsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ChatRoomsService>(ChatRoomsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createChatRoomDto = {
      orderId: '1',
      adminId: '1',
      userId: '1',
    };

    it('should create a new chat room successfully', async () => {
      mockPrismaService.chatRoom.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.chatRoom.create.mockResolvedValueOnce(mockChatRoom);

      const result = await service.create(createChatRoomDto);

      expect(result).toEqual(mockChatRoom);
      expect(mockPrismaService.chatRoom.findUnique).toHaveBeenCalledWith({
        where: { orderId: createChatRoomDto.orderId },
      });
      expect(mockPrismaService.chatRoom.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if chat room already exists', async () => {
      mockPrismaService.chatRoom.findUnique.mockResolvedValueOnce(mockChatRoom);

      await expect(service.create(createChatRoomDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of chat rooms', async () => {
      const mockChatRooms = [mockChatRoom];
      mockPrismaService.chatRoom.findMany.mockResolvedValueOnce(mockChatRooms);

      const result = await service.findAll('1', UserRole.ADMIN);

      expect(result).toEqual(mockChatRooms);
      expect(mockPrismaService.chatRoom.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a chat room by id', async () => {
      mockPrismaService.chatRoom.findUnique.mockResolvedValueOnce(mockChatRoom);

      const result = await service.findOne('1');

      expect(result).toEqual(mockChatRoom);
      expect(mockPrismaService.chatRoom.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should return null if chat room not found', async () => {
      mockPrismaService.chatRoom.findUnique.mockResolvedValueOnce(null);

      const result = await service.findOne('999');

      expect(result).toBeNull();
    });
  });

  describe('findByOrderId', () => {
    it('should return a chat room by order id', async () => {
      mockPrismaService.chatRoom.findUnique.mockResolvedValueOnce(mockChatRoom);

      const result = await service.findByOrderId('1');

      expect(result).toEqual(mockChatRoom);
      expect(mockPrismaService.chatRoom.findUnique).toHaveBeenCalledWith({
        where: { orderId: '1' },
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    const updateChatRoomDto = {
      status: ChatRoomStatus.CLOSED,
      closingSummary: 'Chat closed',
    };

    it('should update a chat room successfully', async () => {
      const updatedChatRoom = { ...mockChatRoom, ...updateChatRoomDto };
      mockPrismaService.chatRoom.update.mockResolvedValueOnce(updatedChatRoom);

      const result = await service.update('1', updateChatRoomDto);

      expect(result).toEqual(updatedChatRoom);
      expect(mockPrismaService.chatRoom.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateChatRoomDto,
        include: expect.any(Object),
      });
    });
  });
});
