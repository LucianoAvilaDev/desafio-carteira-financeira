import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service.js';
import { Transfer } from '../../src/transfers/entities/transfer.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { UsersService } from '../../src/users/users.service.js';
import {
  RegisterDtoFactory,
  LoginDtoFactory,
} from '../../src/auth/factories/auth.factory.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });

describe('AuthService - Integração (carteira_test)', () => {
  let service: AuthService;
  let usersRepository: Repository<User>;
  let dataSource: DataSource;
  let module: TestingModule;

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
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [AuthService, UsersService],
    }).compile();

    service = module.get<AuthService>(AuthService);
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

  it('deve registrar e salvar com senha hash', async () => {
    const dto = RegisterDtoFactory.build({
      name: 'Luciano',
      email: 'luciano@teste.com',
      password: '123456',
      account: '23434-4',
      branch: '123-4',
    });

    const result = await service.register(dto);

    expect(result.id).toBeDefined();
    expect(result.email).toBe(dto.email);
    expect(result.account).toBe('23434-4');
    expect(result.branch).toBe('123-4');

    const salvo = await usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    expect(salvo).toBeDefined();
    expect(salvo!.password).not.toBe('123456');
    expect(salvo!.password.length).toBeGreaterThan(20);
  });

  it('deve registrar com o amount informado como saldo inicial no banco', async () => {
    const dto = RegisterDtoFactory.build({
      name: 'Luciano',
      email: 'luciano@teste.com',
      password: '123456',
      account: '23434-4',
      branch: '123-4',
      amount: 1000,
    });

    const result = await service.register(dto);

    expect(Number(result.balance)).toBe(1000);

    const salvo = await usersRepository.findOne({
      where: { email: dto.email },
    });

    expect(salvo).toBeDefined();
    expect(Number(salvo!.balance)).toBe(1000);
  });

  it('deve registrar com saldo 0 quando não informar o amount', async () => {
    const dtoComAmount = RegisterDtoFactory.build({
      name: 'Maria',
      email: 'maria@teste.com',
      password: '123456',
      account: '22222-2',
      branch: '001-1',
      amount: 999,
    });
    const { amount: _amount, ...dto } = dtoComAmount;

    const result = await service.register(dto);

    expect(Number(result.balance)).toBe(0);

    const salvo = await usersRepository.findOne({
      where: { email: dto.email },
    });

    expect(Number(salvo!.balance)).toBe(0);
  });

  it('deve registrar com saldo 0 quando amount for 0', async () => {
    const dto = RegisterDtoFactory.build({
      name: 'Maria',
      email: 'maria@teste.com',
      password: '123456',
      account: '22222-2',
      branch: '001-1',
      amount: 0,
    });

    const result = await service.register(dto);

    expect(Number(result.balance)).toBe(0);
  });

  it('deve jogar ConflictException se email já existir', async () => {
    const dto = RegisterDtoFactory.build({
      name: 'Luciano',
      email: 'luciano@teste.com',
      password: '123456',
      account: '23434-4',
      branch: '123-4',
    });

    await service.register(dto);

    const dtoDuplicado = RegisterDtoFactory.build({
      name: 'Outro',
      email: dto.email,
      password: '123456',
      account: '99999-9',
      branch: '999-9',
    });

    await expect(service.register(dtoDuplicado)).rejects.toThrow(
      ConflictException,
    );
  });

  it('deve jogar ConflictException se o par conta + agência já existir', async () => {
    const dto = RegisterDtoFactory.build({
      name: 'Luciano',
      email: 'luciano@teste.com',
      password: '123456',
      account: '23434-4',
      branch: '123-4',
    });

    await service.register(dto);

    const dtoDuplicado = RegisterDtoFactory.build({
      name: 'Outro',
      email: 'outro@teste.com',
      password: '123456',
      account: '23434-4',
      branch: '123-4',
    });

    await expect(service.register(dtoDuplicado)).rejects.toThrow(
      ConflictException,
    );
  });

  it('deve permitir mesma conta com agência diferente', async () => {
    const dto = RegisterDtoFactory.build({
      name: 'Luciano',
      email: 'luciano@teste.com',
      password: '123456',
      account: '23434-4',
      branch: '123-4',
    });

    await service.register(dto);

    const dtoOutro = RegisterDtoFactory.build({
      name: 'Outro',
      email: 'outro@teste.com',
      password: '123456',
      account: '23434-4',
      branch: '999-9',
    });

    const result = await service.register(dtoOutro);

    expect(result.id).toBeDefined();
    expect(result.account).toBe('23434-4');
    expect(result.branch).toBe('999-9');
  });

  it('deve fazer login e devolver token', async () => {
    const dto = RegisterDtoFactory.build({
      name: 'Luciano',
      email: 'luciano@teste.com',
      password: '123456',
      account: '23434-4',
      branch: '123-4',
    });

    await service.register(dto);

    const loginDto = LoginDtoFactory.build({
      email: dto.email,
      password: '123456',
    });

    const result = await service.login(loginDto);
    expect(result.access_token).toBeDefined();
  });

  it('deve jogar UnauthorizedException com senha errada', async () => {
    const dto = RegisterDtoFactory.build({
      name: 'Luciano',
      email: 'luciano@teste.com',
      password: '123456',
      account: '23434-4',
      branch: '123-4',
    });

    await service.register(dto);

    const loginDto = LoginDtoFactory.build({
      email: dto.email,
      password: 'errada',
    });

    await expect(service.login(loginDto)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('deve fazer login com usuário criado direto pela factory no banco', async () => {
    const dto = RegisterDtoFactory.build({
      name: 'Luciano',
      email: 'luciano@teste.com',
      password: '123456',
      account: '23434-4',
      branch: '123-4',
      amount: 1000,
    });

    await service.register(dto);

    const loginDto = LoginDtoFactory.build({
      email: dto.email,
      password: '123456',
    });

    const result = await service.login(loginDto);
    expect(result.access_token).toBeDefined();
  });
});
