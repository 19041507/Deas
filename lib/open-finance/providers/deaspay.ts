/**
 * Adaptador específico para o DEASPay.
 *
 * Permite que o Deas Finance conecte no DEASPay usando OAuth2 real.
 * Rotas esperadas no DEASPay:
 *   GET  /authorize ou /api/oauth/authorize
 *   POST /token ou /api/oauth/token
 *   GET  /provider/accounts ou /api/provider/accounts
 */

import type { BankAdapter, OpenFinanceAccountData } from "../types";

const DEASPAY_API_BASE_URL =
  process.env.DEASPAY_API_BASE_URL ?? "https://deas-pay.vercel.app";

export function getDeaspayClientId() {
  return (
    process.env.DEASPAY_CLIENT_ID ??
    process.env.DEASPAY_OAUTH_CLIENT_ID ??
    process.env.OAUTH_CLIENT_ID ??
    ""
  );
}

export function getDeaspayClientSecret() {
  return (
    process.env.DEASPAY_CLIENT_SECRET ??
    process.env.DEASPAY_OAUTH_CLIENT_SECRET ??
    process.env.OAUTH_CLIENT_SECRET ??
    ""
  );
}

function cleanBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

const DEASPAY_BASE = cleanBaseUrl(DEASPAY_API_BASE_URL);

export const DEASPAY_AUTH_URL =
  process.env.DEASPAY_AUTH_URL ?? `${DEASPAY_BASE}/api/oauth/authorize`;

function getDeaspayTokenUrls() {
  return [
    process.env.DEASPAY_TOKEN_URL,
    `${DEASPAY_BASE}/api/oauth/token`,
    `${DEASPAY_BASE}/token`,
  ].filter(Boolean) as string[];
}

function getDeaspayAccountUrls(apiBaseUrl: string) {
  const base = cleanBaseUrl(apiBaseUrl || DEASPAY_API_BASE_URL);
  return [
    process.env.DEASPAY_ACCOUNTS_URL,
    `${base}/api/provider/accounts`,
    `${base}/provider/accounts`,
  ].filter(Boolean) as string[];
}

function pickAccessToken(data: any) {
  return data?.access_token ?? data?.accessToken ?? data?.token;
}

function pickRefreshToken(data: any) {
  return data?.refresh_token ?? data?.refreshToken;
}

function pickExpiresIn(data: any) {
  return data?.expires_in ?? data?.expiresIn;
}

function compactPayload(payload: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== "")
  ) as Record<string, string>;
}

