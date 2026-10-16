import { NextResponse } from "next/server";
import { COOKIE_MAX_AGE, COOKIE_NAME, makeToken, passwordMatches } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = body.password ?? "";
  if (!passwordMatches(password)) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: await makeToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE_NAME, value: "", path: "/", maxAge: 0 });
  return res;
}
