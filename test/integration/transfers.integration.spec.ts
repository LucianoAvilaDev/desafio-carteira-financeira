import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Transfer } from '../../src/transfers/entities/transfer.entity.js';
import { TransfersService } from '../../src/transfers/transfers.service.js';
import { CreateTransferDto } from '../../src/transfers/dto/create-transfer.dto.js';
import { GetTransfersQueryDto } from '../../src/transfers/dto/get-transfers-query.dto.js';
import { User } from '../../src/users/entities/user.entity.js';
import { UserFactory } from '../../src/users/factories/user.factory.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });

describe('TransfersService - Integração (carteira_test)', () => {
  let service: TransfersService;
  let usersRepository: Repository<User>;
  let transfersRepository: Repository<Transfer>;
  let dataSource: DataSource;
  let module: TestingModule;
  let counter = 0;

  async function criarUsuario(dados: Partial<User> = {}) {
    counter += 1;
    const base = 10000 + counter;
    const user = UserFactory.build({
      balance: 1000,
      account: `${base}-${counter % 10}`,
      branch: `00${counter % 10}-1`,
      ...dados,
    });
    return usersRepository.save(user);
  }

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: Number(process.env.DB_PORT) || 5432,
          username: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: 'carteira_test',
          entities: [User, Transfer],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([User, Transfer]),
      ],
      providers: [TransfersService],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    transfersRepository = module.get<Repository<Transfer>>(
      getRepositoryToken(Transfer),
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    const tables = dataSource.entityMetadatas
      .map((m) => `"${m.tableName}"`)
      .join(', ');
    if (tables) {
      await dataSource.query(
        `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`,
      );
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deve transferir e atualizar os 2 saldos no banco', async () => {
    const fromUser = await criarUsuario({ balance: 1000 });
    const toUser = await criarUsuario({ balance: 500 });

    const dto: CreateTransferDto = {
      account: toUser.account,
      branch: toUser.branch,
      amount: 100,
    };
    const transfer = await service.create(fromUser.id, dto);

    expect(Number(transfer.amount)).toBe(100);

    const fromAtualizado = await usersRepository.findOneBy({ id: fromUser.id });
    const toAtualizado = await usersRepository.findOneBy({ id: toUser.id });
    expect(Number(fromAtualizado!.balance)).toBe(900);
    expect(Number(toAtualizado!.balance)).toBe(600);
    expect(await transfersRepository.count()).toBe(1);
  });

  it('deve jogar BadRequestException se saldo insuficiente e NÃO mudar saldo', async () => {
    const fromUser = await criarUsuario({ balance: 50 });
    const toUser = await criarUsuario({ balance: 500 });

    const dto: CreateTransferDto = {
      account: toUser.account,
      branch: toUser.branch,
      amount: 200,
    };
    await expect(service.create(fromUser.id, dto)).rejects.toThrow(
      BadRequestException,
    );

    const fromAtualizado = await usersRepository.findOneBy({ id: fromUser.id });
    const toAtualizado = await usersRepository.findOneBy({ id: toUser.id });
    expect(Number(fromAtualizado!.balance)).toBe(50);
    expect(Number(toAtualizado!.balance)).toBe(500);
    expect(await transfersRepository.count()).toBe(0);
  });

  it('deve jogar BadRequestException se transferir para si mesmo', async () => {
    const user = await criarUsuario({ balance: 1000 });

    const dto: CreateTransferDto = {
      account: user.account,
      branch: user.branch,
      amount: 100,
    };
    await expect(service.create(user.id, dto)).rejects.toThrow(
      'Você não pode transferir para você mesmo',
    );
  });

  it('deve jogar NotFoundException se quem recebe não existir', async () => {
    const fromUser = await criarUsuario({ balance: 1000 });

    const dto: CreateTransferDto = {
      account: '99999-9',
      branch: '999-9',
      amount: 100,
    };
    await expect(service.create(fromUser.id, dto)).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.create(fromUser.id, dto)).rejects.toThrow(
      'Conta de destino não encontrada para essa agência',
    );
  });

  it('deve lidar com decimal do Postgres como string', async () => {
    const fromUser = await criarUsuario({ balance: 1000 });
    const toUser = await criarUsuario({ balance: 500 });

    const dto: CreateTransferDto = {
      account: toUser.account,
      branch: toUser.branch,
      amount: 100.55,
    };
    await service.create(fromUser.id, dto);

    const fromAtualizado = await usersRepository.findOneBy({ id: fromUser.id });
    const toAtualizado = await usersRepository.findOneBy({ id: toUser.id });
    expect(Number(fromAtualizado!.balance)).toBe(899.45);
    expect(Number(toAtualizado!.balance)).toBe(600.55);
  });

  it('deve retornar só as transferências do usuário logado', async () => {
    const luciano = await criarUsuario({ name: 'Luciano', balance: 1000 });
    const maria = await criarUsuario({ name: 'Maria', balance: 1000 });
    const outro = await criarUsuario({ name: 'Outro', balance: 1000 });

    await service.create(luciano.id, {
      account: maria.account,
      branch: maria.branch,
      amount: 100,
    });
    await service.create(maria.id, {
      account: luciano.account,
      branch: luciano.branch,
      amount: 50,
    });
    await service.create(outro.id, {
      account: maria.account,
      branch: maria.branch,
      amount: 999,
    });

    const query: GetTransfersQueryDto = { page: 1, limit: 10 };
    const result = await service.findAll(luciano.id, query);
    expect(result.total).toBe(2);
  });

  it('deve filtrar por type=sent e type=received', async () => {
    const luciano = await criarUsuario({ name: 'Luciano', balance: 1000 });
    const maria = await criarUsuario({ name: 'Maria', balance: 1000 });

    await service.create(luciano.id, {
      account: maria.account,
      branch: maria.branch,
      amount: 100,
    });
    await service.create(maria.id, {
      account: luciano.account,
      branch: luciano.branch,
      amount: 50,
    });

    const sentQuery: GetTransfersQueryDto = {
      page: 1,
      limit: 10,
      type: 'sent',
    };
    const sent = await service.findAll(luciano.id, sentQuery);
    expect(sent.total).toBe(1);

    const receivedQuery: GetTransfersQueryDto = {
      page: 1,
      limit: 10,
      type: 'received',
    };
    const received = await service.findAll(luciano.id, receivedQuery);
    expect(received.total).toBe(1);
  });

  it('deve filtrar por account + branch', async () => {
    const luciano = await criarUsuario({ name: 'Luciano', balance: 1000 });
    const maria = await criarUsuario({ name: 'Maria', balance: 1000 });
    const outro = await criarUsuario({ name: 'Outro', balance: 1000 });

    await service.create(luciano.id, {
      account: maria.account,
      branch: maria.branch,
      amount: 100,
    });
    await service.create(luciano.id, {
      account: outro.account,
      branch: outro.branch,
      amount: 50,
    });

    const query: GetTransfersQueryDto = {
      page: 1,
      limit: 10,
      account: maria.account,
      branch: maria.branch,
    };
    const result = await service.findAll(luciano.id, query);
    expect(result.total).toBe(1);
  });

  it('deve paginar corretamente', async () => {
    const luciano = await criarUsuario({ balance: 10000 });
    const maria = await criarUsuario({ balance: 1000 });

    for (let i = 0; i < 15; i++) {
      await service.create(luciano.id, {
        account: maria.account,
        branch: maria.branch,
        amount: 10,
      });
    }

    const page1Query: GetTransfersQueryDto = { page: 1, limit: 10 };
    const page2Query: GetTransfersQueryDto = { page: 2, limit: 10 };
    const page1 = await service.findAll(luciano.id, page1Query);
    const page2 = await service.findAll(luciano.id, page2Query);
    expect(page1.data).toHaveLength(10);
    expect(page2.data).toHaveLength(5);
    expect(page1.totalPages).toBe(2);
  });

  it('deve retornar short com senderName, receiverName, amount, createdAt e type', async () => {
    const luciano = await criarUsuario({ name: 'Luciano', balance: 1000 });
    const maria = await criarUsuario({ name: 'Maria', balance: 1000 });

    await service.create(luciano.id, {
      account: maria.account,
      branch: maria.branch,
      amount: 100,
    });

    const query: GetTransfersQueryDto = {
      page: 1,
      limit: 10,
      short: true,
    };
    const result = await service.findAll(luciano.id, query);

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        senderName: 'Luciano',
        receiverName: 'Maria',
        amount: 100,
        type: 'sent',
      }),
    );
    expect(result.data[0]).toHaveProperty('createdAt');
  });
});
