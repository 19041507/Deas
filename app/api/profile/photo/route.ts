import { prisma } from "@/lib/prisma";
import { ensureUserColumns } from "@/lib/ensure-user-columns";
import { tokenFromRequest } from "@/lib/auth";
import { ok, fail, unauth } from "@/lib/http";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = tokenFromRequest(req);
  if (!userId) return unauth();
  const { photoUrl } = await req.json();
  if (!photoUrl) return fail("URL da foto obrigatória.");
  await ensureUserColumns();
  const user = await prisma.user.update({ where: { id: userId }, data: { photoUrl } });
  return ok({ user: { id: user.id, name: user.fullName, email: user.email, photoURL: user.photoUrl } });
}
