import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRoomStatus, UserRole } from '@prisma/client';

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getChatRoom(orderId: string) {
    const chatRoom = await this.prisma.chatRoom.findFirst({
      where: {
        orderId: orderId,
      },
      include: {
        user: true,
      },
    });

    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }

    return chatRoom;
  }

  async validateChatAccess(orderId: string, userId: string): Promise<boolean> {
    const chatRoom = await this.getChatRoom(orderId);

    if (chatRoom.status === ChatRoomStatus.CLOSED) {
      throw new ForbiddenException('Chat room is closed');
    }

    if (chatRoom.userId === userId) {
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.role === UserRole.ADMIN;
  }

  async saveMessage(userId: string, orderId: string, content: string) {
    const chatRoom = await this.getChatRoom(orderId);

    return this.prisma.message.create({
      data: {
        content,
        userId,
        chatRoomId: chatRoom.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getChatHistory(orderId: string) {
    const chatRoom = await this.getChatRoom(orderId);

    return this.prisma.message.findMany({
      where: { chatRoomId: chatRoom.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async closeChat(orderId: string, adminId: string, closingSummary: string) {
    const chatRoom = await this.getChatRoom(orderId);

    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can close chat rooms');
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedChatRoom = await prisma.chatRoom.update({
        where: {
          id: chatRoom.id,
        },
        data: {
          status: ChatRoomStatus.CLOSED,
          closingSummary,
        },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PROCESSING' },
      });

      return updatedChatRoom;
    });
  }
}
