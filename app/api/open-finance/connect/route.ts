/**
 * POST /api/open-finance/connect
 *
 * Inicia o fluxo de consentimento Open Finance para uma instituição.
 *
 * Fluxo para bancos reais (ex: Larabank):
 *   1. Usuário escolhe a instituição no front-end
 *   2. Esta rota cria um consentimento com status "pendente" e gera um `state` OAuth
 *   3. Retorna a URL de autorização do banco externo (OAuth2 real)
 *   4. Front-end redireciona o usuário para essa URL
 *   5. Banco externo autentica o usuário e redireciona para /api/open-finance/callback?code=...&state=...
 *   6. Callback troca o code por token, ativa o consentimento e sincroniza dados
 *
 * Fluxo para bancos simulados (sem adaptador real):
 *   - O callback é chamado diretamente com um code simulado
 *   - O "accessToken" é derivado do state para gerar dados determinísticos
 */

import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, fail, unauth } from "@/lib/http";
import { LARABANK_AUTH_URL } from "@/lib/open-finance/providers/larabank";
import crypto from "crypto";

/** Slugs de instituições que usam OAuth2 real (não simulado) */
const REAL_OAUTH_INSTITUTIONS: Record<string, { authUrl: string; clientIdEnv: string; scopes: string }> = {
  "larabank": {
    authUrl:      LARABANK_AUTH_URL,
    clientIdEnv:  "LARABANK_CLIENT_ID",
    scopes:       "accounts balances transactions",
  },
};

export const dynamic = "force-dynamic";

const DEFAULT_PERMISSIONS = [
  "ACCOUNTS_READ",
  "BALANCES_READ",
  "TRANSACTIONS_READ",
  "CREDIT_SCORE_READ",
];

export async function POST(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();

  const body = await req.json().catch(() => ({}));
  const { institutionId } = body;

  if (!institutionId) return fail("ID da instituição obrigatório.");

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId, active: true },
  });
  if (!institution) return fail("Instituição não encontrada ou inativa.");

  const existing = await prisma.openFinanceConsent.findFirst({
    where: { userId, institutionId, status: "ativo" },
  });
  if (existing) return fail(`Você já está conectado ao ${institution.name}.`);

  // Gera código `state` para prevenir CSRF no fluxo OAuth
  const oauthState = crypto.randomBytes(32).toString("hex");

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const consent = await prisma.openFinanceConsent.create({
    data: {
      userId,
      institutionId,
      status: "pendente",
      oauthState,
      permissions: DEFAULT_PERMISSIONS,
      validUntil,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "OF_CONSENT_CREATED",
      details: { institutionId, institutionName: institution.name, consentId: consent.id },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/open-finance/callback`;

  // Verifica se a instituição usa OAuth2 real
  const realOAuth = REAL_OAUTH_INSTITUTIONS[institution.slug];

  let authorizationUrl: string;
  let simulated: boolean;

  if (realOAuth) {
    // OAuth2 real — redireciona para autenticação no banco externo
    const clientId = process.env[realOAuth.clientIdEnv] ?? "";

    if (!clientId) {
      return fail(`LARABANK_CLIENT_ID não está configurado na Vercel do Deas Finance.`);
    }

    const params = new URLSearchParams({
      client_id:     clientId,
      clientId:      clientId,
      redirect_uri:  redirectUri,
      redirectUri:   redirectUri,
      response_type: "code",
      responseType:  "code",
      scope:         realOAuth.scopes,
      state:         oauthState,
    });
    authorizationUrl = `${realOAuth.authUrl}?${params.toString()}`;
    simulated = false;
  } else {
    /**
     * Simulação interna — o front-end chamará /api/open-finance/callback diretamente.
     * O "accessToken" é derivado do state para ser determinístico.
     */
    authorizationUrl =
      `${appUrl}/api/open-finance/callback` +
      `?code=sim_${oauthState.slice(0, 16)}` +
      `&state=${oauthState}`;
    simulated = true;
  }

  return ok({
    consentId: consent.id,
    institutionName: institution.name,
    authorizationUrl,
    simulated,
  });
}
