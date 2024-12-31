import { ApiProperty } from '@nestjs/swagger';
import { ChatRoomStatus } from '@prisma/client';

export class ChatRoomResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: ChatRoomStatus.OPEN })
  status: ChatRoomStatus;

  @ApiProperty({
    example: 'Summary of why the chat room was closed',
    required: false,
  })
  closingSummary?: string;

  @ApiProperty({ example: '2024-01-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T12:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: 'order123' })
  orderId: string;

  @ApiProperty({ example: 'admin123' })
  adminId: string;

  @ApiProperty({ example: 'user123' })
  userId: string;
}
