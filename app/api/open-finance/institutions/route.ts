/**
 * GET /api/open-finance/institutions
 *
 * Retorna a lista de instituições financeiras disponíveis para conexão.
 * O front-end usa esta rota para popular o select de bancos dinamicamente,
 * eliminando qualquer referência fixa ao "DeasBank".
 */

import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, unauth } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();

  const institutions = await prisma.institution.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id:                true,
      name:              true,
      slug:              true,
      logoUrl:           true,
      canShareData:      true,
      canReceiveData:    true,
      canInitiatePayment: true,
    },
  });

  return ok(institutions);
}
