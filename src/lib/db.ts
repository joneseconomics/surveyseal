import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  // Prisma v7 requires adapter or accelerateUrl at the type level,
  // but at runtime with a generated output client it reads DATABASE_URL.
  // We pass accelerateUrl with the DATABASE_URL to satisfy both type and runtime.
  return new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL!,
  });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
