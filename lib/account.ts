import { prisma } from "./prisma";

export function calcScore(params: {
  balance: number; debt: number; limit: number;
  income: number; loans: number; partnerScore?: number;
}) {
  const { balance, debt, limit, income, loans, partnerScore } = params;
  let score = 500;
  score += Math.min(160, balance / 120);
  score += Math.min(120, limit / 130);
  score += Math.min(130, income / 90);
  score -= Math.min(180, debt / 45);
  score -= Math.min(80, loans / 100);
  if (partnerScore) score = score * 0.72 + partnerScore * 0.28;
  return Math.max(300, Math.min(950, Math.round(score)));
}

export function calcPreApproved(score: number, income: number, debt: number) {
  const base = Math.max(0, (score - 450) * 15);
  const incomeBonus = income * 2;
  const debtPenalty = debt * 0.5;
  return Math.max(0, Math.round(Math.min(base + incomeBonus - debtPenalty, 150000)));
}

export function seedValues(email: string) {
  const h = Math.abs([...email].reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0));
  const balance = 1500 + (h % 12000);
  const debt = h % 4200;
  const limit = 2500 + (h % 10000);
  const income = 2200 + (h % 5200);
  const score = calcScore({ balance, debt, limit, income, loans: 0 });
  return { balance, debt, limit, income, score, preApproved: calcPreApproved(score, income, debt) };
}

export async function refreshScore(userId: string) {
  const account = await prisma.account.findUnique({ where: { userId } });
  const consent = await prisma.openFinanceConsent.findFirst({ where: { userId, status: "ativo" } });
  if (!account) return;
  const partnerScore = consent?.externalScore ?? undefined;
  const partnerIncome = Number(consent?.estimatedIncome ?? 0);
  const score = calcScore({
    balance: Number(account.availableBalance),
    debt: Number(account.debt),
    limit: Number(account.limit),
    income: Number(account.estimatedIncome) + partnerIncome,
    loans: Number(account.loansTotal),
    partnerScore,
  });
  const preApproved = calcPreApproved(score, Number(account.estimatedIncome) + partnerIncome, Number(account.debt));
  await prisma.account.update({ where: { userId }, data: { creditScore: score, preApproved } });
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
