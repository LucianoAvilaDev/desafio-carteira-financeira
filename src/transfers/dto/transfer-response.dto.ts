import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class TransferResponseDto {
  @ApiProperty({ example: '2261526f-ad70-46d0-ac8c-00e4dada090b' })
  id: string;

  @ApiProperty({ example: 100 })
  amount: number;

  @ApiProperty({ type: UserResponseDto })
  fromUser: UserResponseDto;

  @ApiProperty({ type: UserResponseDto })
  toUser: UserResponseDto;

  @ApiProperty({ example: '2026-11-22T17:21:03.176Z' })
  createdAt: Date;

  constructor(transfer: any) {
    this.id = transfer.id;
    this.amount = Number(transfer.amount);
    this.fromUser = transfer.fromUser
      ? new UserResponseDto(transfer.fromUser)
      : transfer.fromUser;
    this.toUser = transfer.toUser
      ? new UserResponseDto(transfer.toUser)
      : transfer.toUser;
    this.createdAt = transfer.createdAt;
  }
}
