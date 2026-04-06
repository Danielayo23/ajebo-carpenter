// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function getMariaDbPoolConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error(
      "DATABASE_URL is missing. Add it to .env.local (recommended)."
    );
  }

  const url = new URL(raw);

  const database = url.pathname.replace(/^\//, "");
  if (!database) throw new Error("DATABASE_URL is missing database name.");

  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: process.env.NODE_ENV === "production"? 10 : 20,
    // Helps avoid slow hangs on Windows when connection is wrong
    connectTimeout: 10_000,
  };
}

function makePrismaClient() {
  const adapter = new PrismaMariaDb(getMariaDbPoolConfig());
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? makePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}