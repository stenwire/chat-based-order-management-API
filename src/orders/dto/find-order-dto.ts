import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JsonValue } from 'type-fest';
import { OrderStatus, ChatRoomStatus } from '@prisma/client';

export class FindOrderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  specifications: JsonValue;

  @ApiProperty()
  quantity: number;

  @ApiPropertyOptional()
  metadata?: JsonValue;

  @ApiProperty()
  status: OrderStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  chatRoom?: {
    id: string;
    status: ChatRoomStatus;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    closingSummary?: string;
    orderId: string;
    adminId: string;
  };

  @ApiPropertyOptional()
  user?: {
    id: string;
    name: string;
    email: string;
  };
}
