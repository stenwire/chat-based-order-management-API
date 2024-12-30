import { Test, TestingModule } from '@nestjs/testing';
import { ChatsService } from './chats.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ChatsService', () => {
  let service: ChatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatsService, PrismaService],
    }).compile();

    service = module.get<ChatsService>(ChatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
