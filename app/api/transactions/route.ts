import { prisma } from "@/lib/prisma";
import { tokenFromRequest } from "@/lib/auth";
import { ok, unauth } from "@/lib/http";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all";
  const period = parseInt(searchParams.get("period") || "30");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const where: any = { userId };
  if (type !== "all") where.type = type;
  if (period > 0) {
    const from = new Date(); from.setDate(from.getDate() - period);
    where.createdAt = { gte: from };
  }
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.transaction.count({ where })
  ]);
  return ok({ transactions: transactions.map(t => ({ ...t, value: Number(t.value) })), total, page, pages: Math.ceil(total / limit) });
}
