import { notFound } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)"],
};

// ----------------------
// Cache avec expiration
// ----------------------
let cachedTenants: string[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

async function getTenants(req: NextRequest) {
  const now = Date.now();

  if (cachedTenants && cacheTimestamp && now - cacheTimestamp < CACHE_TTL) {
    return cachedTenants;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/tenant`);

    if (!res.ok) throw new Error("Failed to fetch tenants");

    const data = await res.json();
    cachedTenants = data.map((t: { subdomain: string }) => t.subdomain);
    cacheTimestamp = now;

    return cachedTenants;
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("⚠️ Unable to fetch tenants:", err);
    return cachedTenants || []; // fallback sur cache
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host")?.split(":")[0] || "";

  const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || "print.simp.ac";

  const isMainDomain =
    hostname === MAIN_DOMAIN || hostname === `www.${MAIN_DOMAIN}` || hostname.startsWith("localhost");

  const subdomain = isMainDomain ? null : hostname.split(".")[0];

  if (process.env.NODE_ENV === "development") {
    console.log("📡 Host:", hostname, "🏷️ Subdomain:", subdomain);
  }

  const tenants = await getTenants(req);

  // ----------------------------
  // MAIN DOMAIN
  // ----------------------------
  if (isMainDomain) {
    const firstSegment = url.pathname.split("/").filter(Boolean)[0];
    const publicRoutes = ["api", "_next", "_static", "login", "admin"];

    if (firstSegment && !publicRoutes.includes(firstSegment)) {
      if (tenants.includes(firstSegment)) {
        if (process.env.NODE_ENV === "development") console.log("⛔ Tenant path used without subdomain → 404");
        return notFound();
      }
    }

    return NextResponse.next();
  }

  // ----------------------------
  // SUBDOMAIN LOGIC
  // ----------------------------
  if (subdomain) {
    if (tenants.includes(subdomain)) {
      if (process.env.NODE_ENV === "development") console.log("➡️ Valid tenant → rewrite");
      return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
    } else {
      if (process.env.NODE_ENV === "development") console.log("❌ Unknown subdomain → 404");
      return notFound();
    }
  }

  if (process.env.NODE_ENV === "development") console.log("❌ No matching domain rule → 404");
  return notFound();
}
