import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRoot - GET /', () => {
    it('deve retornar message, docs e version', () => {
      const result = controller.getRoot();

      expect(result).toEqual({
        message: 'Carteira Financeira - API está rodando!',
        docs: 'http://localhost:3000/api/documentation',
        version: '1.0',
      });
    });

    it('deve retornar a mensagem exata da API', () => {
      const result = controller.getRoot();

      expect(result.message).toBe('Carteira Financeira - API está rodando!');
      expect(result.version).toBe('1.0');
      expect(result.docs).toContain('/api/documentation');
    });
  });

  describe('getHealth - GET /health', () => {
    it('deve retornar status ok, uptime e timestamp', () => {
      const result = controller.getHealth();

      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof result.timestamp).toBe('string');
    });

    it('deve retornar timestamp em formato ISO válido', () => {
      const result = controller.getHealth();

      // Se for ISO válido, o new Date() não dá Invalid Date
      const date = new Date(result.timestamp);
      expect(date.toString()).not.toBe('Invalid Date');
      expect(result.timestamp).toBe(date.toISOString());
    });

    it('deve retornar uptime do process.uptime()', () => {
      // Mocka o process.uptime para devolver valor fixo
      const spy = jest.spyOn(process, 'uptime').mockReturnValue(123.45 as any);

      const result = controller.getHealth();

      expect(result.uptime).toBe(123.45);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
