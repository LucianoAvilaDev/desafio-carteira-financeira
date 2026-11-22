import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransfersService } from './transfers.service.js';
import { Transfer } from './entities/transfer.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { GetTransfersQueryDto } from './dto/get-transfers-query.dto.js';
import { UserFactory } from '../users/factories/user.factory.js';
import { TransferFactory } from './factories/transfer.factory.js';

describe('TransfersService', () => {
  let service: TransfersService;

  const mockManager = {
    findOne:
      jest.fn<
        (entity: unknown, options: unknown) => Promise<User | Transfer | null>
      >(),
    save: jest.fn<(entity: User | Transfer) => Promise<User | Transfer>>(),
    create: jest.fn<(entity: unknown, data: Partial<Transfer>) => Transfer>(),
  };

  const mockQueryRunner = {
    connect: jest.fn<() => Promise<void>>(),
    startTransaction: jest.fn<() => Promise<void>>(),
    commitTransaction: jest.fn<() => Promise<void>>(),
    rollbackTransaction: jest.fn<() => Promise<void>>(),
    release: jest.fn<() => Promise<void>>(),
    manager: mockManager,
  };

  const mockDataSource = {
    createQueryRunner: jest.fn<() => typeof mockQueryRunner>(
      () => mockQueryRunner,
    ),
  };

  const mockQb = {
    leftJoinAndSelect: jest.fn(function (this: unknown) {
      return this;
    }),
    orderBy: jest.fn(function (this: unknown) {
      return this;
    }),
    skip: jest.fn(function (this: unknown) {
      return this;
    }),
    take: jest.fn(function (this: unknown) {
      return this;
    }),
    where: jest.fn(function (this: unknown) {
      return this;
    }),
    andWhere: jest.fn(function (this: unknown) {
      return this;
    }),
    getManyAndCount: jest.fn<() => Promise<[Transfer[], number]>>(),
  };

  const mockTransfersRepository = {
    createQueryBuilder: jest.fn<() => typeof mockQb>(() => mockQb),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersService,
        {
          provide: getRepositoryToken(Transfer),
          useValue: mockTransfersRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create - POST /transfers', () => {
    function mockUsers(fromUser: User, toUser: User) {
      mockManager.findOne.mockImplementation(
        async (_entity: unknown, options: any) => {
          if (options.where.id === fromUser.id) return fromUser;
          if (
            options.where.account === toUser.account &&
            options.where.branch === toUser.branch
          )
            return toUser;
          return null;
        },
      );
      mockManager.save.mockImplementation(
        async (entity: User | Transfer) => entity,
      );
      mockManager.create.mockImplementation(
        (_entity: unknown, data: Partial<Transfer>) =>
          TransferFactory.build({
            ...data,
            id: 'uuid-transfer',
          }),
      );
    }

    it('deve transferir, atualizar os 2 saldos, commitar e liberar', async () => {
      const fromUser = UserFactory.build({
        id: 'uuid-admin',
        name: 'Luciano',
        email: 'luciano@teste.com',
        balance: 1000,
        account: '12343-4',
        branch: '123-4',
      });
      const toUser = UserFactory.build({
        id: 'uuid-maria',
        name: 'Maria',
        email: 'maria@teste.com',
        balance: 500,
        account: '2222-2',
        branch: '001-1',
      });

      const dto: CreateTransferDto = {
        account: toUser.account,
        branch: toUser.branch,
        amount: 100,
      };

      mockUsers(fromUser, toUser);

      const result = await service.create('uuid-admin', dto);

      expect(mockManager.findOne).toHaveBeenCalledTimes(2);
      expect(mockManager.findOne).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          where: { id: 'uuid-admin' },
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(mockManager.findOne).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          where: { account: '2222-2', branch: '001-1' },
          lock: { mode: 'pessimistic_write' },
        }),
      );

      const savedFromUser = mockManager.save.mock.calls[0][0] as User;
      const savedToUser = mockManager.save.mock.calls[1][0] as User;
      expect(Number(savedFromUser.balance)).toBe(900);
      expect(Number(savedToUser.balance)).toBe(600);

      expect(mockManager.create).toHaveBeenCalledWith(
        Transfer,
        expect.objectContaining({
          fromUserId: 'uuid-admin',
          toUserId: 'uuid-maria',
          amount: 100,
        }),
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({ id: 'uuid-transfer', amount: 100 }),
      );
    });

    it('deve permitir mesmo account com branch diferente', async () => {
      const fromUser = UserFactory.build({
        id: 'uuid-admin',
        balance: 1000,
        account: '12343-4',
        branch: '123-4',
      });
      const toUser = UserFactory.build({
        id: 'uuid-outro',
        balance: 0,
        account: '12343-4',
        branch: '999-9',
      });

      const dto: CreateTransferDto = {
        account: '12343-4',
        branch: '999-9',
        amount: 100,
      };

      mockUsers(fromUser, toUser);

      await service.create('uuid-admin', dto);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('deve jogar BadRequestException se transferir para si mesmo', async () => {
      const fromUser = UserFactory.build({
        id: 'uuid-admin',
        balance: 1000,
        account: '12343-4',
        branch: '123-4',
      });

      const dto: CreateTransferDto = {
        account: '12343-4',
        branch: '123-4',
        amount: 100,
      };

      mockManager.findOne.mockResolvedValue(fromUser);

      await expect(service.create('uuid-admin', dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create('uuid-admin', dto)).rejects.toThrow(
        'Você não pode transferir para você mesmo',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('deve jogar BadRequestException se amount <= 0, sem abrir transação', async () => {
      const dto: CreateTransferDto = {
        account: '2222-2',
        branch: '001-1',
        amount: 0,
      };

      await expect(service.create('uuid-admin', dto)).rejects.toThrow(
        'O valor deve ser maior que 0',
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('deve jogar NotFoundException se quem envia não existir e dar rollback', async () => {
      const dto: CreateTransferDto = {
        account: '2222-2',
        branch: '001-1',
        amount: 100,
      };

      mockManager.findOne.mockResolvedValueOnce(null);

      try {
        await service.create('uuid-admin', dto);
        fail('Deveria ter jogado NotFoundException');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
        expect((err as Error).message).toBe('Usuário que envia não encontrado');
      }

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('deve jogar NotFoundException se quem recebe não existir e dar rollback', async () => {
      const fromUser = UserFactory.build({
        id: 'uuid-admin',
        balance: 1000,
        account: '12343-4',
        branch: '123-4',
      });

      const dto: CreateTransferDto = {
        account: '9999-9',
        branch: '999-9',
        amount: 100,
      };

      mockManager.findOne
        .mockResolvedValueOnce(fromUser)
        .mockResolvedValueOnce(null);

      await expect(service.create('uuid-admin', dto)).rejects.toThrow(
        'Conta de destino não encontrada para essa agência',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('deve jogar BadRequestException se saldo insuficiente e dar rollback', async () => {
      const fromUser = UserFactory.build({
        id: 'uuid-admin',
        balance: 1000,
        account: '12343-4',
        branch: '123-4',
      });
      const toUser = UserFactory.build({
        id: 'uuid-maria',
        balance: 500,
        account: '2222-2',
        branch: '001-1',
      });

      const dto: CreateTransferDto = {
        account: '2222-2',
        branch: '001-1',
        amount: 2000,
      };

      mockUsers(fromUser, toUser);

      await expect(service.create('uuid-admin', dto)).rejects.toThrow(
        'Saldo insuficiente',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('deve lidar com decimal como string (como o Postgres devolve)', async () => {
      const fromUser = UserFactory.build({
        id: 'uuid-admin',
        balance: '1000.00' as unknown as number,
        account: '12343-4',
        branch: '123-4',
      });
      const toUser = UserFactory.build({
        id: 'uuid-maria',
        balance: '500.00' as unknown as number,
        account: '2222-2',
        branch: '001-1',
      });

      const dto: CreateTransferDto = {
        account: '2222-2',
        branch: '001-1',
        amount: 100.5,
      };

      mockUsers(fromUser, toUser);

      await service.create('uuid-admin', dto);

      const savedFromUser = mockManager.save.mock.calls[0][0] as User;
      const savedToUser = mockManager.save.mock.calls[1][0] as User;
      expect(Number(savedFromUser.balance)).toBe(899.5);
      expect(Number(savedToUser.balance)).toBe(600.5);
    });
  });

  describe('findAll - GET /transfers', () => {
    it('deve buscar enviadas + recebidas quando não tem type', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const query = { page: 1, limit: 10 } as GetTransfersQueryDto;

      const result = await service.findAll('uuid-admin', query);

      expect(mockTransfersRepository.createQueryBuilder).toHaveBeenCalledWith(
        'transfer',
      );
      expect(mockQb.where).toHaveBeenCalledWith(
        '(transfer.fromUserId = :userId OR transfer.toUserId = :userId)',
        { userId: 'uuid-admin' },
      );
      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(10);
      expect(result).toEqual(
        expect.objectContaining({ total: 0, page: 1, limit: 10 }),
      );
    });

    it('deve buscar só enviadas quando type=sent', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        type: 'sent',
      } as GetTransfersQueryDto;

      await service.findAll('uuid-admin', query);

      expect(mockQb.where).toHaveBeenCalledWith(
        'transfer.fromUserId = :userId',
        { userId: 'uuid-admin' },
      );
    });

    it('deve buscar só recebidas quando type=received', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        type: 'received',
      } as GetTransfersQueryDto;

      await service.findAll('uuid-admin', query);

      expect(mockQb.where).toHaveBeenCalledWith('transfer.toUserId = :userId', {
        userId: 'uuid-admin',
      });
    });

    it('deve filtrar por account + branch quando informado', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        account: '2222-2',
        branch: '001-1',
      } as GetTransfersQueryDto;

      await service.findAll('uuid-admin', query);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(fromUser.account = :account OR toUser.account = :account)',
        { account: '2222-2' },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(fromUser.branch = :branch OR toUser.branch = :branch)',
        { branch: '001-1' },
      );
    });

    it('deve calcular totalPages', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 25]);

      const query = { page: 2, limit: 10 } as GetTransfersQueryDto;

      const result = await service.findAll('uuid-admin', query);

      expect(result.totalPages).toBe(3);
      expect(mockQb.skip).toHaveBeenCalledWith(10);
    });

    it('deve retornar short com senderName, receiverName, amount, createdAt e type=sent', async () => {
      const fromUser = UserFactory.build({
        id: 'uuid-admin',
        name: 'Luciano',
        account: '12343-4',
        branch: '123-4',
      });
      const toUser = UserFactory.build({
        id: 'uuid-maria',
        name: 'Maria',
        account: '2222-2',
        branch: '001-1',
      });

      const transfer = TransferFactory.build({
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        fromUser,
        toUser,
        amount: 100,
        createdAt: new Date('2026-11-18T15:18:31.000Z'),
      });

      mockQb.getManyAndCount.mockResolvedValue([[transfer], 1]);

      const query = {
        page: 1,
        limit: 10,
        short: true,
      } as GetTransfersQueryDto;

      const result = await service.findAll('uuid-admin', query);

      expect(result.data[0]).toEqual({
        senderName: 'Luciano',
        receiverName: 'Maria',
        amount: 100,
        createdAt: new Date('2026-11-18T15:18:31.000Z'),
        type: 'sent',
      });
    });

    it('deve retornar short com type=received quando eu recebi', async () => {
      const fromUser = UserFactory.build({
        id: 'uuid-maria',
        name: 'Maria',
        account: '2222-2',
        branch: '001-1',
      });
      const toUser = UserFactory.build({
        id: 'uuid-admin',
        name: 'Luciano',
        account: '12343-4',
        branch: '123-4',
      });

      const transfer = TransferFactory.build({
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        fromUser,
        toUser,
        amount: 50,
      });

      mockQb.getManyAndCount.mockResolvedValue([[transfer], 1]);

      const query = {
        page: 1,
        limit: 10,
        short: true,
      } as GetTransfersQueryDto;

      const result = await service.findAll('uuid-admin', query);

      expect(result.data[0]).toEqual(
        expect.objectContaining({
          senderName: 'Maria',
          receiverName: 'Luciano',
          type: 'received',
        }),
      );
    });
  });
});
