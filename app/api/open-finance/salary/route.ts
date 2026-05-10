/**
 * POST /api/open-finance/salary
 *
 * Portabilidade salarial: transfere renda de um banco conectado para o Deas Finance.
 *
 * Regras:
 *   - Exige consentimento ativo com a instituição de origem
 *   - Verifica que o valor não excede a renda estimada do banco externo
 *   - Cria transação de entrada no Deas Finance
 *   - Registra portabilidade no snapshot do consentimento
 *   - Recalcula score
 *
 * ATENÇÃO: Open Finance de dados não movimenta dinheiro real.
 * Esta rota simula uma "portabilidade" como transferência entre contas digitais.
 * Em produção, isso exigiria o módulo de Iniciação de Pagamento (PISP)
 * com regras próprias do Banco Central.
 */

import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { refreshScore, todayBR } from "@/lib/account";
import { ok, fail, unauth } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();

  const { amount, consentId } = await req.json().catch(() => ({}));
  const val = Number(amount);
  if (!val || val <= 0) return fail("Valor inválido.");

  // Busca consentimento específico ou o primeiro ativo
  const consent = await prisma.openFinanceConsent.findFirst({
    where: {
      userId,
      status: "ativo",
      ...(consentId ? { id: consentId } : {}),
    },
    include: {
      institution: true,
      snapshots: { orderBy: { syncedAt: "desc" }, take: 1 },
    },
  });

  if (!consent) return fail("Nenhuma conexão Open Finance ativa.");

  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) return fail("Conta não encontrada.");

  const lastSnap = consent.snapshots[0];

  // Verifica que o valor não excede a renda estimada no banco externo
  if (lastSnap) {
    const rendaExterna = Number(lastSnap.estimatedIncome ?? 0);
    if (rendaExterna > 0 && val > rendaExterna) {
      return fail(
        `Valor excede a renda estimada (${rendaExterna.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) registrada no ${consent.institution.name}.`
      );
    }
  }

  // Registra portabilidade no snapshot mais recente (ou cria novo se não existir)
  if (lastSnap) {
    await prisma.openFinanceSnapshot.update({
      where: { id: lastSnap.id },
      data: { requestedSalary: val },
    });
  } else {
    await prisma.openFinanceSnapshot.create({
      data: {
        consentId:        consent.id,
        availableBalance: 0,
        debt:             0,
        limit:            0,
        loans:            0,
        investments:      0,
        estimatedIncome:  0,
        requestedSalary:  val,
      },
    });
  }

  // Credita valor no Deas Finance
  await prisma.account.update({
    where: { userId },
    data: { availableBalance: { increment: val } },
  });

  // Registra transação
  await prisma.transaction.create({
    data: {
      userId,
      accountId:  account.id,
      creditor:   `Portabilidade salarial — ${consent.institution.name}`,
      type:       "entrada",
      value:      val,
      status:     "concluído",
      date:       todayBR(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "OF_SALARY_PORTABILITY_REQUESTED",
      details: {
        consentId:   consent.id,
        institution: consent.institution.name,
        amount:      val,
        status:      "success",
      },
    },
  });

  await refreshScore(userId);
  return ok({ ok: true });
}
