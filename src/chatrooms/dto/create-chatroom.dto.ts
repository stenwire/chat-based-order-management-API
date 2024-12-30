import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateChatRoomDto {
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @IsNotEmpty()
  @IsUUID()
  adminId: string;

  @IsNotEmpty()
  @IsUUID()
  userId: string;
}
