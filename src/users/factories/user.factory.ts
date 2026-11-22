import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { User } from '../entities/user.entity.js';

export const UserFactory = Factory.define<User>(({ params }) => ({
  id: params.id ?? faker.string.uuid(),
  name: params.name ?? faker.person.fullName(),
  email: params.email ?? faker.internet.email(),
  password: params.password ?? 'hash-123',
  account:
    params.account ?? `${faker.string.numeric(5)}-${faker.string.numeric(1)}`,
  branch:
    params.branch ?? `${faker.string.numeric(3)}-${faker.string.numeric(1)}`,
  balance: params.balance ?? 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}));
