import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { GetUserByIdDto } from './dto/get-user-by-id.dto.js';
import { GetUsersQueryDto } from './dto/get-users-query.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna os dados do usuário logado' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  async getMe(@Request() req: any): Promise<UserResponseDto> {
    const user = await this.usersService.findById(req.user.id);
    return new UserResponseDto(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista usuários com paginação e filtro por conta e agência',
  })
  @ApiOkResponse({ type: [UserResponseDto] })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  async findAll(@Query() query: GetUsersQueryDto) {
    const result = await this.usersService.findAll(query);
    return {
      ...result,
      data: result.data.map((user) => new UserResponseDto(user)),
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Busca um usuário pelo id' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findOne(@Param() params: GetUserByIdDto): Promise<UserResponseDto> {
    const user = await this.usersService.findById(params.id);
    return new UserResponseDto(user);
  }
}
