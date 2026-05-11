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
    name: "DEASPay",
    slug: "deaspay",
    // URL base real da API do DEASPay — cadastrar também DEASPAY_CLIENT_ID e DEASPAY_CLIENT_SECRET
    apiBaseUrl: process.env.DEASPAY_API_BASE_URL ?? "https://deas-pay.vercel.app",
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
