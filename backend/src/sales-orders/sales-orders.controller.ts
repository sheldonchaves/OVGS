import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesOrdersService } from './sales-orders.service';
import {
  CreateSalesOrderDto,
  MonitorQueryDto,
  UpdateStatusDto,
  UpdateTransportDto,
} from './dto/sales-order.dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@ApiTags('Sales Orders')
@ApiBearerAuth()
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Post()
  create(@Body() dto: CreateSalesOrderDto, @CurrentUser() user: AuthUser) {
    return this.salesOrdersService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: MonitorQueryDto) {
    return this.salesOrdersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.salesOrdersService.updateStatus(id, dto, user);
  }

  @Patch(':id/transport')
  updateTransport(
    @Param('id') id: string,
    @Body() dto: UpdateTransportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.salesOrdersService.updateTransport(id, dto, user);
  }
}
