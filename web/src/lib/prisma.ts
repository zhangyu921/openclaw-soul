import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

function resolveDatabaseUrl(): string {
  const u = process.env.DATABASE_URL;
  if (!u) {
    return `file:${path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "prisma",
      "dev.db"
    )}`;
  }
  if (u.startsWith("file:")) {
    const rest = u.slice("file:".length);
    if (rest.startsWith("./") || rest.startsWith("../")) {
      return `file:${path.resolve(
        /* turbopackIgnore: true */ process.cwd(),
        rest
      )}`;
    }
  }
  return u;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: resolveDatabaseUrl(),
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
