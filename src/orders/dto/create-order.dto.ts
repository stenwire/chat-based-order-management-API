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
import { JsonValue } from 'type-fest';

export class CreateOrderDto {
  @ApiProperty({ description: 'Order description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Order specifications' })
  @IsObject()
  specifications: JsonValue;

  @ApiProperty({ description: 'Order quantity', minimum: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: JsonValue;

  @ApiProperty({ enum: OrderStatus })
  @IsOptional()
  status?: OrderStatus;

  @IsOptional()
  id?: string;
}
