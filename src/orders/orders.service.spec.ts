// orders.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, OrderStatus, ChatRoomStatus } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  // let prismaService: PrismaService;

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    chatRoom: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    // prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createOrderDto = {
      description: 'Test order',
      specifications: { type: 'test' },
      quantity: 1,
      metadata: { note: 'test note' },
    };

    const userId = 'user-123';
    const adminId = 'admin-123';

    it('should successfully create an order with chat room', async () => {
      const expectedOrder = {
        id: 'order-123',
        ...createOrderDto,
        userId,
        status: OrderStatus.REVIEW,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.order.create.mockResolvedValue(expectedOrder);
      mockPrismaService.user.findFirst.mockResolvedValue({ id: adminId });
      mockPrismaService.chatRoom.create.mockResolvedValue({
        id: 'chat-123',
        orderId: expectedOrder.id,
        adminId,
        userId,
        status: ChatRoomStatus.OPEN,
      });

      const result = await service.create(userId, createOrderDto);

      expect(result).toEqual(expectedOrder);
      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: {
          ...createOrderDto,
          userId,
          status: OrderStatus.REVIEW,
        },
      });
      expect(mockPrismaService.chatRoom.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when no admin is available', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, createOrderDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all orders for admin', async () => {
      const mockOrders = [
        { id: '1', userId: 'user-1' },
        { id: '2', userId: 'user-2' },
      ];
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findAll('admin-1', UserRole.ADMIN);

      expect(result).toEqual(mockOrders);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          chatRoom: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should return only user orders for regular user', async () => {
      const userId = 'user-1';
      const mockOrders = [{ id: '1', userId }];
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findAll(userId, UserRole.USER);

      expect(result).toEqual(mockOrders);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          chatRoom: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });
  });

  describe('findOne', () => {
    const orderId = 'order-123';
    const userId = 'user-123';

    it('should return order if user is admin', async () => {
      const mockOrder = { id: orderId, userId: 'other-user' };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne(orderId, userId, UserRole.ADMIN);

      expect(result).toEqual(mockOrder);
    });

    it('should return order if user is owner', async () => {
      const mockOrder = { id: orderId, userId };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne(orderId, userId, UserRole.USER);

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(orderId, userId, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const mockOrder = { id: orderId, userId: 'other-user' };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.findOne(orderId, userId, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    const orderId = 'order-123';
    const userId = 'admin-123';

    it('should update status to COMPLETED when chat is closed', async () => {
      const mockOrder = {
        id: orderId,
        status: OrderStatus.PROCESSING,
        chatRoom: { status: ChatRoomStatus.CLOSED },
      };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
      });

      const result = await service.updateStatus(
        orderId,
        OrderStatus.COMPLETED,
        userId,
      );

      expect(result.status).toBe(OrderStatus.COMPLETED);
    });

    it('should throw ForbiddenException when updating to PROCESSING with open chat', async () => {
      const mockOrder = {
        id: orderId,
        status: OrderStatus.REVIEW,
        chatRoom: { status: ChatRoomStatus.OPEN },
      };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.updateStatus(orderId, OrderStatus.PROCESSING, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const orderId = 'order-123';
    const userId = 'user-123';

    it('should delete order in REVIEW status', async () => {
      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.REVIEW,
      };
      mockPrismaService.order.findUnique
        .mockResolvedValueOnce(mockOrder) // for access check
        .mockResolvedValueOnce(mockOrder); // for status check
      mockPrismaService.order.delete.mockResolvedValue(mockOrder);

      const result = await service.remove(orderId, userId, UserRole.ADMIN);

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when deleting non-REVIEW order', async () => {
      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.PROCESSING,
      };
      mockPrismaService.order.findUnique
        .mockResolvedValueOnce(mockOrder) // for access check
        .mockResolvedValueOnce(mockOrder); // for status check

      await expect(
        service.remove(orderId, userId, UserRole.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
