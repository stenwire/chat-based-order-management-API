import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatsService } from './chats.service';
import { WsException } from '@nestjs/websockets';

interface ChatSocket extends Socket {
  userId: string;
  orderId: string;
}

@WebSocketGateway({
  path: '/api/v1/chat',
  cors: true,
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatsService: ChatsService) {}

  async handleConnection(client: ChatSocket) {
    try {
      const { oid: orderId, uid: userId } = client.handshake.query;

      if (
        !orderId ||
        !userId ||
        Array.isArray(orderId) ||
        Array.isArray(userId)
      ) {
        throw new WsException('Invalid chat room ID or user ID');
      }

      // Validate access
      const hasAccess = await this.chatsService.validateChatAccess(
        orderId,
        userId,
      );

      if (!hasAccess) {
        throw new WsException('Access denied');
      }

      // Store IDs in socket instance for later use
      client.userId = userId;
      client.orderId = orderId;

      // Join the chat room
      client.join(`room:${orderId}`);

      // Send chat history to the user
      const history = await this.chatsService.getChatHistory(orderId);
      client.emit('chatHistory', history);
    } catch (error) {
      client.emit('error', { message: error.message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: ChatSocket) {
    if (client.orderId) {
      client.leave(`room:${client.orderId}`);
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() content: string,
  ) {
    try {
      if (!content?.trim()) {
        throw new WsException('Message content cannot be empty');
      }

      const message = await this.chatsService.saveMessage(
        client.userId,
        client.orderId,
        content,
      );

      this.server.to(`room:${client.orderId}`).emit('message', message);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('closeChat')
  async handleCloseChat(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() closingSummary: string,
  ) {
    try {
      if (!closingSummary?.trim()) {
        throw new WsException('Closing summary cannot be empty');
      }

      await this.chatsService.closeChat(
        client.orderId,
        client.userId,
        closingSummary,
      );

      this.server.to(`room:${client.orderId}`).emit('chatClosed', {
        orderId: client.orderId,
        closingSummary,
      });

      // Disconnect all clients in this room
      const sockets = await this.server
        .in(`room:${client.orderId}`)
        .fetchSockets();
      sockets.forEach((socket) => socket.disconnect(true));

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
