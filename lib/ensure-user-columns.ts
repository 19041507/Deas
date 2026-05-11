import { prisma } from "@/lib/prisma";

let ensured: Promise<void> | null = null;

export function ensureUserColumns() {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT');
      await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cpf" TEXT');
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_cpf_key" ON "User"("cpf")');
    })();
  }

  return ensured;
}
