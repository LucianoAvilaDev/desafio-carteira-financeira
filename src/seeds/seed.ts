import { AppDataSource } from '../data-source.js';
import { seedUsers } from './user.seed.js';

async function main() {
  await AppDataSource.initialize();
  console.log('Conectado no banco, rodando seeds...');

  await seedUsers(AppDataSource);

  await AppDataSource.destroy();
  console.log('Seeds finalizados!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
