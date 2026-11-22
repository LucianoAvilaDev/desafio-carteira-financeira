import {
  IsOptional,
  IsString,
  IsPositive,
  Min,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
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

  @ApiPropertyOptional({
    description:
      'Filtra pelo tipo de transferência [sent = enviado, received = recebido].',
    enum: ['sent', 'received'],
  })
  @IsOptional()
  @IsString()
  type?: 'sent' | 'received';

  @ApiPropertyOptional({
    description:
      'Filtra pelo status da transferência [COMPLETED = concluídas, FAILED = falharam].',
    enum: ['COMPLETED', 'FAILED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filtra por conta do remetente ou do destinatário',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-\d$/, {
    message: 'A conta deve ter o formato XXXXX-X',
  })
  account?: string;

  @ApiPropertyOptional({
    description: 'Filtra por agência do remetente ou do destinatário',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}-\d$/, {
    message: 'A agência deve ter o formato XXX-X',
  })
  branch?: string;

  @ApiPropertyOptional({
    description:
      'Quando true, retorna só nome de quem enviou, nome de quem recebeu, valor e data/hora',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  short?: boolean = false;
}
