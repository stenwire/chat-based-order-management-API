import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  chatRoomId: string;
}
