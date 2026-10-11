import { NextResponse, type NextRequest } from "next/server";
import { HOME_BY_ROLE, SESSION_COOKIE, verifySession } from "@/lib/session";

const AREAS: Record<string, string> = { "/musteri": "CUSTOMER", "/isletme": "BUSINESS", "/admin": "ADMIN" };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const area = Object.keys(AREAS).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!area) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/giris", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (session.role !== AREAS[area]) {
    return NextResponse.redirect(new URL(HOME_BY_ROLE[session.role] ?? "/", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/musteri/:path*", "/isletme/:path*", "/admin/:path*"] };
