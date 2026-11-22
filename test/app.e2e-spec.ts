import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { DataSource } from 'typeorm';
import { RegisterDto } from '../src/auth/dto/register.dto.js';
import {
  RegisterDtoFactory,
  LoginDtoFactory,
} from '../src/auth/factories/auth.factory.js';
import { TransferFactory } from '../src/transfers/factories/transfer.factory.js';

describe('App e2e', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let userId: string;
  let user2Id: string;
  let user2Account: string;
  let user2Branch: string;
  let user1Account: string;
  let user1Branch: string;
  let token2: string;
  let counter = 0;

  async function criarUsuario(overrides: Partial<RegisterDto> = {}) {
    counter += 1;
    const base = 10000 + counter;
    const dto = RegisterDtoFactory.build({
      name: 'Luciano',
      email: `user-${counter}@teste.com`,
      password: '123456',
      account: `${base}-${counter % 10}`,
      branch: `00${counter % 10}-1`,
      ...overrides,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(dto)
      .expect(201);
    return { dto, body: res.body.user ?? res.body };
  }

  async function login(email: string, password: string) {
    const dto = LoginDtoFactory.build({ email, password });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(dto)
      .expect(201);
    return res.body.access_token as string;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM transfers');
    await dataSource.query('DELETE FROM users');
  });

  describe('Auth e Users', () => {
    it('should be defined', () => {
      expect(app).toBeDefined();
    });

    it('deve criar um usuário', async () => {
      const dto = RegisterDtoFactory.build({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        account: '23434-4',
        branch: '123-4',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(201);

      const body = res.body.user ?? res.body;
      expect(body).toHaveProperty('id');
      expect(body.email).toBe(dto.email);
      expect(body.account).toBe('23434-4');
      expect(body.branch).toBe('123-4');
      expect(body).not.toHaveProperty('password');

      userId = body.id;
    });

    it('deve criar um usuário com o amount informado como saldo inicial', async () => {
      const dto = RegisterDtoFactory.build({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        account: '23434-4',
        branch: '123-4',
        amount: 1000,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(201);

      const body = res.body.user ?? res.body;
      expect(Number(body.balance)).toBe(1000);
    });

    it('deve criar um usuário com saldo 0 quando não informar o amount', async () => {
      const dtoComAmount = RegisterDtoFactory.build({
        name: 'Maria',
        email: 'maria@teste.com',
        password: '123456',
        account: '22222-2',
        branch: '001-1',
        amount: 999,
      });
      const { amount: _amount, ...dto } = dtoComAmount;

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(201);

      const body = res.body.user ?? res.body;
      expect(Number(body.balance)).toBe(0);
    });

    it('deve retornar 400 ao criar usuário com amount negativo', async () => {
      const dto = RegisterDtoFactory.build({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        account: '23434-4',
        branch: '123-4',
        amount: -100,
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(400);
    });

    it('deve retornar 409 ao criar usuário com conta + agência duplicadas', async () => {
      const dto = RegisterDtoFactory.build({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        account: '23434-4',
        branch: '123-4',
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(201);

      const duplicado = RegisterDtoFactory.build({
        name: 'Outro',
        email: 'outro@teste.com',
        password: '123456',
        account: '23434-4',
        branch: '123-4',
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(duplicado)
        .expect(409);
    });

    it('deve fazer login e retornar token', async () => {
      const { dto } = await criarUsuario({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(LoginDtoFactory.build({ email: dto.email, password: '123456' }))
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      token = res.body.access_token;
    });

    it('deve retornar 401 sem token no /users/me', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('deve retornar o usuário logado no /users/me', async () => {
      const { dto } = await criarUsuario({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
      });
      token = await login(dto.email, '123456');

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.email).toBe(dto.email);
    });

    it('deve retornar o saldo inicial no /users/me quando criado com amount', async () => {
      const { dto } = await criarUsuario({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        amount: 1000,
      });
      token = await login(dto.email, '123456');

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Number(res.body.balance)).toBe(1000);
    });

    it('deve buscar por conta e agência no /users', async () => {
      const { dto } = await criarUsuario({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
      });
      token = await login(dto.email, '123456');

      const res = await request(app.getHttpServer())
        .get(`/users?account=${dto.account}&branch=${dto.branch}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const lista = res.body.data ?? res.body;
      expect(lista.length).toBe(1);
      expect(lista[0].account).toBe(dto.account);
      expect(lista[0].branch).toBe(dto.branch);
    });
  });

  describe('Transfers', () => {
    beforeEach(async () => {
      const { body: u1, dto: dto1 } = await criarUsuario({
        name: 'Luciano',
        email: 'luciano@teste.com',
        password: '123456',
        amount: 1000,
      });
      userId = u1.user?.id ?? u1.id;
      user1Account = u1.account ?? dto1.account;
      user1Branch = u1.branch ?? dto1.branch;

      const { body: u2, dto: dto2 } = await criarUsuario({
        name: 'Maria',
        email: 'maria@teste.com',
        password: '123456',
        amount: 1000,
      });
      user2Id = u2.user?.id ?? u2.id;
      user2Account = u2.account ?? dto2.account;
      user2Branch = u2.branch ?? dto2.branch;

      token = await login(dto1.email, '123456');
      token2 = await login('maria@teste.com', '123456');
    });

    it('deve criar uma transferência do usuário logado para outro usuário', async () => {
      const transferDto = TransferFactory.build({
        amount: 100.5,
      });

      const res = await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          account: user2Account,
          branch: user2Branch,
          amount: transferDto.amount,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(Number(res.body.amount)).toBe(100.5);
      expect(res.body.status).toBe('COMPLETED');
    });

    it('deve retornar 401 ao tentar transferir sem token', async () => {
      await request(app.getHttpServer())
        .post('/transfers')
        .send({ account: user2Account, branch: user2Branch, amount: 50 })
        .expect(401);
    });

    it('deve retornar 400 ao tentar transferir para si mesmo', async () => {
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({ account: user1Account, branch: user1Branch, amount: 50 })
        .expect(400);
    });

    it('deve retornar 400 ao tentar transferir com valor inválido', async () => {
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({ account: user2Account, branch: user2Branch, amount: -10 })
        .expect(400);
    });

    it('deve retornar 404 ao tentar transferir para conta inexistente', async () => {
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({ account: '99999-9', branch: '999-9', amount: 50 })
        .expect(404);
    });

    it('deve listar só as transferências do usuário logado', async () => {
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({ account: user2Account, branch: user2Branch, amount: 100 });

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${token2}`)
        .send({ account: user1Account, branch: user1Branch, amount: 50 });

      const res = await request(app.getHttpServer())
        .get('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const lista = res.body.data ?? res.body;
      expect(lista.length).toBe(2);
    });

    it('deve paginar as transferências', async () => {
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({ account: user2Account, branch: user2Branch, amount: 10 });

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({ account: user2Account, branch: user2Branch, amount: 20 });

      const res = await request(app.getHttpServer())
        .get('/transfers?page=1&limit=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const lista = res.body.data ?? res.body;
      expect(lista.length).toBe(1);
    });

    it('deve retornar short com senderName, receiverName, amount, createdAt e type', async () => {
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({ account: user2Account, branch: user2Branch, amount: 100 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/transfers?short=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const lista = res.body.data ?? res.body;
      expect(lista[0]).toEqual(
        expect.objectContaining({
          senderName: 'Luciano',
          receiverName: 'Maria',
          amount: 100,
          type: 'sent',
        }),
      );
      expect(lista[0]).toHaveProperty('createdAt');
    });
  });
});
