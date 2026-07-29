import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@ApiTags('Scheduling')
@ApiBearerAuth()
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get()
  @ApiQuery({ name: 'date', required: false })
  findAll(@Query('date') date?: string) {
    return this.schedulingService.findAll(date);
  }

  @Post(':salesOrderId')
  create(
    @Param('salesOrderId') salesOrderId: string,
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.schedulingService.create(salesOrderId, dto, user);
  }

  @Patch(':salesOrderId')
  update(
    @Param('salesOrderId') salesOrderId: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.schedulingService.update(salesOrderId, dto, user);
  }

  @Post(':salesOrderId/confirm')
  confirm(
    @Param('salesOrderId') salesOrderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.schedulingService.confirm(salesOrderId, user);
  }
}
