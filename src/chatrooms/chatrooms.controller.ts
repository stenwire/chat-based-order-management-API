import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChatRoomsService } from './chatrooms.service';
import { CreateChatRoomDto } from './dto/create-chatroom.dto';
import { UpdateChatRoomDto } from './dto/update-chatroom.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ChatRoomStatus } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('chatrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChatRoomsController {
  constructor(private readonly chatRoomsService: ChatRoomsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createChatRoomDto: CreateChatRoomDto) {
    try {
      return await this.chatRoomsService.create(createChatRoomDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return await this.chatRoomsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const chatRoom = await this.chatRoomsService.findOne(id);
    if (!chatRoom) {
      throw new NotFoundException(`Chat room with ID ${id} not found`);
    }
    return chatRoom;
  }

  @Patch(':id/close')
  @Roles(UserRole.ADMIN)
  async closeChatRoom(
    @Param('id') id: string,
    @Body() updateChatRoomDto: UpdateChatRoomDto,
  ) {
    if (!updateChatRoomDto.closingSummary) {
      throw new BadRequestException('Closing summary is required');
    }

    const chatRoom = await this.chatRoomsService.findOne(id);
    if (!chatRoom) {
      throw new NotFoundException(`Chat room with ID ${id} not found`);
    }

    if (chatRoom.status === ChatRoomStatus.CLOSED) {
      throw new BadRequestException('Chat room is already closed');
    }

    return await this.chatRoomsService.update(id, {
      status: ChatRoomStatus.CLOSED,
      closingSummary: updateChatRoomDto.closingSummary,
    });
  }

  @Get('order/:orderId')
  async findByOrderId(@Param('orderId') orderId: string) {
    const chatRoom = await this.chatRoomsService.findByOrderId(orderId);
    if (!chatRoom) {
      throw new NotFoundException(`Chat room for order ${orderId} not found`);
    }
    return chatRoom;
  }
}
