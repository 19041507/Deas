import { prisma } from "./prisma";

export function calcScore(params: {
  balance: number; debt: number; limit: number;
  income: number; loans: number; partnerScoreAverage?: number;
}) {
  const { balance, debt, limit, income, loans, partnerScoreAverage } = params;
  let score = 500;
  score += Math.min(160, balance / 120);
  score += Math.min(120, limit / 130);
  score += Math.min(130, income / 90);
  score -= Math.min(180, debt / 45);
  score -= Math.min(80, loans / 100);
  // Média ponderada: 72% score local, 28% média dos scores externos
  if (partnerScoreAverage) score = score * 0.72 + partnerScoreAverage * 0.28;
  return Math.max(300, Math.min(950, Math.round(score)));
}

export function calcPreApproved(score: number, income: number, debt: number) {
  const base = Math.max(0, (score - 450) * 15);
  const incomeBonus = income * 2;
  const debtPenalty = debt * 0.5;
  return Math.max(0, Math.round(Math.min(base + incomeBonus - debtPenalty, 150000)));
}

/** @deprecated Use apenas para dados internos. A conexão externa usa o simulador. */
export function seedValues(email: string) {
  const h = Math.abs([...email].reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0));
  const balance = 1500 + (h % 12000);
  const debt = h % 4200;
  const limit = 2500 + (h % 10000);
  const income = 2200 + (h % 5200);
  const score = calcScore({ balance, debt, limit, income, loans: 0 });
  return { balance, debt, limit, income, score, preApproved: calcPreApproved(score, income, debt) };
}

/**
 * Recalcula o score do usuário considerando TODOS os bancos conectados.
 *
 * Antes: usava apenas o primeiro consentimento ativo (bug para multi-banco).
 * Agora: agrega dados de todos os bancos ativos e calcula média ponderada.
 */
export async function refreshScore(userId: string) {
  const account = await prisma.account.findUnique({ where: { userId } });
  if (!account) return;

  // Busca TODOS os consentimentos ativos (não só o primeiro)
  const activeConsents = await prisma.openFinanceConsent.findMany({
    where: { userId, status: "ativo" },
    include: {
      snapshots: { orderBy: { syncedAt: "desc" }, take: 1 },
    },
  });

  // Agrega dados de todos os bancos conectados
  let totalExternalIncome = 0;
  let totalExternalDebt = 0;
  const externalScores: number[] = [];

  for (const consent of activeConsents) {
    const snap = consent.snapshots[0];
    if (!snap) continue;
    totalExternalIncome += Number(snap.estimatedIncome ?? 0);
    totalExternalDebt   += Number(snap.debt ?? 0);
    if (snap.externalScore) externalScores.push(snap.externalScore);
  }

  // Média dos scores externos (se houver)
  const partnerScoreAverage =
    externalScores.length > 0
      ? externalScores.reduce((a, b) => a + b, 0) / externalScores.length
      : undefined;

  const score = calcScore({
    balance:              Number(account.availableBalance),
    debt:                 Number(account.debt) + totalExternalDebt,
    limit:                Number(account.limit),
    income:               Number(account.estimatedIncome) + totalExternalIncome,
    loans:                Number(account.loansTotal),
    partnerScoreAverage,
  });

  const preApproved = calcPreApproved(
    score,
    Number(account.estimatedIncome) + totalExternalIncome,
    Number(account.debt)
  );

  await prisma.account.update({
    where: { userId },
    data: { creditScore: score, preApproved },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "OF_SCORE_RECALCULATED",
      details: {
        newScore: score,
        banksConsidered: activeConsents.length,
        partnerScoreAverage: partnerScoreAverage ?? null,
      },
    },
  });
}

export function todayBR() {
  return new Date().toLocaleDateString("pt-BR");
}

export function money(v: number | string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function scoreCategory(score: number) {
  if (score >= 800) return { label: "Excelente", color: "#34D399" };
  if (score >= 700) return { label: "Bom", color: "#60A5FA" };
  if (score >= 600) return { label: "Regular", color: "#F2B84B" };
  if (score >= 500) return { label: "Médio", color: "#FBBF24" };
  return { label: "Baixo", color: "#F87171" };
}
