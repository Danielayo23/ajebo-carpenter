// src/lib/prisma.ts

import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function getMariaDbPoolConfig() {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    throw new Error("DATABASE_URL is missing");
  }

  const url = new URL(raw);

  const database = url.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL is missing database name");
  }

  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: process.env.NODE_ENV === "production" ? 5 : 10, // reduce for serverless
    connectTimeout: 10_000,
  };
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    // prevents build crash on Vercel
    throw new Error("DATABASE_URL not set");
  }

  const adapter = new PrismaMariaDb(getMariaDbPoolConfig());

  return new PrismaClient({
    adapter,
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}