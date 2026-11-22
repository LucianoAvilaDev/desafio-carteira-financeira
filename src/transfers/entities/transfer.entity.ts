import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum TransferStatus {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  fromUserId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @Column({ type: 'uuid' })
  toUserId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'toUserId' })
  toUser: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.COMPLETED,
  })
  status: TransferStatus;

  @CreateDateColumn()
  createdAt: Date;
}
