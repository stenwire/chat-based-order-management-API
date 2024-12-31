import { Test, TestingModule } from '@nestjs/testing';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';
import { WsException } from '@nestjs/websockets';

const mockChatsService = {
  validateChatAccess: jest.fn(),
  getChatHistory: jest.fn(),
  saveMessage: jest.fn(),
  closeChat: jest.fn(),
};

describe('ChatsGateway', () => {
  let gateway: ChatsGateway;
  let service: typeof mockChatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsGateway,
        { provide: ChatsService, useValue: mockChatsService },
      ],
    }).compile();

    gateway = module.get<ChatsGateway>(ChatsGateway);
    service = module.get(ChatsService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should join chat room and send history', async () => {
      const client: any = {
        handshake: { query: { oid: 'order1', uid: 'user1' } },
        join: jest.fn(),
        emit: jest.fn(),
      };
      service.validateChatAccess.mockResolvedValueOnce(true);
      service.getChatHistory.mockResolvedValueOnce(['message1']);

      await gateway.handleConnection(client);
      expect(client.join).toHaveBeenCalledWith('room:order1');
      expect(client.emit).toHaveBeenCalledWith('chatHistory', ['message1']);
    });

    it('should handle invalid queries', async () => {
      const client: any = {
        handshake: { query: {} },
        disconnect: jest.fn(),
        emit: jest.fn(),
      };

      await gateway.handleConnection(client);
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid chat room ID or user ID',
      });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });
});
