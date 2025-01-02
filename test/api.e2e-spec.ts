import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole, ChatRoomStatus, OrderStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

// Test data interfaces for better type safety
interface TestUser {
  id: string;
  token: string;
  email: string;
  role: UserRole;
}

interface TestData {
  users: {
    regular: TestUser;
    regular2: TestUser;
    admin: TestUser;
  };
  orders: {
    [key: string]: string;
  };
  chatRooms: {
    [key: string]: string;
  };
}

describe('E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let testData: TestData;

  const createTestUser = async (
    email: string,
    role: UserRole,
    name: string,
  ): Promise<TestUser> => {
    const user = await prisma.user.create({
      data: {
        email,
        password: 'hashedPassword123',
        role,
        name,
      },
    });

    const token = jwtService.sign(
      { sub: user.id, role },
      { secret: process.env.JWT_ACCESS_SECRET },
    );

    return {
      id: user.id,
      token,
      email,
      role,
    };
  };

  const cleanDatabase = async () => {
    await prisma.message.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
  };

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

    // Clean database before tests
    await cleanDatabase();

    // Initialize test data
    testData = {
      users: {
        regular: await createTestUser(
          'test@example.com',
          UserRole.USER,
          'Test User',
        ),
        regular2: await createTestUser(
          'elon@example.com',
          UserRole.USER,
          'Test User 2',
        ),
        admin: await createTestUser(
          'admin@example.com',
          UserRole.ADMIN,
          'Test Admin',
        ),
      },
      orders: {},
      chatRooms: {},
    };
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  describe('Auth Flow', () => {
    const authEndpoint = '/auth';

    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post(`${authEndpoint}/signup`)
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          role: UserRole.USER,
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('should sign in user', async () => {
      const response = await request(app.getHttpServer())
        .post(`${authEndpoint}/signin`)
        .send({
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('should get current user', async () => {
      const response = await request(app.getHttpServer())
        .get(`${authEndpoint}/me`)
        .set('Authorization', `Bearer ${testData.users.regular.token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: testData.users.regular.id,
        email: testData.users.regular.email,
      });
    });
  });

  describe('Orders Flow', () => {
    const ordersEndpoint = '/orders';

    const createTestOrder = async (token: string) => {
      const response = await request(app.getHttpServer())
        .post(ordersEndpoint)
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Test Order Description',
          specifications: { type: 'test', color: 'blue' },
          quantity: 1,
          metadata: { notes: 'test notes' },
        })
        .expect(HttpStatus.CREATED);

      return response.body.id;
    };

    it('should create multiple orders', async () => {
      const orderIds = await Promise.all([
        createTestOrder(testData.users.regular.token),
        createTestOrder(testData.users.regular.token),
        createTestOrder(testData.users.regular.token),
      ]);

      [testData.orders.first, testData.orders.second, testData.orders.third] =
        orderIds;

      const response = await request(app.getHttpServer())
        .get(`${ordersEndpoint}/${testData.orders.first}`)
        .set('Authorization', `Bearer ${testData.users.regular.token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        description: 'Test Order Description',
        status: OrderStatus.REVIEW,
      });
    });

    it('should get all orders (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get(ordersEndpoint)
        .set('Authorization', `Bearer ${testData.users.admin.token}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get user orders', async () => {
      const response = await request(app.getHttpServer())
        .get(ordersEndpoint)
        .set('Authorization', `Bearer ${testData.users.regular.token}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(
        response.body.every(
          (order) => order.userId === testData.users.regular.id,
        ),
      ).toBeTruthy();
    });

    it('should throw 404 for non-existent order', () => {
      return request(app.getHttpServer())
        .get(`${ordersEndpoint}/non-existent-id`)
        .set('Authorization', `Bearer ${testData.users.regular.token}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should complete order process (admin)', async () => {
      // Update order to processing
      await prisma.order.update({
        where: { id: testData.orders.first },
        data: { status: OrderStatus.PROCESSING },
      });

      // Get and close associated chat room
      const chatRoom = await prisma.chatRoom.findUnique({
        where: { orderId: testData.orders.first },
      });
      testData.chatRooms.first = chatRoom.id;

      await prisma.chatRoom.update({
        where: { id: chatRoom.id },
        data: { status: ChatRoomStatus.CLOSED },
      });

      // Complete order
      const response = await request(app.getHttpServer())
        .patch(`${ordersEndpoint}/${testData.orders.first}/status`)
        .set('Authorization', `Bearer ${testData.users.admin.token}`)
        .send({ status: OrderStatus.COMPLETED })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('status', OrderStatus.COMPLETED);
    });
  });

  describe('ChatRooms Flow', () => {
    const chatRoomsEndpoint = '/chatrooms';

    beforeAll(async () => {
      const chatRoom2 = await prisma.chatRoom.findUnique({
        where: { orderId: testData.orders.second },
      });
      testData.chatRooms.second = chatRoom2.id;
    });

    it('should get all chat rooms (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get(chatRoomsEndpoint)
        .set('Authorization', `Bearer ${testData.users.admin.token}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should throw 404 for non-existent chat room', () => {
      return request(app.getHttpServer())
        .get(`${chatRoomsEndpoint}/non-existent-id`)
        .set('Authorization', `Bearer ${testData.users.regular.token}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should get chat room by order ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`${chatRoomsEndpoint}/order/${testData.orders.second}`)
        .set('Authorization', `Bearer ${testData.users.regular.token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        orderId: testData.orders.second,
        status: ChatRoomStatus.OPEN,
      });
    });

    it('should forbid access to unauthorized users', () => {
      return request(app.getHttpServer())
        .get(`${chatRoomsEndpoint}/order/${testData.orders.second}`)
        .set('Authorization', `Bearer ${testData.users.regular2.token}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should require closing summary when closing chat room', () => {
      return request(app.getHttpServer())
        .patch(`${chatRoomsEndpoint}/${testData.chatRooms.second}/status`)
        .set('Authorization', `Bearer ${testData.users.admin.token}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should close chat room (admin)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${chatRoomsEndpoint}/${testData.chatRooms.second}/status`)
        .set('Authorization', `Bearer ${testData.users.admin.token}`)
        .send({
          closingSummary: 'Chat completed successfully',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        status: ChatRoomStatus.CLOSED,
        closingSummary: 'Chat completed successfully',
      });
    });
  });
});
