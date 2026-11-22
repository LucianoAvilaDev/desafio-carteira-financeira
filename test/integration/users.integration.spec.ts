import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transfer } from '../../src/transfers/entities/transfer.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { UsersService } from '../../src/users/users.service.js';
import { GetUsersQueryDto } from '../../src/users/dto/get-users-query.dto.js';
import { UserFactory } from '../../src/users/factories/user.factory.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });

describe('UsersService - Integração (carteira_test)', () => {
  let service: UsersService;
  let usersRepository: Repository<User>;
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
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
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

  it('deve buscar usuário por id com findById', async () => {
    const criado = await criarUsuario({
      name: 'Maria',
      email: 'maria@teste.com',
    });
    const achado = await service.findById(criado.id);
    expect(achado.email).toBe('maria@teste.com');
    expect(achado.account).toBe(criado.account);
    expect(achado.branch).toBe(criado.branch);
  });

  it('deve jogar NotFoundException se id não existir', async () => {
    await expect(
      service.findById('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow('Usuário não encontrado');
  });

  it('deve listar com paginação', async () => {
    await criarUsuario({ email: 'a@teste.com' });
    await criarUsuario({ email: 'b@teste.com' });
    const query: GetUsersQueryDto = { page: 1, limit: 10 };
    const result = await service.findAll(query);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
  });

  it('deve filtrar por search no name e no email', async () => {
    await criarUsuario({ name: 'Luciano Avila', email: 'luciano@teste.com' });
    await criarUsuario({ name: 'Maria Silva', email: 'maria@teste.com' });

    const queryPorNome: GetUsersQueryDto = {
      page: 1,
      limit: 10,
      search: 'luciano',
    };
    const porNome = await service.findAll(queryPorNome);
    expect(porNome.total).toBe(1);

    const queryPorEmail: GetUsersQueryDto = {
      page: 1,
      limit: 10,
      search: 'maria@teste.com',
    };
    const porEmail = await service.findAll(queryPorEmail);
    expect(porEmail.total).toBe(1);
  });

  it('deve filtrar por search na conta e na agência', async () => {
    const luciano = await criarUsuario({
      name: 'Luciano',
      email: 'luciano@teste.com',
    });
    await criarUsuario({ name: 'Maria', email: 'maria@teste.com' });

    const porConta = await service.findAll({
      page: 1,
      limit: 10,
      search: luciano.account,
    } as GetUsersQueryDto);
    expect(porConta.total).toBe(1);
    expect(porConta.data[0].id).toBe(luciano.id);

    const porAgencia = await service.findAll({
      page: 1,
      limit: 10,
      search: luciano.branch,
    } as GetUsersQueryDto);
    expect(porAgencia.total).toBeGreaterThanOrEqual(1);
    expect(porAgencia.data.map((u) => u.id)).toContain(luciano.id);
  });

  it('deve filtrar por account e branch exatos', async () => {
    const luciano = await criarUsuario({
      name: 'Luciano',
      email: 'luciano@teste.com',
    });
    await criarUsuario({ name: 'Maria', email: 'maria@teste.com' });

    const result = await service.findAll({
      page: 1,
      limit: 10,
      account: luciano.account,
      branch: luciano.branch,
    } as GetUsersQueryDto);

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe(luciano.id);
  });

  it('deve devolver os usuários com id, account e branch', async () => {
    await criarUsuario({ email: 'maria@teste.com' });
    const query: GetUsersQueryDto = { page: 1, limit: 10 };
    const result = await service.findAll(query);
    expect(result.data[0]).toHaveProperty('id');
    expect(result.data[0]).toHaveProperty('account');
    expect(result.data[0]).toHaveProperty('branch');
    expect(result.data[0]).toHaveProperty('email');
  });

  it('deve criar vários usuários de uma vez com a factory', async () => {
    const users = UserFactory.buildList(5);

    for (let i = 0; i < users.length; i++) {
      const base = 20000 + i;
      await usersRepository.save({
        ...users[i],
        email: `bulk-${i}@teste.com`,
        account: `${base}-${i % 10}`,
        branch: `01${i % 10}-1`,
      });
    }

    const query: GetUsersQueryDto = { page: 1, limit: 10 };
    const result = await service.findAll(query);
    expect(result.total).toBe(5);
  });
});
