import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { Transfer, TransferStatus } from '../entities/transfer.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { UserFactory } from '../../users/factories/user.factory.js';

export const TransferFactory = Factory.define<Transfer>(({ params }) => {
  const fromUser = (params.fromUser as User | undefined) ?? UserFactory.build();
  const toUser = (params.toUser as User | undefined) ?? UserFactory.build();

  return {
    id: params.id ?? faker.string.uuid(),
    fromUserId: params.fromUserId ?? fromUser.id ?? faker.string.uuid(),
    toUserId: params.toUserId ?? toUser.id ?? faker.string.uuid(),
    fromUser,
    toUser,
    amount:
      params.amount ??
      Number(faker.number.float({ min: 1, max: 500, fractionDigits: 2 })),
    status: params.status ?? TransferStatus.COMPLETED,
    createdAt: params.createdAt ?? new Date(),
  };
});
