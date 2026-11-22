import { IsNotEmpty, IsNumber, Min, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransferDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'O número da conta é obrigatório' })
  @IsString()
  @Matches(/^\d{5}-\d$/, {
    message: 'A conta deve ter o formato XXXXX-X',
  })
  account: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'A agência é obrigatória' })
  @IsString()
  @Matches(/^\d{3}-\d$/, {
    message: 'A agência deve ter o formato XXX-X',
  })
  branch: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'O valor é obrigatório' })
  @Type(() => Number)
  @IsNumber({}, { message: 'O valor deve ser um número' })
  @Min(0.01, { message: 'O valor deve ser maior que 0' })
  amount: number;
}
