import {
  IsOptional,
  IsString,
  IsPositive,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetTransfersQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'sent', enum: ['sent', 'received'] })
  @IsOptional()
  @IsString()
  type?: 'sent' | 'received';

  @ApiPropertyOptional({ example: '23434-4' })
  @IsOptional()
  @IsString()
  account?: string;

  @ApiPropertyOptional({ example: '123-4' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  short?: boolean = false;
}
