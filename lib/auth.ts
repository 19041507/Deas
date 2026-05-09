import crypto from "node:crypto";
import bcrypt from "bcryptjs";
const secret = () => process.env.APP_SECRET || "deasfinance-dev-secret-CHANGE-IN-PROD-32chars";
export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const comparePassword = (p: string, h: string) => bcrypt.compare(p, h);
export function createToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now(), exp: Date.now() + 1000*60*60*24*7 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
export function verifyToken(token?: string | null): string | null {
  if (!token?.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp && Date.now() > data.exp) return null;
    return data.userId as string;
  } catch { return null; }
}
export function tokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return verifyToken(auth.slice(7));
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/deas_token=([^;]+)/);
  return verifyToken(match?.[1]);
}
const isProd = process.env.NODE_ENV === "production";
export function setCookieHeader(token: string) {
  return `deas_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60*60*24*7}${isProd ? "; Secure" : ""}`;
}
export function clearCookieHeader() {
  return `deas_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? "; Secure" : ""}`;
}
