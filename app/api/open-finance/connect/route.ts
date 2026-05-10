/**
 * POST /api/open-finance/connect
 *
 * Inicia o fluxo de consentimento Open Finance para uma instituição.
 *
 * Fluxo correto:
 *   1. Usuário escolhe a instituição no front-end
 *   2. Esta rota cria um consentimento com status "pendente" e gera um `state` OAuth
 *   3. Retorna a URL de autorização do banco externo
 *   4. Front-end redireciona o usuário para essa URL
 *   5. Banco externo redireciona de volta para /api/open-finance/callback?code=...&state=...
 *   6. Callback troca o code por token, ativa o consentimento e sincroniza dados
 *
 * Neste projeto (simulação acadêmica):
 *   - O callback é chamado diretamente com um code simulado
 *   - O "accessToken" é derivado do state para gerar dados determinísticos
 */

import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, fail, unauth } from "@/lib/http";
import crypto from "crypto";

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

  /**
   * Em produção:
   *   https://api.banco-externo.com/authorize?client_id=...&redirect_uri=...&state={oauthState}
   *
   * Para simulação, o front-end chamará /api/open-finance/callback diretamente.
   */
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const authorizationUrl =
    `${appUrl}/api/open-finance/callback` +
    `?code=sim_${oauthState.slice(0, 16)}` +
    `&state=${oauthState}`;

  return ok({
    consentId: consent.id,
    institutionName: institution.name,
    authorizationUrl,
    simulated: true,
  });
}
