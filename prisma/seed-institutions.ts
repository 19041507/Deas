/**
 * Seed das instituições financeiras parceiras do Open Finance.
 * Execute com: npx ts-node prisma/seed-institutions.ts
 *
 * Em produção, as instituições viriam de um registro oficial (ex: Banco Central).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const institutions = [
  {
    name: "DeasBank",
    slug: "deasbank",
    // Em produção, seria a URL real da API do DeasBank separado
    // Para simulação, aponta para rotas internas do próprio Deas Finance
    apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL + "/api/open-finance/external-sim/deasbank",
    active: true,
    canShareData: true,
    canReceiveData: true,
    canInitiatePayment: false,
  },
  {
    name: "Banco Alpha",
    slug: "banco-alpha",
    apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL + "/api/open-finance/external-sim/banco-alpha",
    active: true,
    canShareData: true,
    canReceiveData: true,
    canInitiatePayment: false,
  },
  {
    name: "Fintech Beta",
    slug: "fintech-beta",
    apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL + "/api/open-finance/external-sim/fintech-beta",
    active: true,
    canShareData: true,
    canReceiveData: false,
    canInitiatePayment: true,
  },
  {
    name: "Larabank",
    slug: "larabank",
    // URL base real da API do Larabank — cadastrar também LARABANK_CLIENT_ID e LARABANK_CLIENT_SECRET
    apiBaseUrl: process.env.LARABANK_API_BASE_URL ?? "https://larabankdigital2.vercel.app",
    active: true,
    canShareData: true,
    canReceiveData: true,
    canInitiatePayment: false,
  },
];

async function main() {
  console.log("Seeding institutions...");
  for (const inst of institutions) {
    await prisma.institution.upsert({
      where: { slug: inst.slug },
      update: inst,
      create: inst,
    });
    console.log(`  ✓ ${inst.name}`);
  }
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
