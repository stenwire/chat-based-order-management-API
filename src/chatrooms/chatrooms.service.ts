import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatRoomDto } from './dto/create-chatroom.dto';
import { UpdateChatRoomDto } from './dto/update-chatroom.dto';
import { ChatRoom, ChatRoomStatus } from '@prisma/client';

@Injectable()
export class ChatRoomsService {
  constructor(private prisma: PrismaService) {}

  async create(createChatRoomDto: CreateChatRoomDto): Promise<ChatRoom> {
    // Check if chat room already exists for the order
    const existingChatRoom = await this.prisma.chatRoom.findUnique({
      where: { orderId: createChatRoomDto.orderId },
    });

    if (existingChatRoom) {
      throw new BadRequestException('Chat room already exists for this order');
    }

    return this.prisma.chatRoom.create({
      data: {
        order: { connect: { id: createChatRoomDto.orderId } },
        admin: { connect: { id: createChatRoomDto.adminId } },
        user: { connect: { id: createChatRoomDto.userId } },
        status: ChatRoomStatus.OPEN,
      },
      include: {
        order: true,
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

  async findAll(): Promise<ChatRoom[]> {
    return this.prisma.chatRoom.findMany({
      include: {
        order: true,
        messages: true,
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

  async findOne(id: string): Promise<ChatRoom | null> {
    return this.prisma.chatRoom.findUnique({
      where: { id },
      include: {
        order: true,
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

  async findByOrderId(orderId: string): Promise<ChatRoom | null> {
    return this.prisma.chatRoom.findUnique({
      where: { orderId },
      include: {
        order: true,
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

  async update(
    id: string,
    updateChatRoomDto: UpdateChatRoomDto,
  ): Promise<ChatRoom> {
    return this.prisma.chatRoom.update({
      where: { id },
      data: updateChatRoomDto,
      include: {
        order: true,
        messages: true,
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
}
