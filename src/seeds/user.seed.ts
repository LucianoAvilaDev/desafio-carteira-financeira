import { DataSource, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity.js';

export async function seedUsers(dataSource: DataSource) {
  const repo = dataSource.getRepository(User);

  const seeds = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Admin',
      email: 'admin@teste.com',
      balance: 1000,
      account: '11111-1',
      branch: '001-1',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Maria',
      email: 'maria@teste.com',
      balance: 500,
      account: '22222-2',
      branch: '001-1',
    },
  ];

  const existing = new Set(
    (
      await repo.find({
        where: { id: In(seeds.map((s) => s.id)) },
        select: { id: true },
      })
    ).map((u) => u.id),
  );

  const missing = seeds.filter((s) => !existing.has(s.id));
  if (!missing.length) return console.log('Usuários já existem, pulando seed');

  const password = await bcrypt.hash('123456', 10);
  await repo.save(missing.map((s) => ({ ...s, password })));

  console.log(`✅ ${missing.length} usuário(s) criados`);
}
