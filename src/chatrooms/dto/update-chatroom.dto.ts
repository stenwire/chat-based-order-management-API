import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { ChatRoomStatus } from '@prisma/client';

export class UpdateChatRoomDto {
  @IsOptional()
  @IsEnum(ChatRoomStatus)
  status?: ChatRoomStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  closingSummary?: string;
}
