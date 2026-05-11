import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",

  // Rotas OAuth públicas: o banco parceiro precisa acessar sem cookie do Deas.
  // A própria rota /api/oauth/authorize redireciona para login quando o usuário ainda não está logado.
  "/open-finance/authorize",
  "/api/open-finance/authorize",
  "/api/open-finance/token",
  "/api/oauth/authorize",
  "/api/oauth/token",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const auth = req.headers.get("authorization") || "";
    const cookie = req.cookies.get("deas_token")?.value || "";
    if (!auth.startsWith("Bearer ") && !cookie) {
      return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.next();
  }

  const token = req.cookies.get("deas_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/") return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|client/).*)"],
};
