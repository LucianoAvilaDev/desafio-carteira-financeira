import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { GetUserByIdDto } from './dto/get-user-by-id.dto.js';
import { GetUsersQueryDto } from './dto/get-users-query.dto.js';
import { User } from './entities/user.entity.js';
import { UserFactory } from './factories/user.factory.js';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findById: jest.fn<(id: string) => Promise<User>>(),
    findAll: jest.fn<
      (query: GetUsersQueryDto) => Promise<{
        data: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>
    >(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe - GET /users/me', () => {
    it('deve chamar findById com o id do token e retornar sem senha', async () => {
      const userFromDb = UserFactory.build({
        id: 'uuid-admin',
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: 'hash-secreto',
        balance: 1000,
        account: '23434-4',
        branch: '123-4',
      });

      mockUsersService.findById.mockResolvedValue(userFromDb);

      const req = { user: { id: 'uuid-admin', email: 'luciano@teste.com' } };

      const result = await controller.getMe(req);

      expect(service.findById).toHaveBeenCalledWith('uuid-admin');
      expect(service.findById).toHaveBeenCalledTimes(1);

      expect(result).not.toHaveProperty('password');
      expect(result).toEqual(
        expect.objectContaining({
          id: 'uuid-admin',
          name: 'Luciano',
          email: 'luciano@teste.com',
          balance: 1000,
          account: '23434-4',
          branch: '123-4',
        }),
      );
    });

    it('deve repassar o erro se o usuário não existir', async () => {
      mockUsersService.findById.mockRejectedValue(
        new Error('Usuário não encontrado'),
      );

      const req = { user: { id: 'uuid-inexistente' } };

      await expect(controller.getMe(req)).rejects.toThrow(
        'Usuário não encontrado',
      );
    });
  });

  describe('findOne - GET /users/:id', () => {
    it('deve chamar findById com o id do param e retornar sem senha', async () => {
      const userFromDb = UserFactory.build({
        id: 'uuid-maria',
        name: 'Maria',
        email: 'maria@teste.com',
        password: 'hash-secreto',
        balance: 500,
        account: '22222-2',
        branch: '001-1',
      });

      mockUsersService.findById.mockResolvedValue(userFromDb);

      const params: GetUserByIdDto = { id: 'uuid-maria' };

      const result = await controller.findOne(params);

      expect(service.findById).toHaveBeenCalledWith('uuid-maria');
      expect(result).not.toHaveProperty('password');
      expect(result).toEqual(
        expect.objectContaining({
          id: 'uuid-maria',
          name: 'Maria',
          email: 'maria@teste.com',
          balance: 500,
          account: '22222-2',
          branch: '001-1',
        }),
      );
    });

    it('deve repassar o erro se o id for inválido / não existir', async () => {
      mockUsersService.findById.mockRejectedValue(
        new Error('Usuário não encontrado'),
      );

      const params: GetUserByIdDto = { id: 'uuid-invalido' };

      await expect(controller.findOne(params)).rejects.toThrow(
        'Usuário não encontrado',
      );
    });
  });

  describe('findAll - GET /users', () => {
    it('deve chamar findAll com a query e retornar a lista paginada', async () => {
      const query: GetUsersQueryDto = {
        page: 1,
        limit: 10,
        search: 'luciano',
      } as GetUsersQueryDto;

      const user = UserFactory.build({
        id: 'uuid-admin',
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: 'hash-secreto',
        balance: 1000,
        account: '23434-4',
        branch: '123-4',
      });

      mockUsersService.findAll.mockResolvedValue({
        data: [user],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 'uuid-admin',
          name: 'Luciano',
          email: 'luciano@teste.com',
          balance: 1000,
          account: '23434-4',
          branch: '123-4',
        }),
      );
    });

    it('deve filtrar por conta e agência', async () => {
      const query: GetUsersQueryDto = {
        page: 1,
        limit: 10,
        account: '23434-4',
        branch: '123-4',
      } as GetUsersQueryDto;

      mockUsersService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('deve funcionar sem query (valores padrão)', async () => {
      const query = {} as GetUsersQueryDto;

      mockUsersService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result.total).toBe(0);
    });

    it('deve retornar vários usuários gerados pela factory', async () => {
      const query = { page: 1, limit: 10 } as GetUsersQueryDto;

      const users = UserFactory.buildList(3);

      mockUsersService.findAll.mockResolvedValue({
        data: users,
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await controller.findAll(query);

      expect(result.data.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(1);
    });
  });
});
