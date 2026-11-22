import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { GetUsersQueryDto } from './dto/get-users-query.dto.js';
import { UserFactory } from './factories/user.factory.js';

describe('UsersService', () => {
  let service: UsersService;

  const mockQb = {
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
    getManyAndCount: jest.fn<() => Promise<[User[], number]>>(),
  };

  const mockUsersRepository = {
    findOneBy:
      jest.fn<(where: FindOptionsWhere<User>) => Promise<User | null>>(),
    createQueryBuilder: jest.fn<() => typeof mockQb>(() => mockQb),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('deve retornar o usuário quando existir', async () => {
      const userFromDb = UserFactory.build({
        id: 'uuid-admin',
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: 'hash-secreto',
        balance: 1000,
        account: '23434-4',
        branch: '123-4',
        createdAt: new Date('2026-11-18T15:18:31.000Z'),
        updatedAt: new Date('2026-11-18T15:18:31.000Z'),
      });

      mockUsersRepository.findOneBy.mockResolvedValue(userFromDb);

      const result = await service.findById('uuid-admin');

      expect(mockUsersRepository.findOneBy).toHaveBeenCalledWith({
        id: 'uuid-admin',
      });
      expect(result).toEqual(userFromDb);
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

    it('deve jogar NotFoundException quando não existir', async () => {
      mockUsersRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findById('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('uuid-inexistente')).rejects.toThrow(
        'Usuário não encontrado',
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada com valores padrão (page=1, limit=10)', async () => {
      const usersFromDb = [
        UserFactory.build({
          id: 'uuid-1',
          name: 'Luciano',
          email: 'luciano@teste.com',
          password: 'hash',
          balance: 1000,
          account: '23434-4',
          branch: '123-4',
        }),
        UserFactory.build({
          id: 'uuid-2',
          name: 'Maria',
          email: 'maria@teste.com',
          password: 'hash',
          balance: 500,
          account: '22222-2',
          branch: '001-1',
        }),
      ];

      mockQb.getManyAndCount.mockResolvedValue([usersFromDb, 2]);

      const query = {} as GetUsersQueryDto;

      const result = await service.findAll(query);

      expect(mockUsersRepository.createQueryBuilder).toHaveBeenCalledWith(
        'user',
      );
      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(10);
      expect(mockQb.where).not.toHaveBeenCalled();

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 'uuid-1',
          name: 'Luciano',
          email: 'luciano@teste.com',
        }),
      );
    });

    it('deve calcular skip e totalPages para page=2, limit=10, total=25', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 25]);

      const query = { page: 2, limit: 10 } as GetUsersQueryDto;

      const result = await service.findAll(query);

      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);

      expect(result.page).toBe(2);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });

    it('deve filtrar por search em name, email, account e branch', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        search: 'luciano',
      } as GetUsersQueryDto;

      await service.findAll(query);

      expect(mockQb.where).toHaveBeenCalledWith(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.account ILIKE :search OR user.branch ILIKE :search)',
        { search: '%luciano%' },
      );
    });

    it('deve buscar por conta via search', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        search: '23434-4',
      } as GetUsersQueryDto;

      await service.findAll(query);

      expect(mockQb.where).toHaveBeenCalledWith(
        expect.stringContaining('user.account ILIKE :search'),
        { search: '%23434-4%' },
      );
    });

    it('deve buscar por agência via search', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        search: '123-4',
      } as GetUsersQueryDto;

      await service.findAll(query);

      expect(mockQb.where).toHaveBeenCalledWith(
        expect.stringContaining('user.branch ILIKE :search'),
        { search: '%123-4%' },
      );
    });

    it('deve filtrar por account e branch exatos', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        account: '23434-4',
        branch: '123-4',
      } as GetUsersQueryDto;

      await service.findAll(query);

      expect(mockQb.where).not.toHaveBeenCalled();
      expect(mockQb.andWhere).toHaveBeenCalledWith('user.account = :account', {
        account: '23434-4',
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('user.branch = :branch', {
        branch: '123-4',
      });
    });

    it('deve combinar search com filtro exato de account e branch', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        search: 'Luciano',
        account: '23434-4',
        branch: '123-4',
      } as GetUsersQueryDto;

      await service.findAll(query);

      expect(mockQb.where).toHaveBeenCalledTimes(1);
      expect(mockQb.andWhere).toHaveBeenCalledTimes(2);
    });

    it('deve retornar vários usuários gerados pela factory', async () => {
      const usersFromDb = UserFactory.buildList(5);

      mockQb.getManyAndCount.mockResolvedValue([usersFromDb, 5]);

      const query = { page: 1, limit: 10 } as GetUsersQueryDto;

      const result = await service.findAll(query);

      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(5);
    });
  });
});
