import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary:
      'Cria um novo usuário com nome, email, senha, conta, agência e saldo inicial',
  })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos - conta, agência ou amount fora do formato',
  })
  @ApiResponse({
    status: 409,
    description: 'E-mail ou conta + agência já cadastrados',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Faz login com e-mail e senha e retorna o token JWT',
  })
  @ApiResponse({
    status: 201,
    description: 'Login realizado, retorna access_token e usuário',
  })
  @ApiResponse({ status: 401, description: 'E-mail ou senha inválidos' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
