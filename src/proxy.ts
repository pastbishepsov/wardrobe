import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, authEnabled, verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login", "/manifest.webmanifest", "/sw.js"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!authEnabled()) {
    // Never fail open in production: without a password the whole wardrobe would be public.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("APP_PASSWORD не задан — приложение закрыто", { status: 503 });
    }
    return NextResponse.next();
  }
  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/icons/")) {
    return NextResponse.next();
  }

  const ok = await verifyToken(request.cookies.get(COOKIE_NAME)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
