import { IsString, IsBoolean, IsOptional, Matches, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ example: '2026-07-20' })
  @IsDateString()
  deliveryDate!: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  windowStart!: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  windowEnd!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: '2026-07-20' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  windowStart?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  windowEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}
