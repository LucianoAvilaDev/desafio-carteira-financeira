import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { TransfersController } from './transfers.controller.js';
import { TransfersService } from './transfers.service.js';
import { Transfer, TransferStatus } from './entities/transfer.entity.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { GetTransfersQueryDto } from './dto/get-transfers-query.dto.js';
import { TransferResponseDto } from './dto/transfer-response.dto.js';
import { UserFactory } from '../users/factories/user.factory.js';
import { TransferFactory } from './factories/transfer.factory.js';

describe('TransfersController', () => {
  let controller: TransfersController;
  let service: TransfersService;

  const mockTransfersService = {
    create:
      jest.fn<
        (fromUserId: string, dto: CreateTransferDto) => Promise<Transfer>
      >(),
    findAll: jest.fn<
      (
        userId: string,
        query: GetTransfersQueryDto,
      ) => Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
      }>
    >(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransfersController],
      providers: [
        {
          provide: TransfersService,
          useValue: mockTransfersService,
        },
      ],
    }).compile();

    controller = module.get<TransfersController>(TransfersController);
    service = module.get<TransfersService>(TransfersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create - POST /transfers', () => {
    it('deve chamar create com o id do token + DTO e retornar sem senha', async () => {
      const fromUser = UserFactory.build({
        id: 'uuid-admin',
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: 'hash-secreto',
        balance: 900,
        account: '12343-4',
        branch: '123-4',
      });

      const toUser = UserFactory.build({
        id: 'uuid-maria',
        name: 'Maria',
        email: 'maria@teste.com',
        password: 'hash-secreto',
        balance: 600,
        account: '2222-2',
        branch: '001-1',
      });

      expect(fromUser.branch).toBe('123-4');
      expect(toUser.branch).toBe('001-1');
      expect(fromUser.account).toBe('12343-4');

      const dto: CreateTransferDto = {
        account: toUser.account,
        branch: toUser.branch,
        amount: 100,
      };

      const transferFromService = TransferFactory.build({
        id: 'uuid-transfer',
        amount: 100,
        status: TransferStatus.COMPLETED,
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        fromUser,
        toUser,
        createdAt: new Date('2026-11-18T15:18:31.000Z'),
      });

      mockTransfersService.create.mockResolvedValue(transferFromService);

      const req = { user: { sub: 'uuid-admin', email: 'luciano@teste.com' } };

      const result = await controller.create(req, dto);

      expect(service.create).toHaveBeenCalledWith('uuid-admin', dto);
      expect(service.create).toHaveBeenCalledTimes(1);

      expect(result.id).toBe('uuid-transfer');
      expect(Number(result.amount)).toBe(100);
      expect(result.status).toBe('COMPLETED');

      expect(result.fromUser).not.toHaveProperty('password');
      expect(result.toUser).not.toHaveProperty('password');
      expect(result.fromUser).toEqual(
        expect.objectContaining({
          id: 'uuid-admin',
          name: 'Luciano',
          email: 'luciano@teste.com',
          account: '12343-4',
          branch: '123-4',
        }),
      );
      expect(result.toUser).toEqual(
        expect.objectContaining({
          id: 'uuid-maria',
          name: 'Maria',
          email: 'maria@teste.com',
          account: '2222-2',
          branch: '001-1',
        }),
      );
    });

    it('deve repassar o erro se o service falhar (saldo insuficiente)', async () => {
      const toUser = UserFactory.build({
        account: '2222-2',
        branch: '001-1',
      });

      const dto: CreateTransferDto = {
        account: toUser.account,
        branch: toUser.branch,
        amount: 2000,
      };

      mockTransfersService.create.mockRejectedValue(
        new Error('Saldo insuficiente'),
      );

      const req = { user: { sub: 'uuid-admin' } };

      await expect(controller.create(req, dto)).rejects.toThrow(
        'Saldo insuficiente',
      );
      expect(service.create).toHaveBeenCalledWith('uuid-admin', dto);
    });

    it('deve repassar o erro se tentar transferir para si mesmo', async () => {
      const fromUser = UserFactory.build({
        id: 'uuid-admin',
        account: '12343-4',
        branch: '123-4',
      });

      const dto: CreateTransferDto = {
        account: fromUser.account,
        branch: fromUser.branch,
        amount: 100,
      };

      mockTransfersService.create.mockRejectedValue(
        new Error('Você não pode transferir para você mesmo'),
      );

      const req = { user: { sub: 'uuid-admin' } };

      await expect(controller.create(req, dto)).rejects.toThrow(
        'Você não pode transferir para você mesmo',
      );
    });

    it('deve repassar o erro se a conta de destino não existir', async () => {
      const dto: CreateTransferDto = {
        account: '9999-9',
        branch: '999-9',
        amount: 100,
      };

      mockTransfersService.create.mockRejectedValue(
        new Error('Conta de destino não encontrada para essa agência'),
      );

      const req = { user: { sub: 'uuid-admin' } };

      await expect(controller.create(req, dto)).rejects.toThrow(
        'Conta de destino não encontrada',
      );
    });
  });

  describe('findAll - GET /transfers', () => {
    it('deve chamar findAll com o id do token + query e mapear para DTO', async () => {
      const query: GetTransfersQueryDto = {
        page: 1,
        limit: 10,
      } as GetTransfersQueryDto;

      const fromUser = UserFactory.build({
        id: 'uuid-admin',
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: 'hash-secreto',
        account: '12343-4',
        branch: '123-4',
      });
      const toUser = UserFactory.build({
        id: 'uuid-maria',
        name: 'Maria',
        email: 'maria@teste.com',
        password: 'hash-secreto',
        account: '2222-2',
        branch: '001-1',
      });

      const transfer = TransferFactory.build({
        id: 'uuid-transfer',
        amount: 100,
        status: TransferStatus.COMPLETED,
        fromUser,
        toUser,
      });

      mockTransfersService.findAll.mockResolvedValue({
        data: [transfer],
        total: 1,
        page: 1,
        limit: 10,
      });

      const req = { user: { sub: 'uuid-admin' } };

      const result = await controller.findAll(req, query);
      const first = result.data[0] as TransferResponseDto;

      expect(service.findAll).toHaveBeenCalledWith('uuid-admin', query);
      expect(service.findAll).toHaveBeenCalledTimes(1);

      expect(result.data).toHaveLength(1);
      expect(first).toEqual(
        expect.objectContaining({
          id: 'uuid-transfer',
          amount: 100,
          status: 'COMPLETED',
        }),
      );
      expect(first.fromUser).not.toHaveProperty('password');
      expect(first.fromUser).toEqual(
        expect.objectContaining({ account: '12343-4', branch: '123-4' }),
      );
      expect(first.toUser).toEqual(
        expect.objectContaining({ account: '2222-2', branch: '001-1' }),
      );
      expect(result.total).toBe(1);
    });

    it('deve funcionar com filtro de type=sent', async () => {
      const query = {
        page: 1,
        limit: 10,
        type: 'sent',
      } as GetTransfersQueryDto;

      mockTransfersService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const req = { user: { sub: 'uuid-admin' } };

      await controller.findAll(req, query);

      expect(service.findAll).toHaveBeenCalledWith('uuid-admin', query);
    });

    it('deve funcionar com filtro de account + branch', async () => {
      const toUser = UserFactory.build({
        account: '2222-2',
        branch: '001-1',
      });

      const query = {
        page: 1,
        limit: 10,
        account: toUser.account,
        branch: toUser.branch,
      } as GetTransfersQueryDto;

      mockTransfersService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const req = { user: { sub: 'uuid-admin' } };

      await controller.findAll(req, query);

      expect(service.findAll).toHaveBeenCalledWith(
        'uuid-admin',
        expect.objectContaining({ account: '2222-2', branch: '001-1' }),
      );
    });

    it('deve funcionar com short=true sem mapear para DTO', async () => {
      const query = {
        page: 1,
        limit: 10,
        short: true,
      } as GetTransfersQueryDto;

      const shortResult = {
        data: [
          {
            senderName: 'Luciano',
            receiverName: 'Maria',
            amount: 100,
            createdAt: new Date('2026-11-18T15:18:31.000Z'),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockTransfersService.findAll.mockResolvedValue(shortResult as any);

      const req = { user: { sub: 'uuid-admin' } };

      const result = await controller.findAll(req, query);

      expect(service.findAll).toHaveBeenCalledWith('uuid-admin', query);
      expect(result).toEqual(shortResult);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          senderName: 'Luciano',
          receiverName: 'Maria',
        }),
      );
    });
  });
});
