import { Module } from '@nestjs/common';
import { ChatRoomsService } from './chatrooms.service';
import { ChatRoomsController } from './chatrooms.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, OrdersModule],
  controllers: [ChatRoomsController],
  providers: [ChatRoomsService],
})
export class ChatroomsModule {}
