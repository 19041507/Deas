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

const DEFAULT_INSTITUTIONS = [
  {
    id:                 "inst_deasbank_001",
    name:               "DeasBank",
    slug:               "deasbank",
    apiBaseUrl:         `${APP_URL}/api/open-finance/external-sim/deasbank`,
    active:             true,
    canShareData:       true,
    canReceiveData:     true,
    canInitiatePayment: false,
  },
  {
    id:                 "inst_alpha_001",
    name:               "Banco Alpha",
    slug:               "banco-alpha",
    apiBaseUrl:         `${APP_URL}/api/open-finance/external-sim/banco-alpha`,
    active:             true,
    canShareData:       true,
    canReceiveData:     true,
    canInitiatePayment: false,
  },
  {
    id:                 "inst_beta_001",
    name:               "Fintech Beta",
    slug:               "fintech-beta",
    apiBaseUrl:         `${APP_URL}/api/open-finance/external-sim/fintech-beta`,
    active:             true,
    canShareData:       true,
    canReceiveData:     false,
    canInitiatePayment: true,
  },
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
];

async function ensureInstitutions() {
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
