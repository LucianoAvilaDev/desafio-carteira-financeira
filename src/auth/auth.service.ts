import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const emailExistente = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (emailExistente) {
      throw new ConflictException('Email já cadastrado');
    }

    const contaExistente = await this.usersRepository.findOne({
      where: {
        account: dto.account,
        branch: dto.branch,
      },
    });
    if (contaExistente) {
      throw new ConflictException('Conta já cadastrada');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      balance: dto.amount ?? 0,
      account: dto.account,
      branch: dto.branch,
    });

    const saved = await this.usersRepository.save(user);
    const { password, ...rest } = saved;
    return rest;
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        account: true,
        balance: true,
        branch: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const payload = { sub: user.id, email: user.email };
    const { password, ...userWithoutPassword } = user;

    return {
      access_token: this.jwtService.sign(payload),
      user: userWithoutPassword,
    };
  }
}
