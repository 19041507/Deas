/**
 * Adaptador específico para o Larabank.
 *
 * Implementa OAuth2 real (Authorization Code Flow) com o Larabank.
 *
 * Endpoints OAuth esperados no Larabank:
 *   GET  {LARABANK_API_BASE_URL}/open-finance/authorize
 *   POST {LARABANK_API_BASE_URL}/api/open-finance/token
 *   GET  {LARABANK_API_BASE_URL}/api/open-finance/provider/accounts
 *
 * Este adaptador também tenta rotas alternativas de dados para não quebrar
 * quando o banco parceiro expõe /provider em vez de /provider/accounts.
 */

import type { BankAdapter, OpenFinanceAccountData } from "../types";

const LARABANK_API_BASE_URL =
  process.env.LARABANK_API_BASE_URL ?? "https://larabankdigital2.vercel.app";

const LARABANK_CLIENT_ID     = process.env.LARABANK_CLIENT_ID ?? "";
const LARABANK_CLIENT_SECRET = process.env.LARABANK_CLIENT_SECRET ?? "";

function cleanBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

/** URL de autorização OAuth do Larabank */
export const LARABANK_AUTH_URL = `${cleanBaseUrl(LARABANK_API_BASE_URL)}/open-finance/authorize`;

/**
 * Rotas possíveis de token do Larabank.
 * Alguns projetos expõem /api/open-finance/token, outros expõem /api/oauth/token.
 */
const LARABANK_TOKEN_URLS = [
  `${cleanBaseUrl(LARABANK_API_BASE_URL)}/api/open-finance/token`,
  `${cleanBaseUrl(LARABANK_API_BASE_URL)}/api/oauth/token`,
];

/** URL principal de troca de code por token do Larabank */
export const LARABANK_TOKEN_URL = LARABANK_TOKEN_URLS[0];

function pickAccessToken(data: any) {
  return (
    data?.access_token ??
    data?.accessToken ??
    data?.token?.access_token ??
    data?.token?.accessToken ??
    data?.data?.access_token ??
    data?.data?.accessToken
  );
}

function pickRefreshToken(data: any) {
  return (
    data?.refresh_token ??
    data?.refreshToken ??
    data?.token?.refresh_token ??
    data?.token?.refreshToken ??
    data?.data?.refresh_token ??
    data?.data?.refreshToken
  );
}

function pickExpiresIn(data: any) {
  return data?.expires_in ?? data?.expiresIn ?? data?.data?.expires_in ?? data?.data?.expiresIn;
}

async function postTokenRequest(url: string, payload: Record<string, string>, mode: "json" | "form") {
  const body = mode === "json" ? JSON.stringify(payload) : new URLSearchParams(payload).toString();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": mode === "json" ? "application/json" : "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { res, text, json };
}

/**
 * Troca o authorization code por um access token no Larabank.
 * Chamado pelo callback route após o redirecionamento OAuth.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const payload = {
    grant_type:    "authorization_code",
    client_id:     LARABANK_CLIENT_ID,
    client_secret: LARABANK_CLIENT_SECRET,
    redirect_uri:  redirectUri,
    code,
  };

  let lastError = "";

  for (const tokenUrl of LARABANK_TOKEN_URLS) {
    for (const mode of ["json", "form"] as const) {
      const { res, text, json } = await postTokenRequest(tokenUrl, payload, mode);

      if (res.ok) {
        const accessToken = pickAccessToken(json);
        if (!accessToken) {
          lastError = `${res.status} em ${tokenUrl} (${mode}) - resposta sem access_token: ${text.slice(0, 300)}`;
          continue;
        }

        return {
          accessToken,
          refreshToken: pickRefreshToken(json),
          expiresIn: pickExpiresIn(json),
        };
      }

      const bodyMsg = json?.message ?? json?.error ?? text;
      lastError = `${res.status} em ${tokenUrl} (${mode})${bodyMsg ? ` - ${String(bodyMsg).slice(0, 300)}` : ""}`;

      // Rota inexistente ou método incompatível: tenta a próxima rota.
      if (res.status === 404 || res.status === 405) break;
    }
  }

  throw {
    code:    "TOKEN_EXCHANGE_FAILED",
    message: `Larabank rejeitou a troca de code por token. Última tentativa: ${lastError}`,
  };
}

function toNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function unwrapAccountPayload(data: any) {
  /**
   * Aceita todos estes formatos:
   * { account: {...} }
   * { data: { account: {...} } }
   * { data: {...} }
   * { ok: true, account: {...} }
   * {...camposDaConta}
   */
  return data?.account ?? data?.data?.account ?? data?.data ?? data;
}

