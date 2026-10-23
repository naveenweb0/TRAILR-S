import { PrismaClient } from '@prisma/client';

export const txOptions = {
  maxWait: 15000,
  timeout: 30000,
};

const basePrisma = new PrismaClient();

const originalTransaction = basePrisma.$transaction.bind(basePrisma);
(basePrisma as any).$transaction = function (arg: any, options?: any) {
  if (typeof arg === 'function') {
    return originalTransaction(arg, { ...txOptions, ...options });
  }
  return originalTransaction(arg, options);
};

export const prisma = basePrisma;

