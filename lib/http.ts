import { NextResponse } from "next/server";
export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (msg: string, status = 400) => NextResponse.json({ message: msg }, { status });
export const unauth = () => NextResponse.json({ message: "Não autorizado." }, { status: 401 });
