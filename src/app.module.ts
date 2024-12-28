import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { MessagesModule } from './messages/messages.module';
import { ChatroomsModule } from './chatrooms/chatrooms.module';
import { ChatsModule } from './chats/chats.module';

@Module({
  imports: [
    UsersModule,
    OrdersModule,
    MessagesModule,
    ChatroomsModule,
    ChatsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
