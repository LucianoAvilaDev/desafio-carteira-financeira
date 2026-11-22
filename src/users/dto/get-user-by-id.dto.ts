import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetUserByIdDto {
  @ApiProperty({
    example: '75348bfc-6846-4645-9cdb-58e730573810',
    description: 'ID do usuário, deve ser um UUID válido',
  })
  @IsNotEmpty({ message: 'O ID é obrigatório' })
  @IsUUID('4', { message: 'ID inválido, deve ser um UUID válido' })
  id: string;
}
