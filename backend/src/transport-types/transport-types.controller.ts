import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransportTypesService } from './transport-types.service';
import { CreateTransportTypeDto, UpdateTransportTypeDto } from './dto/transport-type.dto';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Transport Types')
@ApiBearerAuth()
@Controller('transport-types')
export class TransportTypesController {
  constructor(private readonly transportTypesService: TransportTypesService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateTransportTypeDto, @CurrentUser() user: AuthUser) {
    return this.transportTypesService.create(dto, user);
  }

  @Get()
  findAll() {
    return this.transportTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transportTypesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTransportTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transportTypesService.update(id, dto, user);
  }
}
