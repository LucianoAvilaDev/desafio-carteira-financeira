import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { User } from '../users/entities/user.entity.js';
import {
  RegisterDtoFactory,
  LoginDtoFactory,
} from './factories/auth.factory.js';
import { UserFactory } from '../users/factories/user.factory.js';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn<(dto: RegisterDto) => Promise<User>>(),
    login:
      jest.fn<
        (dto: LoginDto) => Promise<{ access_token: string; user: User }>
      >(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('deve chamar authService.register com o DTO e retornar o resultado', async () => {
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

      const expectedResult = UserFactory.build({
        name: dto.name,
        email: dto.email,
        balance: 0,
        account: dto.account,
        branch: dto.branch,
      });

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(service.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
      expect(result.account).toBe(account);
      expect(result.branch).toBe(branch);
    });

    it('deve repassar amount, account e branch para o service', async () => {
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

      const expectedResult = UserFactory.build({
        name: dto.name,
        email: dto.email,
        balance: 1000,
        account: dto.account,
        branch: dto.branch,
      });

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(service.register).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1000, account, branch }),
      );
      expect(result).toEqual(expectedResult);
      expect(Number(result.balance)).toBe(1000);
      expect(result.branch).toBe(branch);
    });

    it('deve repassar o erro se o service falhar', async () => {
      const dto: RegisterDto = RegisterDtoFactory.build({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        amount: 500,
        account: '12343-4',
        branch: '123-4',
      });

      mockAuthService.register.mockRejectedValue(
        new Error('Email já cadastrado'),
      );

      await expect(controller.register(dto)).rejects.toThrow(
        'Email já cadastrado',
      );
      expect(service.register).toHaveBeenCalledWith(
        expect.objectContaining({ account: '12343-4', branch: '123-4' }),
      );
    });
  });

  describe('login', () => {
    it('deve chamar authService.login com o DTO e retornar o token', async () => {
      const dto: LoginDto = LoginDtoFactory.build({
        email: 'luciano@teste.com',
        password: '123456',
      });

      const user = UserFactory.build({
        name: 'Luciano',
        email: dto.email,
        balance: 1000,
        account: '12343-4',
        branch: '123-4',
      });

      const expectedResult = { access_token: 'token-falso', user };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(dto);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(service.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
      expect(result.access_token).toBeDefined();
      expect(result.user.account).toBe('12343-4');
      expect(result.user.branch).toBe('123-4');
    });

    it('deve repassar o erro se a senha estiver errada', async () => {
      const dto: LoginDto = LoginDtoFactory.build({
        email: 'luciano@teste.com',
        password: 'senha-errada',
      });

      mockAuthService.login.mockRejectedValue(
        new Error('Credenciais inválidas'),
      );

      await expect(controller.login(dto)).rejects.toThrow(
        'Credenciais inválidas',
      );
    });
  });
});
