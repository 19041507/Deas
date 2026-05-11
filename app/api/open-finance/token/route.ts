import { POST as oauthTokenPost, OPTIONS as oauthTokenOptions } from "../../oauth/token/route";

export const dynamic = "force-dynamic";

// Rota de compatibilidade para bancos parceiros que chamam o padrão:
// POST /api/open-finance/token
export async function POST(req: Request) {
  return oauthTokenPost(req);
}

export async function OPTIONS() {
  return oauthTokenOptions();
}
