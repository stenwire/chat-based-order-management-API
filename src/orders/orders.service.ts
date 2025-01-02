import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, UserRole, ChatRoomStatus } from '@prisma/client';
import { FindOrderDto } from './dto/find-order-dto';
import { OrderResponseDto } from './dto/order-response.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<CreateOrderDto> {
    // Create the order and its associated chat room in a transaction
    return this.prisma.$transaction(async (prisma) => {
      // Create the order
      const order: CreateOrderDto = await prisma.order.create({
        data: {
          ...createOrderDto,
          userId,
          status: OrderStatus.REVIEW,
        },
      });

      // Find an available admin for the chat room
      const admin = await prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
      });

      if (!admin) {
        throw new ForbiddenException('No admin available to handle the order');
      }

      // Create the associated chat room
      await prisma.chatRoom.create({
        data: {
          orderId: order.id,
          adminId: admin.id,
          userId: userId,
          status: 'OPEN',
        },
      });

      return order;
    });
  }

  async findAll(userId: string, userRole: UserRole): Promise<FindOrderDto[]> {
    const where = userRole === UserRole.ADMIN ? {} : { userId };

    return this.prisma.order.findMany({
      where,
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
  }

  async findOne(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<FindOrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
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

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Check if user has access to this order
    if (userRole !== UserRole.ADMIN && order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order as FindOrderDto;
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userId: string,
    userRole: UserRole,
  ): Promise<UpdateOrderDto> {
    // First check if order exists and user has access
    await this.findOne(id, userId, userRole);

    // Only admins can update order status
    if (updateOrderDto.status && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update order status');
    }

    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
    }) as UpdateOrderDto;
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    userId: string,
  ): Promise<UpdateOrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { chatRoom: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Validate status transition
    if (
      order.status !== OrderStatus.PROCESSING ||
      order.chatRoom?.status !== ChatRoomStatus.CLOSED
    ) {
      throw new ForbiddenException(
        `Chat must be CLOSED before moving to COMPLETED`,
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.COMPLETED },
    }) as UpdateOrderDto;
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    // Check if order exists and user has access
    await this.findOne(id, userId, userRole);

    // Only allow deletion if order is in REVIEW status
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (order.status !== OrderStatus.REVIEW) {
      throw new ForbiddenException(
        'Only orders in REVIEW status can be deleted',
      );
    }

    return this.prisma.order.delete({ where: { id } });
  }
}
