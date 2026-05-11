/**
 * GET /api/open-finance/callback?code=...&state=...
 *
 * Rota de retorno OAuth após autorização no banco externo.
 *
 * Fluxo para bancos reais (ex: Larabank):
 *   1. Banco externo redireciona para cá com `code` e `state`
 *   2. Verificamos que o `state` bate com o salvo no consentimento (anti-CSRF)
 *   3. Trocamos o `code` por um accessToken na API do banco (OAuth2 real)
 *   4. Ativamos o consentimento e salvamos os tokens
 *   5. Fazemos a primeira sincronização de dados
 *   6. Redirecionamos o usuário de volta para a tela Open Finance
 *
 * Fluxo para bancos simulados:
 *   - O code é gerado internamente, então a "troca" é simulada
 *   - O accessToken é derivado do state para gerar dados determinísticos
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/open-finance/adapters";
import { exchangeCodeForToken } from "@/lib/open-finance/providers/larabank";

export const dynamic = "force-dynamic";

/** Slugs que fazem troca de token real via OAuth2 */
const REAL_TOKEN_EXCHANGE_SLUGS = new Set(["larabank"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectBase = `${appUrl}/open-finance`;

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?error=parametros_invalidos`);
  }

  // Busca o consentimento pendente pelo state (previne CSRF)
  const consent = await prisma.openFinanceConsent.findFirst({
    where: { oauthState: state, status: "pendente" },
    include: { institution: true },
  });

  if (!consent) {
    return NextResponse.redirect(`${redirectBase}?error=state_invalido`);
  }

  // Validade expirada
  if (consent.validUntil && consent.validUntil < new Date()) {
    await prisma.openFinanceConsent.update({
      where: { id: consent.id },
      data: { status: "expirado" },
    });
    return NextResponse.redirect(`${redirectBase}?error=consentimento_expirado`);
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${appUrl}/api/open-finance/callback`;

    let accessToken:  string;
    let refreshToken: string | undefined;

    if (REAL_TOKEN_EXCHANGE_SLUGS.has(consent.institution.slug)) {
      // Troca real de code por token via OAuth2
      const tokens = await exchangeCodeForToken(code, redirectUri);
      accessToken  = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    } else {
      /**
       * Simulação interna: o accessToken é derivado do state para ser determinístico
       * (assim o simulador gera sempre os mesmos dados para o mesmo usuário/banco)
       */
      accessToken  = `at_${consent.userId}_${consent.institution.slug}_${state.slice(0, 12)}`;
      refreshToken = `rt_${state.slice(12, 28)}`;
    }

    // Ativa o consentimento com os tokens recebidos
    await prisma.openFinanceConsent.update({
      where: { id: consent.id },
      data: {
        status:       "ativo",
        accessToken,
        refreshToken,
        oauthState:   null, // limpa o state após uso
      },
    });

    /**
     * A conexão OAuth já deu certo neste ponto.
     * A primeira sincronização pode falhar por rota/formato diferente no banco parceiro,
     * mas isso não deve transformar a conexão inteira em erro.
     */
    let syncOk = false;
    let syncError: string | null = null;

    try {
      const adapter = getAdapter(consent.institution.slug);
      const data = await adapter.fetchAccountData(accessToken, consent.institution.apiBaseUrl);

      await prisma.openFinanceSnapshot.create({
        data: {
          consentId:        consent.id,
          availableBalance: data.availableBalance,
          debt:             data.debt,
          limit:            data.limit,
          loans:            data.loans,
          investments:      data.investments,
          estimatedIncome:  data.estimatedIncome,
          externalScore:    data.externalScore,
        },
      });

      syncOk = true;
    } catch (syncErr: any) {
      syncError = syncErr?.message ?? "Falha ao sincronizar dados do banco parceiro.";
      console.error("[OF Callback] Conexão aprovada, mas sync inicial falhou:", syncErr);
    }

    await prisma.auditLog.create({
      data: {
        userId:  consent.userId,
        action:  syncOk ? "OF_CONSENT_APPROVED" : "OF_CONSENT_APPROVED_SYNC_FAILED",
        details: {
          consentId:     consent.id,
          institutionId: consent.institutionId,
          institutionName: consent.institution.name,
          status: syncOk ? "success" : "sync_failed",
          syncError,
        },
      },
    });

    // Recalcula score considerando todos os bancos conectados.
    // Se o sync falhou, ainda assim mantém a conexão ativa para o usuário reconectar/sincronizar depois.
    const { refreshScore } = await import("@/lib/account");
    await refreshScore(consent.userId);

    return NextResponse.redirect(
      syncOk
        ? `${redirectBase}?success=conectado`
        : `${redirectBase}?success=conectado&sync_error=1`
    );
  } catch (err: any) {
    console.error("[OF Callback] Erro:", err);

    await prisma.openFinanceConsent.update({
      where: { id: consent.id },
      data: { status: "erro" },
    });

    await prisma.auditLog.create({
      data: {
        userId:  consent.userId,
        action:  "OF_CONSENT_FAILED",
        details: { consentId: consent.id, error: err?.message ?? "Erro desconhecido" },
      },
    });

    const errorCode = err?.code ?? "TOKEN_EXCHANGE_FAILED";
    const errorMessage = err?.message ?? "Erro desconhecido";

    return NextResponse.redirect(
      `${redirectBase}?error=falha_na_conexao&code=${encodeURIComponent(errorCode)}&detail=${encodeURIComponent(errorMessage.slice(0, 800))}`
    );
  }
}
