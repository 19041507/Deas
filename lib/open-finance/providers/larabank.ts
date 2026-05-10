/**
 * Adaptador específico para o Larabank.
 *
 * Implementa OAuth2 real (Authorization Code Flow) com o Larabank.
 *
 * Endpoints OAuth esperados no Larabank (padrão Laravel Passport):
 *   GET  {LARABANK_API_BASE_URL}/oauth/authorize  → autorização
 *   POST {LARABANK_API_BASE_URL}/oauth/token      → troca de code por token
 *   GET  {LARABANK_API_BASE_URL}/api/accounts     → dados de conta (com Bearer token)
 *   DELETE {LARABANK_API_BASE_URL}/api/consents/:id → revogação de consentimento
 *
 * Variáveis de ambiente necessárias:
 *   LARABANK_CLIENT_ID     — gerado pelo Larabank após cadastro das URLs OAuth
 *   LARABANK_CLIENT_SECRET — gerado pelo Larabank após cadastro das URLs OAuth
 *   LARABANK_API_BASE_URL  — URL base da API do Larabank (ex: https://larabankdigital2.vercel.app)
 */

import type { BankAdapter, OpenFinanceAccountData } from "../types";

const LARABANK_API_BASE_URL =
  process.env.LARABANK_API_BASE_URL ?? "https://larabankdigital2.vercel.app";

const LARABANK_CLIENT_ID     = process.env.LARABANK_CLIENT_ID ?? "";
const LARABANK_CLIENT_SECRET = process.env.LARABANK_CLIENT_SECRET ?? "";

/** URL de autorização OAuth do Larabank */
export const LARABANK_AUTH_URL = `${LARABANK_API_BASE_URL}/oauth/authorize`;

/** URL de troca de code por token do Larabank */
export const LARABANK_TOKEN_URL = `${LARABANK_API_BASE_URL}/oauth/token`;

/**
 * Troca o authorization code por um access token no Larabank.
 * Chamado pelo callback route após o redirecionamento OAuth.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const res = await fetch(LARABANK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type:    "authorization_code",
      client_id:     LARABANK_CLIENT_ID,
      client_secret: LARABANK_CLIENT_SECRET,
      redirect_uri:  redirectUri,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw {
      code:    "TOKEN_EXCHANGE_FAILED",
      message: `Larabank rejeitou a troca de code (${res.status}): ${text}`,
    };
  }

  const data = await res.json();

  if (!data.access_token) {
    throw { code: "TOKEN_MISSING", message: "Larabank não retornou access_token." };
  }

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresIn:    data.expires_in,
  };
}

/** Adaptador de dados do Larabank (implementa BankAdapter) */
export const larabankAdapter: BankAdapter = {
  async fetchAccountData(
    accessToken: string,
    apiBaseUrl: string
  ): Promise<OpenFinanceAccountData> {
    const res = await fetch(`${apiBaseUrl}/api/accounts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept:        "application/json",
      },
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 401) throw { code: "TOKEN_EXPIRED",      message: "Token do Larabank expirado ou inválido." };
      if (status === 403) throw { code: "CONSENT_REVOKED",    message: "Consentimento revogado no Larabank." };
      if (status === 503) throw { code: "BANK_UNAVAILABLE",   message: "Larabank temporariamente indisponível." };
      throw { code: "UNKNOWN", message: `Erro ${status} ao buscar dados do Larabank.` };
    }

    const data = await res.json();
    // Suporte a diferentes formatos de resposta do Larabank
    const acct = data.account ?? data.data ?? data;

    return {
      availableBalance: Number(acct.availableBalance ?? acct.available_balance ?? acct.saldo_disponivel ?? 0),
      debt:             Number(acct.debt             ?? acct.divida              ?? acct.debts           ?? 0),
      limit:            Number(acct.limit            ?? acct.limite              ?? acct.credit_limit     ?? 0),
      loans:            Number(acct.loans            ?? acct.emprestimos         ?? acct.loan_total       ?? 0),
      investments:      Number(acct.investments      ?? acct.investimentos       ?? acct.investment_total ?? 0),
      estimatedIncome:  Number(acct.estimatedIncome  ?? acct.renda_estimada      ?? acct.estimated_income ?? 0),
      externalScore:    Number(acct.creditScore      ?? acct.externalScore       ?? acct.credit_score     ?? acct.score ?? 0),
    };
  },

  async revokeConsent(
    accessToken: string,
    apiBaseUrl: string,
    consentId: string
  ): Promise<void> {
    try {
      await fetch(`${apiBaseUrl}/api/consents/${consentId}`, {
        method:  "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept:        "application/json",
        },
      });
    } catch {
      console.warn("[Larabank] Falha ao notificar revogação no Larabank — revogação local prossegue.");
    }
  },
};
