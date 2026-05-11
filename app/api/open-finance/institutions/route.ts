/**
 * GET /api/open-finance/institutions
 *
 * Retorna a lista de instituições financeiras disponíveis para conexão.
 * Auto-seed: garante que as instituições padrão (incluindo Larabank) existam no banco.
 */

import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, unauth } from "@/lib/http";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://deas-three.vercel.app";
const LARABANK_URL = process.env.LARABANK_API_BASE_URL ?? "https://larabankdigital2.vercel.app";
const DEASPAY_URL = process.env.DEASPAY_API_BASE_URL ?? "https://deas-pay.vercel.app";

const DEFAULT_INSTITUTIONS = [
  {
    id:                 "inst_larabank_001",
    name:               "Larabank",
    slug:               "larabank",
    apiBaseUrl:         LARABANK_URL,
    active:             true,
    canShareData:       true,
    canReceiveData:     true,
    canInitiatePayment: false,
  },
  {
    id:                 "inst_deaspay_001",
    name:               "DEASPay",
    slug:               "deaspay",
    apiBaseUrl:         DEASPAY_URL,
    active:             true,
    canShareData:       true,
    canReceiveData:     true,
    canInitiatePayment: false,
  },
];

async function ensureInstitutions() {
  // Deixa ativos apenas Larabank e DEASPay. Banco Alpha, Fintech Beta e DeasBank ficam ocultos.
  await prisma.institution.updateMany({
    where: { slug: { notIn: ["larabank", "deaspay"] } },
    data: { active: false },
  });

  for (const inst of DEFAULT_INSTITUTIONS) {
    await prisma.institution.upsert({
      where:  { slug: inst.slug },
      update: { apiBaseUrl: inst.apiBaseUrl, active: true },
      create: inst,
    });
  }
}

export async function GET(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();

  // Auto-seed: garante que todas as instituições existam no banco
  await ensureInstitutions();

  const institutions = await prisma.institution.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id:                 true,
      name:               true,
      slug:               true,
      logoUrl:            true,
      canShareData:       true,
      canReceiveData:     true,
      canInitiatePayment: true,
    },
  });

  return ok(institutions);
}
