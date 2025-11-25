import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  let hostname = req.headers.get("host")?.split(":")[0] || "";

  // Ton domaine !
  const MAIN_DOMAIN = "print.simp.ac";

  const isMainDomain =
    hostname === MAIN_DOMAIN || hostname === `www.${MAIN_DOMAIN}` || hostname === "localhost";

  const subdomain = isMainDomain ? null : hostname.split(".")[0];

  console.log("Middleware → Host:", hostname);
  console.log("Middleware → Subdomain:", subdomain);

  // MAIN DOMAIN LOGIC
  if (isMainDomain) {
    const firstSegment = url.pathname.split("/").filter(Boolean)[0];

    const publicRoutes = [
      "api",
      "_next",
      "_static",
    ];

    if (firstSegment && !publicRoutes.includes(firstSegment)) {
      const tenantRes = await fetch(
        `${req.nextUrl.origin}/api/tenant?subdomain=${firstSegment}`
      );

      if (tenantRes.ok) {
        return new NextResponse(null, { status: 404 });
      }
    }

    return NextResponse.next();
  }

  // SUBDOMAIN LOGIC
  if (subdomain) {
    const tenantRes = await fetch(
      `${req.nextUrl.origin}/api/tenant?subdomain=${subdomain}`
    );

    if (tenantRes.ok) {
      return NextResponse.rewrite(
        new URL(`/${subdomain}${url.pathname}`, req.url)
      );
    }

    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { status: 404 });
}
