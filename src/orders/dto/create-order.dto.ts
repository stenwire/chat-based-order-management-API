import {
  IsString,
  IsInt,
  IsObject,
  Min,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({ description: 'Order description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Order specifications' })
  @IsObject()
  specifications: Record<string, any>;

  @ApiProperty({ description: 'Order quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ enum: OrderStatus })
  @IsOptional()
  status?: OrderStatus;
}
