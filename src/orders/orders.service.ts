import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, UserRole } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    // Create the order and its associated chat room in a transaction
    return this.prisma.$transaction(async (prisma) => {
      // Create the order
      const order = await prisma.order.create({
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

  async findAll(userId: string, userRole: UserRole) {
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

  async findOne(id: string, userId: string, userRole: UserRole) {
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

    return order;
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userId: string,
    userRole: UserRole,
  ) {
    // First check if order exists and user has access
    await this.findOne(id, userId, userRole);

    // Only admins can update order status
    if (updateOrderDto.status && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update order status');
    }

    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
    });
  }

  async updateStatus(id: string, status: OrderStatus, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { chatRoom: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Validate status transition
    if (
      status === OrderStatus.PROCESSING &&
      order.chatRoom?.status !== 'CLOSED'
    ) {
      throw new ForbiddenException(
        'Chat must be closed before moving to PROCESSING',
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
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
