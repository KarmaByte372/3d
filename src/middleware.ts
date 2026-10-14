import { NextResponse, type NextRequest } from "next/server";
import { HOME_BY_ROLE, SESSION_COOKIE, verifySession } from "@/lib/session";
import { bindSessionToIp, clientIp } from "@/lib/ip";

const AREAS: Record<string, string> = { "/musteri": "CUSTOMER", "/isletme": "BUSINESS", "/admin": "ADMIN" };

/**
 * Yönlendirme adresi, tarayıcının kullandığı adresten (nginx'in ilettiği Host / X-Forwarded-Proto) kurulur.
 * req.url uygulamanın dinlediği 127.0.0.1 / localhost adresini taşıdığından tarayıcı "localhost"a giderdi.
 */
function go(req: NextRequest, path: string, params: Record<string, string> = {}) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? req.nextUrl.protocol.replace(":", "");
  const url = new URL(path, `${proto}://${host}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const area = Object.keys(AREAS).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!area) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return go(req, "/giris", { next: pathname });
  if (bindSessionToIp() && session.ip !== clientIp(req.headers)) {
    const res = go(req, "/giris", { sebep: "ag", next: pathname });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  if (session.role !== AREAS[area]) return go(req, HOME_BY_ROLE[session.role] ?? "/");
  return NextResponse.next();
}

export const config = { matcher: ["/musteri/:path*", "/isletme/:path*", "/admin/:path*"] };
