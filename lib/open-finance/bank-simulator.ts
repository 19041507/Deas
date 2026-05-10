/**
 * API simulada de bancos externos — apenas para demonstração.
 *
 * Em produção, esses dados viriam de APIs reais de bancos parceiros.
 * Este módulo simula o que a API de um banco externo retornaria.
 *
 * Rota: GET /api/open-finance/external-sim/[bankSlug]/accounts
 *       DELETE /api/open-finance/external-sim/[bankSlug]/consents/[id]
 */

import { NextResponse } from "next/server";

/** Gera dados determinísticos baseados em token + banco para simular dados reais */
function generateBankData(accessToken: string, bankSlug: string) {
  // Hash simples e determinístico para gerar dados diferentes por banco/usuário
  const seed = [...(accessToken + bankSlug)].reduce(
    (acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0,
    0
  );
  const h = Math.abs(seed);

  // Cada banco gera uma faixa diferente de valores para parecer realista
  const bankMultipliers: Record<string, { bal: number; debt: number; lim: number; inc: number }> = {
    "deasbank":    { bal: 0.8, debt: 0.6, lim: 0.7, inc: 0.9 },
    "banco-alpha": { bal: 1.2, debt: 0.3, lim: 1.4, inc: 1.1 },
    "fintech-beta":{ bal: 0.5, debt: 0.8, lim: 0.6, inc: 0.7 },
  };
  const m = bankMultipliers[bankSlug] ?? { bal: 1, debt: 0.5, lim: 1, inc: 1 };

  const base = {
    balance:  1500 + (h % 12000),
    debt:     500  + (h % 4000),
    limit:    2500 + (h % 10000),
    income:   2200 + (h % 5200),
    loans:    h % 3000,
    invest:   (h % 8000),
  };

  const availableBalance = Math.round(base.balance * m.bal);
  const debt             = Math.round(base.debt * m.debt);
  const limit            = Math.round(base.limit * m.lim);
  const estimatedIncome  = Math.round(base.income * m.inc);
  const loans            = Math.round(base.loans * m.debt);
  const investments      = Math.round(base.invest * m.bal);

  // Score simplificado baseado nos dados
  const rawScore =
    500 +
    Math.min(160, availableBalance / 120) +
    Math.min(120, limit / 130) +
    Math.min(130, estimatedIncome / 90) -
    Math.min(180, debt / 45) -
    Math.min(80, loans / 100);

  const creditScore = Math.max(300, Math.min(950, Math.round(rawScore)));

  return {
    account: {
      availableBalance,
      debt,
      limit,
      estimatedIncome,
      loans,
      investments,
      creditScore,
    },
    transactions: [
      {
        id:          `tx_${h % 9999}_1`,
        type:        "entrada",
        description: "Salário",
        amount:      estimatedIncome,
        date:        new Date().toISOString().split("T")[0],
      },
      {
        id:          `tx_${h % 9999}_2`,
        type:        "saída",
        description: "Fatura cartão",
        amount:      Math.round(debt * 0.4),
        date:        new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
      },
    ],
  };
}

/** Handler para GET {apiBaseUrl}/accounts */
export function handleGetAccounts(request: Request, bankSlug: string) {
  const authHeader = request.headers.get("Authorization") ?? "";
  const accessToken = authHeader.replace("Bearer ", "").trim();

  if (!accessToken) {
    return NextResponse.json(
      { error: true, code: "TOKEN_EXPIRED", message: "Token ausente ou inválido." },
      { status: 401 }
    );
  }

  const data = generateBankData(accessToken, bankSlug);
  return NextResponse.json(data);
}

/** Handler para DELETE {apiBaseUrl}/consents/:id */
export function handleRevokeConsent() {
  return NextResponse.json({ ok: true, message: "Consentimento revogado no banco externo." });
}
