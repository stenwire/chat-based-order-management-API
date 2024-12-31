import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CloseChatDto {
  @IsUUID()
  chatRoomId: string;

  @IsString()
  @IsNotEmpty()
  closingSummary: string;
}
