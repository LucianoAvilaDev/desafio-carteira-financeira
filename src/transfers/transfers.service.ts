import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { GetTransfersQueryDto } from './dto/get-transfers-query.dto.js';
import { TransferResponseDto } from './dto/transfer-response.dto.js';
import { Transfer, TransferStatus } from './entities/transfer.entity.js';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(Transfer)
    private transfersRepository: Repository<Transfer>,
    private dataSource: DataSource,
  ) {}

  async create(
    fromUserId: string,
    dto: CreateTransferDto,
  ): Promise<TransferResponseDto> {
    if (dto.amount <= 0) {
      throw new BadRequestException('O valor deve ser maior que 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fromUser = await queryRunner.manager.findOne(User, {
        where: { id: fromUserId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fromUser) {
        throw new NotFoundException('Usuário que envia não encontrado');
      }

      const toUser = await queryRunner.manager.findOne(User, {
        where: { account: dto.account, branch: dto.branch },
        lock: { mode: 'pessimistic_write' },
      });

      if (!toUser) {
        throw new NotFoundException(
          'Conta de destino não encontrada para essa agência',
        );
      }

      if (toUser.id === fromUser.id) {
        throw new BadRequestException(
          'Você não pode transferir para você mesmo',
        );
      }

      const fromBalance = Number(fromUser.balance);
      if (fromBalance < dto.amount) {
        throw new BadRequestException('Saldo insuficiente');
      }

      fromUser.balance = Number((fromBalance - dto.amount).toFixed(2));
      toUser.balance = Number((Number(toUser.balance) + dto.amount).toFixed(2));

      await queryRunner.manager.save(fromUser);
      await queryRunner.manager.save(toUser);

      const transfer = queryRunner.manager.create(Transfer, {
        fromUserId,
        toUserId: toUser.id,
        amount: dto.amount,
        status: TransferStatus.COMPLETED,
      });

      const saved = await queryRunner.manager.save(transfer);
      await queryRunner.commitTransaction();
      return new TransferResponseDto({
        ...saved,
        fromUser,
        toUser,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId: string, query: GetTransfersQueryDto) {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      account,
      branch,
      short = false,
    } = query;

    const qb = this.transfersRepository
      .createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.fromUser', 'fromUser')
      .leftJoinAndSelect('transfer.toUser', 'toUser')
      .orderBy('transfer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type === 'sent') {
      qb.where('transfer.fromUserId = :userId', { userId });
    } else if (type === 'received') {
      qb.where('transfer.toUserId = :userId', { userId });
    } else {
      qb.where(
        '(transfer.fromUserId = :userId OR transfer.toUserId = :userId)',
        { userId },
      );
    }

    if (status) {
      qb.andWhere('transfer.status = :status', { status });
    }

    if (account) {
      qb.andWhere(
        '(fromUser.account = :account OR toUser.account = :account)',
        { account },
      );
    }

    if (branch) {
      qb.andWhere('(fromUser.branch = :branch OR toUser.branch = :branch)', {
        branch,
      });
    }

    const [transfers, total] = await qb.getManyAndCount();

    const data = short
      ? transfers.map((t) => ({
          senderName: t.fromUser?.name,
          receiverName: t.toUser?.name,
          amount: Number(t.amount),
          createdAt: t.createdAt,
          type: t.fromUserId === userId ? 'sent' : 'received',
        }))
      : transfers.map((t) => new TransferResponseDto(t));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
