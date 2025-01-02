import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ChatRoomsService } from './chatrooms.service';
import { OrdersService } from '../orders/orders.service';
import { UpdateChatRoomDto } from './dto/update-chatroom.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ChatRoomStatus } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { ChatRoomResponseDto } from './dto/chatrooms-response.dto'; // A DTO for response example

@ApiTags('chatrooms')
@Controller('chatrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChatRoomsController {
  constructor(
    private readonly chatRoomsService: ChatRoomsService,
    private readonly orderService: OrdersService,
  ) {}
  // constructor(private readonly orderService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch all rooms (ADMIN only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [ChatRoomResponseDto],
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @Roles(UserRole.ADMIN)
  async findAll(@GetCurrentUser() user: { id: string; role: UserRole }) {
    return await this.chatRoomsService.findAll(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one room' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ChatRoomResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chat room not found',
  })
  async findOne(@Param('id') id: string) {
    const chatRoom = await this.chatRoomsService.findOne(id);
    if (!chatRoom) {
      throw new NotFoundException(`Chat room with ID ${id} not found`);
    }
    return chatRoom;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change chat room status to CLOSED (ADMIN only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status updated',
    type: ChatRoomResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chat room not found',
  })
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
  @ApiOperation({ summary: 'Fetch room order details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ChatRoomResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Chat room not found',
  })
  async findByOrderId(
    @Param('orderId') orderId: string,
    @GetCurrentUser() user: { id: string; role: UserRole },
  ) {
    const isHaveAccess = await this.orderService.findOne(
      orderId,
      user.id,
      user.role,
    );

    if (!isHaveAccess) {
      throw new ForbiddenException('You do not have access to this order');
    }

    const chatRoom = await this.chatRoomsService.findByOrderId(orderId);
    if (!chatRoom) {
      throw new NotFoundException(`Chat room for order ${orderId} not found`);
    }
    return chatRoom;
  }
}
