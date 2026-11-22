import {
  IsOptional,
  IsString,
  IsPositive,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetUsersQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Página, começa em 1' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Quantos por página' })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'Luciano',
    description: 'Busca por nome, email, conta ou agência',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '23434-4',
    description: 'Filtra pela conta exata, formato XXXXX-X',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-\d$/, {
    message: 'Conta deve estar no formato XXXXX-X',
  })
  account?: string;

  @ApiPropertyOptional({
    example: '123-4',
    description: 'Filtra pela agência exata, formato XXX-X',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}-\d$/, {
    message: 'Agência deve estar no formato XXX-X',
  })
  branch?: string;
}
