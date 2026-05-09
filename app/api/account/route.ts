import { getAuthed, normalizeAccount } from "@/lib/store";
import { ok, unauth } from "@/lib/http";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { account } = await getAuthed(req);
  if (!account) return unauth();
  return ok({ account: normalizeAccount(account) });
}
