import { Test, TestingModule } from '@nestjs/testing';
import { ChatRoomsController } from './chatrooms.controller';
import { ChatRoomsService } from './chatrooms.service';
import { UpdateChatRoomDto } from './dto/update-chatroom.dto';
import { ChatRoomStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrdersModule } from '../orders/orders.module';

describe('ChatroomsController', () => {
  let controller: ChatRoomsController;
  let service: ChatRoomsService;

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

  const mockChatRoomsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByOrderId: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatRoomsController],
      providers: [
        {
          provide: ChatRoomsService,
          useValue: mockChatRoomsService,
        },
      ],
      imports: [OrdersModule],
    }).compile();

    controller = module.get<ChatRoomsController>(ChatRoomsController);
    service = module.get<ChatRoomsService>(ChatRoomsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of chat rooms', async () => {
      const mockChatRooms = [mockChatRoom];
      mockChatRoomsService.findAll.mockResolvedValueOnce(mockChatRooms);

      const result = await controller.findAll({
        id: '1',
        role: UserRole.ADMIN,
      });

      expect(result).toEqual(mockChatRooms);
      expect(mockChatRoomsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a chat room by id', async () => {
      mockChatRoomsService.findOne.mockResolvedValueOnce(mockChatRoom);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockChatRoom);
      expect(mockChatRoomsService.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when chat room not found', async () => {
      mockChatRoomsService.findOne.mockResolvedValueOnce(null);

      await expect(controller.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('closeChatRoom', () => {
    const updateDto: UpdateChatRoomDto = {
      status: ChatRoomStatus.CLOSED,
      closingSummary: 'Chat closed',
    };

    it('should close a chat room successfully', async () => {
      mockChatRoomsService.findOne.mockResolvedValueOnce(mockChatRoom);
      mockChatRoomsService.update.mockResolvedValueOnce({
        ...mockChatRoom,
        status: ChatRoomStatus.CLOSED,
        closingSummary: 'Chat closed',
      });

      const result = await controller.closeChatRoom('1', updateDto);

      expect(result.status).toBe(ChatRoomStatus.CLOSED);
      expect(result.closingSummary).toBe('Chat closed');
    });

    it('should throw BadRequestException when closing summary is missing', async () => {
      await expect(
        controller.closeChatRoom('1', { status: ChatRoomStatus.CLOSED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when chat room not found', async () => {
      mockChatRoomsService.findOne.mockResolvedValueOnce(null);

      await expect(controller.closeChatRoom('999', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when chat room is already closed', async () => {
      mockChatRoomsService.findOne.mockResolvedValueOnce({
        ...mockChatRoom,
        status: ChatRoomStatus.CLOSED,
      });

      await expect(controller.closeChatRoom('1', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // describe('findByOrderId', () => {
  //   it('should return a chat room by order id', async () => {
  //     mockChatRoomsService.findByOrderId.mockResolvedValueOnce(mockChatRoom);

  //     const result = await controller.findByOrderId('1', {
  //       id: '1',
  //       role: 'ADMIN',
  //     });

  //     expect(result).toEqual(mockChatRoom);
  //     expect(mockChatRoomsService.findByOrderId).toHaveBeenCalledWith('1');
  //   });

  //   it('should throw NotFoundException when chat room not found', async () => {
  //     mockChatRoomsService.findByOrderId.mockResolvedValueOnce(null);

  //     await expect(
  //       controller.findByOrderId('999', { id: '1', role: 'ADMIN' }),
  //     ).rejects.toThrow(NotFoundException);
  //   });
  // });
});
