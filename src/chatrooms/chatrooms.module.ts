import { Module } from '@nestjs/common';
import { ChatRoomsService } from './chatrooms.service';
import { ChatRoomsController } from './chatrooms.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChatRoomsController],
  providers: [ChatRoomsService],
})
export class ChatroomsModule {}
