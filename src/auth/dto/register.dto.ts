import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Luciano' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'luciano@teste.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '23434-4' })
  @IsString()
  @Matches(/^\d{5}-\d$/, { message: 'Conta deve estar no formato XXXXX-X' })
  account: string;

  @ApiProperty({ example: '123-4' })
  @IsString()
  @Matches(/^\d{3}-\d$/, { message: 'Agência deve estar no formato XXX-X' })
  branch: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;
}
