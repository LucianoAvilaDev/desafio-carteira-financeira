import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';

export const RegisterDtoFactory = Factory.define<RegisterDto>(({ params }) => ({
  name: params.name ?? faker.person.fullName(),
  email: params.email ?? faker.internet.email(),
  password: params.password ?? '123456',
  account:
    params.account ?? `${faker.string.numeric(5)}-${faker.string.numeric(1)}`,
  branch:
    params.account ?? `${faker.string.numeric(3)}-${faker.string.numeric(1)}`,
  amount: params.amount ?? 0,
}));

export const LoginDtoFactory = Factory.define<LoginDto>(({ params }) => ({
  email: params.email ?? faker.internet.email(),
  password: params.password ?? '123456',
}));
