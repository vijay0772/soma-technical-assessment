import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Handle connection pooling issues in serverless environments
  __internal: {
    engine: {
      enableEngineDebugMode: false,
      enableQueryLogging: false,
    },
  },
});

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;

// Handle connection errors gracefully
prisma.$connect()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((error: unknown) => {
    console.error('Database connection error:', error);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
