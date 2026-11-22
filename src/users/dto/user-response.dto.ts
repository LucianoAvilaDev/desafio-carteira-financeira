import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ example: '12343-4' })
  @Expose()
  account: string;

  @ApiProperty({ example: '123-4' })
  @Expose()
  branch: string;

  @ApiProperty()
  @Expose()
  balance: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  constructor(user: any) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.account = user.account;
    this.branch = user.branch;
    this.balance = Number(user.balance);
    this.createdAt = user.createdAt;
  }
}
