import { getAuthed } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await getAuthed(req);
  if (!ctx) return fail('Não autorizado.', 401);
  const rows = ctx.db.consents.filter(c => c.userId === ctx.user.id && !c.revokedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ok(rows.map(c => ({
    id: c.id,
    institutionName: c.targetBank,
    sourceBank: c.sourceBank,
    targetBank: c.targetBank,
    status: c.status,
    externalBalance: Number(c.partnerSnapshot?.externalBalance || c.partnerSnapshot?.availableBalance || 0),
    externalDebt: Number(c.partnerSnapshot?.externalDebt || 0),
    externalLimit: Number(c.partnerSnapshot?.externalLimit || 0),
    externalScore: Number(c.partnerSnapshot?.creditScore || c.partnerSnapshot?.externalScore || 0),
    estimatedIncome: Number(c.partnerSnapshot?.estimatedIncome || 0),
    connectedAt: c.createdAt
  })));
}
