/**
 * Adaptador genérico para bancos que implementam o contrato padrão do Open Finance.
 *
 * Rotas esperadas no banco externo:
 *   GET  {apiBaseUrl}/accounts   → retorna dados de conta, score, renda
 *   DELETE {apiBaseUrl}/consents/:id → revoga consentimento
 *
 * Formato de resposta esperado de GET /accounts:
 * {
 *   "account": {
 *     "availableBalance": number,
 *     "limit": number,
 *     "debt": number,
 *     "loans": number,
 *     "investments": number,
 *     "estimatedIncome": number,
 *     "creditScore": number
 *   }
 * }
 */

import type { BankAdapter, OpenFinanceAccountData } from "../types";

export const genericAdapter: BankAdapter = {
  async fetchAccountData(
    accessToken: string,
    apiBaseUrl: string
  ): Promise<OpenFinanceAccountData> {
    const res = await fetch(`${apiBaseUrl}/accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 401) throw { code: "TOKEN_EXPIRED", message: "Token expirado ou inválido." };
      if (status === 403) throw { code: "CONSENT_REVOKED", message: "Consentimento revogado." };
      if (status === 503) throw { code: "BANK_UNAVAILABLE", message: "Banco temporariamente indisponível." };
      throw { code: "UNKNOWN", message: `Erro ${status} ao buscar dados do banco.` };
    }

    const data = await res.json();
    const acct = data.account ?? data;

    return {
      availableBalance: Number(acct.availableBalance ?? 0),
      debt:             Number(acct.debt ?? 0),
      limit:            Number(acct.limit ?? 0),
      loans:            Number(acct.loans ?? 0),
      investments:      Number(acct.investments ?? 0),
      estimatedIncome:  Number(acct.estimatedIncome ?? 0),
      externalScore:    Number(acct.creditScore ?? acct.externalScore ?? 0),
    };
  },

  async revokeConsent(
    accessToken: string,
    apiBaseUrl: string,
    consentId: string
  ): Promise<void> {
    // Notifica o banco externo — ignora erros para não bloquear a revogação local
    try {
      await fetch(`${apiBaseUrl}/consents/${consentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      // log mas não propaga — a revogação local prossegue de qualquer forma
      console.warn(`[OpenFinance] Falha ao notificar revogação no banco externo.`);
    }
  },
};
