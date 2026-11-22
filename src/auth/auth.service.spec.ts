import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { User } from '../users/entities/user.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import {
  RegisterDtoFactory,
  LoginDtoFactory,
} from './factories/auth.factory.js';
import { UserFactory } from '../users/factories/user.factory.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersRepository = {
    findOne:
      jest.fn<
        (options: {
          where: { email?: string; account?: string; branch?: string };
          select?: Record<string, boolean>;
        }) => Promise<User | null>
      >(),
    create: jest.fn<(data: Partial<User>) => User>(),
    save: jest.fn<(user: User) => Promise<User>>(),
  };

  const mockJwtService = {
    sign: jest.fn<(payload: { sub: string; email: string }) => string>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('deve criar usuário com senha criptografada e saldo 0, sem devolver a senha', async () => {
      const account = '12343-4';
      const branch = '123-4';
      const dto: RegisterDto = RegisterDtoFactory.build({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        amount: 0,
        account,
        branch,
      });

      mockUsersRepository.findOne.mockResolvedValue(null);

      mockUsersRepository.create.mockImplementation(
        (data) => ({ id: 'uuid-123', ...data }) as User,
      );
      mockUsersRepository.save.mockImplementation(async (user) => user);

      const result = await service.register(dto);

      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { account: dto.account, branch: dto.branch },
      });

      const createArg = mockUsersRepository.create.mock.calls[0][0];
      expect(createArg.balance).toBe(0);
      expect(createArg.name).toBe('Luciano');
      expect(createArg.email).toBe('luciano@teste.com');
      expect(createArg.account).toBe(account);
      expect(createArg.branch).toBe(branch);
      expect(createArg.password).not.toBe('123456');

      const isHashValid = await bcrypt.compare(
        '123456',
        createArg.password as string,
      );
      expect(isHashValid).toBe(true);

      expect(result).not.toHaveProperty('password');
      expect(result).toEqual(
        expect.objectContaining({
          id: 'uuid-123',
          name: 'Luciano',
          email: 'luciano@teste.com',
          balance: 0,
          account,
          branch,
        }),
      );
    });

    it('deve criar usuário com o amount informado como saldo inicial', async () => {
      const account = '12343-4';
      const branch = '123-4';
      const dto: RegisterDto = RegisterDtoFactory.build({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        amount: 1000,
        account,
        branch,
      });

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockImplementation(
        (data) => ({ id: 'uuid-123', ...data }) as User,
      );
      mockUsersRepository.save.mockImplementation(async (user) => user);

      const result = await service.register(dto);

      const createArg = mockUsersRepository.create.mock.calls[0][0];
      expect(createArg.balance).toBe(1000);
      expect(createArg.account).toBe(account);
      expect(createArg.branch).toBe(branch);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'uuid-123',
          name: 'Luciano',
          email: 'luciano@teste.com',
          balance: 1000,
          account,
          branch,
        }),
      );
    });

    it('deve criar usuário com saldo 0 quando amount for 0', async () => {
      const dto: RegisterDto = RegisterDtoFactory.build({
        name: 'Maria',
        email: 'maria@teste.com',
        password: '123456',
        amount: 0,
        account: '2222-2',
        branch: '001-1',
      });

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockImplementation(
        (data) => ({ id: 'uuid-123', ...data }) as User,
      );
      mockUsersRepository.save.mockImplementation(async (user) => user);

      const result = await service.register(dto);

      const createArg = mockUsersRepository.create.mock.calls[0][0];
      expect(createArg.balance).toBe(0);
      expect(createArg.account).toBe('2222-2');
      expect(createArg.branch).toBe('001-1');
      expect(Number(result.balance)).toBe(0);
      expect(result.branch).toBe('001-1');
    });

    it('deve jogar ConflictException se o email já existir', async () => {
      const dto: RegisterDto = RegisterDtoFactory.build({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        amount: 500,
        account: '12343-4',
        branch: '123-4',
      });

      const existente = UserFactory.build({
        id: 'uuid-123',
        email: dto.email,
        account: '1111-1',
        branch: '001-1',
      });

      mockUsersRepository.findOne.mockImplementation(async ({ where }) => {
        if (where.email === dto.email) return existente;
        return null;
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow(
        'Email já cadastrado',
      );

      expect(mockUsersRepository.create).not.toHaveBeenCalled();
      expect(mockUsersRepository.save).not.toHaveBeenCalled();
    });

    it('deve jogar ConflictException se o par conta + agência já existir', async () => {
      const dto: RegisterDto = RegisterDtoFactory.build({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        amount: 500,
        account: '12343-4',
        branch: '123-4',
      });

      const contaExistente = UserFactory.build({
        id: 'uuid-999',
        email: 'outro@teste.com',
        account: '12343-4',
        branch: '123-4',
      });

      mockUsersRepository.findOne.mockImplementation(async ({ where }) => {
        if (where.email) return null;
        if (where.account === '12343-4' && where.branch === '123-4') {
          return contaExistente;
        }
        return null;
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow(
        'Conta já cadastrada',
      );

      expect(mockUsersRepository.create).not.toHaveBeenCalled();
      expect(mockUsersRepository.save).not.toHaveBeenCalled();
    });

    it('deve permitir mesma conta com agência diferente', async () => {
      const dto: RegisterDto = RegisterDtoFactory.build({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        amount: 0,
        account: '12343-4',
        branch: '999-9',
      });

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockImplementation(
        (data) => ({ id: 'uuid-123', ...data }) as User,
      );
      mockUsersRepository.save.mockImplementation(async (user) => user);

      const result = await service.register(dto);

      expect(result.account).toBe('12343-4');
      expect(result.branch).toBe('999-9');
      expect(mockUsersRepository.create).toHaveBeenCalledTimes(1);
    });

    it('deve permitir mesma agência com conta diferente', async () => {
      const dto: RegisterDto = RegisterDtoFactory.build({
        name: 'Maria',
        email: 'maria@teste.com',
        password: '123456',
        amount: 0,
        account: '5555-5',
        branch: '123-4',
      });

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockImplementation(
        (data) => ({ id: 'uuid-123', ...data }) as User,
      );
      mockUsersRepository.save.mockImplementation(async (user) => user);

      const result = await service.register(dto);

      expect(result.account).toBe('5555-5');
      expect(result.branch).toBe('123-4');
    });
  });

  describe('login', () => {
    it('deve retornar access_token quando email e senha estiverem certos', async () => {
      const hashed = await bcrypt.hash('123456', 10);

      const dto: LoginDto = LoginDtoFactory.build({
        email: 'luciano@teste.com',
        password: '123456',
      });

      const user = UserFactory.build({
        id: 'uuid-123',
        name: 'Luciano',
        email: dto.email,
        password: hashed,
        balance: 1000,
        account: '12343-4',
        branch: '123-4',
      });

      mockUsersRepository.findOne.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('token-falso');

      const result = await service.login(dto);

      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          balance: true,
          account: true,
          branch: true,
        },
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-123',
        email: 'luciano@teste.com',
      });

      expect(result).toEqual({
        access_token: 'token-falso',
        user: expect.objectContaining({
          id: 'uuid-123',
          email: 'luciano@teste.com',
          account: '12343-4',
          branch: '123-4',
          balance: 1000,
        }),
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('deve jogar UnauthorizedException se o usuário não existir', async () => {
      const dto: LoginDto = LoginDtoFactory.build({
        email: 'naoexiste@teste.com',
        password: '123456',
      });

      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        'Email ou senha inválidos',
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('deve jogar UnauthorizedException se a senha estiver errada', async () => {
      const hashed = await bcrypt.hash('123456', 10);

      const dto: LoginDto = LoginDtoFactory.build({
        email: 'luciano@teste.com',
        password: 'senha-errada',
      });

      const user = UserFactory.build({
        id: 'uuid-123',
        name: 'Luciano',
        email: dto.email,
        password: hashed,
        balance: 1000,
        account: '12343-4',
        branch: '123-4',
      });

      mockUsersRepository.findOne.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        'Email ou senha inválidos',
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });
});
