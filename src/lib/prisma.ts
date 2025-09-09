// This file creates a singleton instance of the Prisma Client.
// This is a best practice to prevent creating too many connections to the database.
// NOTE: This code will not run in the current sandbox environment because the
// `prisma migrate` command failed, meaning the `@prisma/client` package was not generated.
// This code is written assuming a functional environment where the client exists.

import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