function normalizeAccountData(data: any): OpenFinanceAccountData {
  const acct = unwrapAccountPayload(data);

  return {
    availableBalance: toNumber(
      acct?.availableBalance,
      acct?.available_balance,
      acct?.saldoDisponivel,
      acct?.saldo_disponivel,
      acct?.saldo,
      acct?.balance
    ),
    debt: toNumber(
      acct?.debt,
      acct?.divida,
      acct?.dividas,
      acct?.debts,
      acct?.totalDebt,
      acct?.total_debt
    ),
    limit: toNumber(
      acct?.limit,
      acct?.limite,
      acct?.creditLimit,
      acct?.credit_limit,
      acct?.limiteCredito,
      acct?.limite_credito
    ),
    loans: toNumber(
      acct?.loans,
      acct?.emprestimos,
      acct?.loanTotal,
      acct?.loan_total,
      acct?.loansTotal,
      acct?.loans_total
    ),
    investments: toNumber(
      acct?.investments,
      acct?.investimentos,
      acct?.investmentTotal,
      acct?.investment_total
    ),
    estimatedIncome: toNumber(
      acct?.estimatedIncome,
      acct?.estimated_income,
      acct?.rendaEstimada,
      acct?.renda_estimada,
      acct?.income,
      acct?.renda
    ),
    externalScore: toNumber(
      acct?.creditScore,
      acct?.credit_score,
      acct?.externalScore,
      acct?.external_score,
      acct?.score
    ),
  };
}

async function fetchJsonWithBearer(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept:        "application/json",
    },
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { res, text, json };
}

/** Adaptador de dados do Larabank (implementa BankAdapter) */
export const larabankAdapter: BankAdapter = {
  async fetchAccountData(
    accessToken: string,
    apiBaseUrl: string
  ): Promise<OpenFinanceAccountData> {
    const base = cleanBaseUrl(apiBaseUrl || LARABANK_API_BASE_URL);

    const candidateUrls = [
      `${base}/api/open-finance/provider/accounts`,
      `${base}/api/open-finance/provider`,
      `${base}/api/open-finance/accounts`,
      `${base}/api/account`,
    ];

    let lastError = "";

    for (const url of candidateUrls) {
      const { res, text, json } = await fetchJsonWithBearer(url, accessToken);

      if (res.ok) {
        return normalizeAccountData(json);
      }

      const bodyMsg = json?.message ?? json?.error ?? text;
      lastError = `${res.status} em ${url}${bodyMsg ? ` - ${String(bodyMsg).slice(0, 300)}` : ""}`;

      // 404/405 significa rota incompatível: tenta a próxima rota conhecida.
      if (res.status === 404 || res.status === 405) continue;

      if (res.status === 401) {
        throw { code: "TOKEN_EXPIRED", message: `Token do Larabank expirado ou inválido. Detalhe: ${lastError}` };
      }
      if (res.status === 403) {
        throw { code: "CONSENT_REVOKED", message: `Consentimento revogado no Larabank. Detalhe: ${lastError}` };
      }
      if (res.status === 503) {
        throw { code: "BANK_UNAVAILABLE", message: `Larabank temporariamente indisponível. Detalhe: ${lastError}` };
      }

      throw { code: "UNKNOWN", message: `Erro ao buscar dados do Larabank: ${lastError}` };
    }

    throw {
      code: "UNKNOWN",
      message:
        `Nenhuma rota de dados do Larabank respondeu corretamente. Última tentativa: ${lastError}. ` +
        `Confirme se o Larabank possui GET /api/open-finance/provider/accounts ou GET /api/open-finance/provider.`,
    };
  },

  async revokeConsent(
    accessToken: string,
    apiBaseUrl: string,
    consentId: string
  ): Promise<void> {
    try {
      const base = cleanBaseUrl(apiBaseUrl || LARABANK_API_BASE_URL);
      await fetch(`${base}/api/consents/${consentId}`, {
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
