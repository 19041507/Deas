import { clearCookieHeader } from "@/lib/auth";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearCookieHeader());
  return res;
}
