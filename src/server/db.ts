import "server-only";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { resolve } from "node:path";

import { PrismaClient } from "@/generated/prisma/client";

function resolveDatabaseUrl(configuredUrl: string) {
  if (!configuredUrl.startsWith("file:./")) {
    return configuredUrl;
  }

  return resolve(
    process.cwd(),
    "prisma",
    configuredUrl.slice("file:./".length),
  );
}

const databaseUrl = resolveDatabaseUrl(
  process.env.DATABASE_URL ?? "file:./data/assetflow.db",
);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: databaseUrl,
  });

  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
