import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { GetTransfersQueryDto } from './dto/get-transfers-query.dto.js';
import { TransferResponseDto } from './dto/transfer-response.dto.js';
import { TransfersService } from './transfers.service.js';

@ApiTags('transfers')
@Controller('transfers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOkResponse({ type: TransferResponseDto })
  async create(
    @Request() req: any,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferResponseDto> {
    const userId = req.user.sub ?? req.user.id;
    const transfer = await this.transfersService.create(userId, dto);
    return new TransferResponseDto(transfer);
  }

  @Get()
  @ApiOkResponse({ type: [TransferResponseDto] })
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