async function postTokenRequest(url: string, payload: Record<string, string>, mode: "json" | "form") {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": mode === "json" ? "application/json" : "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: mode === "json" ? JSON.stringify(payload) : new URLSearchParams(payload).toString(),
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

export async function exchangeDeaspayCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const clientId = getDeaspayClientId();
  const clientSecret = getDeaspayClientSecret();

  if (!clientId || !clientSecret) {
    throw {
      code: "MISSING_DEASPAY_CREDENTIALS",
      message: "Credenciais do DEASPay ausentes. Configure DEASPAY_CLIENT_ID e DEASPAY_CLIENT_SECRET na Vercel do Deas Finance.",
    };
  }

  const payloads = [
    compactPayload({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
    compactPayload({
      grantType: "authorization_code",
      clientId,
      clientSecret,
      redirectUri,
      code,
    }),
  ];

  let lastError = "";
  const attempts: string[] = [];

  for (const tokenUrl of getDeaspayTokenUrls()) {
    for (const payload of payloads) {
      for (const mode of ["json", "form"] as const) {
        const { res, text, json } = await postTokenRequest(tokenUrl, payload, mode);
        const bodyMsg = json?.error_description ?? json?.message ?? json?.error ?? json?.detail ?? text;
        attempts.push(`${res.status} ${tokenUrl} ${mode}${bodyMsg ? ` - ${String(bodyMsg).slice(0, 160)}` : ""}`);

        if (res.ok) {
          const accessToken = pickAccessToken(json);
          if (!accessToken) {
            lastError = `${res.status} em ${tokenUrl} (${mode}) - resposta sem access_token`;
            continue;
          }
          return {
            accessToken,
            refreshToken: pickRefreshToken(json),
            expiresIn: pickExpiresIn(json),
          };
        }

        lastError = `${res.status} em ${tokenUrl} (${mode})${bodyMsg ? ` - ${String(bodyMsg).slice(0, 300)}` : ""}`;
        if (res.status === 404 || res.status === 405) break;
      }
    }
  }

  throw {
    code: "DEASPAY_TOKEN_EXCHANGE_FAILED",
    message: `DEASPay rejeitou a troca de code por token. Última tentativa: ${lastError}. Tentativas: ${attempts.slice(-6).join(" | ")}`,
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

function normalizeDeaspayData(data: any): OpenFinanceAccountData {
  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
  const summary = data?.summary ?? {};
  const firstAccount = accounts[0] ?? data?.account ?? data?.data?.account ?? data?.data ?? data;
  const score = data?.score ?? data?.creditScore ?? data?.externalScore ?? firstAccount?.score;

  return {
    availableBalance: toNumber(
      summary.totalAvailableBalance,
      firstAccount?.availableBalance,
      firstAccount?.balance,
      data?.availableBalance,
      data?.saldoDisponivel
    ),
    debt: toNumber(
      summary.totalDebtAmount,
      data?.debt,
      data?.totalDebt,
      data?.divida
    ),
    limit: toNumber(
      summary.totalCreditLimit,
      firstAccount?.creditLimit,
      firstAccount?.limit,
      data?.limit
    ),
    loans: toNumber(data?.loans, data?.loanTotal, 0),
    investments: toNumber(data?.investments, data?.investmentTotal, 0),
    estimatedIncome: toNumber(data?.estimatedIncome, data?.income, 0),
    externalScore: toNumber(
      score?.score,
      score?.value,
      score?.currentScore,
      score,
      0
    ),
  };
}

async function fetchJsonWithBearer(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
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

export const deaspayAdapter: BankAdapter = {
  async fetchAccountData(accessToken: string, apiBaseUrl: string): Promise<OpenFinanceAccountData> {
    let lastError = "";
    for (const url of getDeaspayAccountUrls(apiBaseUrl)) {
      const { res, text, json } = await fetchJsonWithBearer(url, accessToken);
      if (res.ok) return normalizeDeaspayData(json);

      const bodyMsg = json?.error_description ?? json?.message ?? json?.error ?? json?.detail ?? text;
      lastError = `${res.status} em ${url}${bodyMsg ? ` - ${String(bodyMsg).slice(0, 300)}` : ""}`;

      if (res.status === 404 || res.status === 405) continue;
      if (res.status === 401) throw { code: "TOKEN_EXPIRED", message: `Token do DEASPay expirado ou inválido. Detalhe: ${lastError}` };
      if (res.status === 403) throw { code: "CONSENT_REVOKED", message: `Consentimento revogado no DEASPay. Detalhe: ${lastError}` };
      throw { code: "UNKNOWN", message: `Erro ao buscar dados do DEASPay: ${lastError}` };
    }

    throw {
      code: "UNKNOWN",
      message: `Nenhuma rota de dados do DEASPay respondeu corretamente. Última tentativa: ${lastError}. Confirme GET /api/provider/accounts ou /provider/accounts no DEASPay.`,
    };
  },

  async revokeConsent(accessToken: string, apiBaseUrl: string, consentId: string): Promise<void> {
    try {
      const base = cleanBaseUrl(apiBaseUrl || DEASPAY_API_BASE_URL);
      await fetch(`${base}/api/consents/${consentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
    } catch {
      console.warn("[DEASPay] Falha ao notificar revogação — revogação local prossegue.");
    }
  },
};
