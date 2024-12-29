import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, OrderStatus } from '@prisma/client';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrderResponseDto } from './dto/order-response.dto';

export const apiVersion = 'api/v1';

@ApiTags('orders')
@Controller(`${apiVersion}/orders`)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: HttpStatus.CREATED, type: OrderResponseDto })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @GetCurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.ordersService.create(user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: HttpStatus.OK, type: [OrderResponseDto] })
  async findAll(@GetCurrentUser() user: { id: string; role: UserRole }) {
    return this.ordersService.findAll(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  async findOne(
    @Param('id') id: string,
    @GetCurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.ordersService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @GetCurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.ordersService.update(id, updateOrderDto, user.id, user.role);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @GetCurrentUser() user: { id: string },
  ) {
    return this.ordersService.updateStatus(id, status, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete order by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  async remove(
    @Param('id') id: string,
    @GetCurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.ordersService.remove(id, user.id, user.role);
  }
}
