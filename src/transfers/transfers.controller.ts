import {
  Controller,
  Post,
  Get,
  Body,
  Query,
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
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { GetTransfersQueryDto } from './dto/get-transfers-query.dto.js';
import { TransferResponseDto } from './dto/transfer-response.dto.js';
import { TransfersService } from './transfers.service.js';

@ApiTags('Transfers')
@Controller('transfers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({
    summary:
      'Cria uma transferência do usuário logado para outra conta + agência',
  })
  @ApiOkResponse({ type: TransferResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Valor inválido, saldo insuficiente ou transferência para si mesmo',
  })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  @ApiResponse({
    status: 404,
    description: 'Conta de destino não encontrada para essa agência',
  })
  async create(
    @Request() req: any,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferResponseDto> {
    const userId = req.user.sub ?? req.user.id;
    const transfer = await this.transfersService.create(userId, dto);
    return new TransferResponseDto(transfer);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista as transferências do usuário logado, com paginação e filtro por tipo',
  })
  @ApiOkResponse({ type: [TransferResponseDto] })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido' })
  async findAll(@Request() req: any, @Query() query: GetTransfersQueryDto) {
    const userId = req.user.sub ?? req.user.id;
    const result = await this.transfersService.findAll(userId, query);

    if (query.short) {
      return result;
    }

    return {
      ...result,
      data: result.data.map((t) => new TransferResponseDto(t)),
    };
  }
}
