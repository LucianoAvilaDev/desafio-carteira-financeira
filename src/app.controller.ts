import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'Verifica se a API está rodando e retorna o link da documentação',
  })
  @ApiResponse({
    status: 200,
    description: 'API rodando',
    schema: {
      example: {
        message: 'Carteira Financeira - API está rodando!',
        docs: 'http://localhost:3000/api/documentation',
        version: '1.0',
      },
    },
  })
  getRoot() {
    return {
      message: 'Carteira Financeira - API está rodando!',
      docs: 'http://localhost:3000/api/documentation',
      version: '1.0',
    };
  }
}
