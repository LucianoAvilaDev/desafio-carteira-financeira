import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetUsersQueryDto } from './dto/get-users-query.dto.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async findAll(query: GetUsersQueryDto) {
    const { page = 1, limit = 10, search, account, branch } = query;

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.where(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.account ILIKE :search OR user.branch ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (account) {
      qb.andWhere('user.account = :account', { account });
    }

    if (branch) {
      qb.andWhere('user.branch = :branch', { branch });
    }

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
