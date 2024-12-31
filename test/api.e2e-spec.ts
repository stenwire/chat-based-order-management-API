import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole, ChatRoomStatus, OrderStatus } from '@prisma/client';
import { io, Socket } from 'socket.io-client';
import { JwtService } from '@nestjs/jwt';

describe('E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test data
  let userToken: string;
  let adminToken: string;
  let testUserId: string;
  let testAdminId: string;
  let testOrderId: string;
  let testOrderId_2: string;
  let testOrderId_3: string;
  let testChatRoomId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    await app.init();
    await app.listen(3333);

    // Clean the database
    await prisma.message.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: UserRole.USER,
        name: 'Test User',
      },
    });
    testUserId = testUser.id;

    const testAdmin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: 'hashedPassword123',
        role: UserRole.ADMIN,
        name: 'Test Admin',
      },
    });
    testAdminId = testAdmin.id;

    // Generate tokens
    userToken = jwtService.sign(
      { sub: testUserId, role: UserRole.USER },
      { secret: process.env.JWT_ACCESS_SECRET },
    );
    adminToken = jwtService.sign(
      { sub: testAdminId, role: UserRole.ADMIN },
      { secret: process.env.JWT_ACCESS_SECRET },
    );
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('Auth Flow', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          role: UserRole.USER,
        })
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should sign in user', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should get current user', () => {
      console.log(`userToken: ${userToken}`);
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testUserId);
          expect(res.body).toHaveProperty('email', 'test@example.com');
        });
    });
  });

  describe('Orders Flow', () => {
    it('should create 3 new order', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'Test Order Description',
          specifications: { type: 'test', color: 'blue' },
          quantity: 1,
          metadata: { notes: 'test notes' },
        })
        .expect(HttpStatus.CREATED);

      const response2 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'Test Order Description',
          specifications: { type: 'test', color: 'blue' },
          quantity: 1,
          metadata: { notes: 'test notes' },
        })
        .expect(HttpStatus.CREATED);

      const response3 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'Test Order Description',
          specifications: { type: 'test', color: 'blue' },
          quantity: 1,
          metadata: { notes: 'test notes' },
        })
        .expect(HttpStatus.CREATED);

      testOrderId = response1.body.id;
      testOrderId_2 = response2.body.id;
      testOrderId_3 = response3.body.id;
      expect(response1.body).toHaveProperty(
        'description',
        'Test Order Description',
      );
      expect(response1.body).toHaveProperty('status', OrderStatus.REVIEW);
    });

    it('should get all orders (admin)', () => {
      return request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should get user orders', () => {
      return request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          expect(
            res.body.every((order) => order.userId === testUserId),
          ).toBeTruthy();
        });
    });
  });

  describe('ChatRooms Flow', () => {
    beforeAll(async () => {
      const chatRoom = await prisma.chatRoom.findUnique({
        where: { orderId: testOrderId },
      });
      testChatRoomId = chatRoom.id;
    });

    it('should get all chat rooms (admin)', () => {
      return request(app.getHttpServer())
        .get('/chatrooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should get chat room by order ID', () => {
      return request(app.getHttpServer())
        .get(`/chatrooms/order/${testOrderId_2}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body).toHaveProperty('orderId', testOrderId_2);
          expect(res.body).toHaveProperty('status', ChatRoomStatus.OPEN);
        });
    });
  });
});
