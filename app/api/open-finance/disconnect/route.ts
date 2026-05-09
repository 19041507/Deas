import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { refreshScore } from "@/lib/account";
import { ok, fail, unauth } from "@/lib/http";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();
  const { id } = await req.json().catch(() => ({}));
  const where: any = { userId, status: "ativo" };
  if (id) where.id = id;
  const consents = await prisma.openFinanceConsent.findMany({ where });
  if (!consents.length) return fail("Nenhuma conexão ativa encontrada.");
  await prisma.openFinanceConsent.updateMany({ where, data: { status: "revogado" } });
  await prisma.auditLog.create({ data: { userId, action: "OF_DISCONNECT" } });
  await refreshScore(userId);
  return ok({ ok: true });
}
