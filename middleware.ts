import { LRUCache } from 'lru-cache';
import { getToken } from "next-auth/jwt";
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// ────────────────────────────────────────────────
// 🚀 TENANT CACHE avec LRU (TTL réduit à 2 minutes pour sécurité)
// ────────────────────────────────────────────────
// Separate caches for positive and negative results
// Positive: tenant exists → cache 2 minutes, refresh on access
const tenantCachePositive = new LRUCache<string, true>({
  max: 500,
  ttl: 1000 * 60 * 2,
  updateAgeOnGet: true,
});

// Negative: tenant doesn't exist → cache 30 seconds, NO refresh on access (allows retry)
const tenantCacheNegative = new LRUCache<string, false>({
  max: 200,
  ttl: 1000 * 30,
  updateAgeOnGet: false,
});

let allTenantsCache: Set<string> | null = null;
let lastRefresh = 0;
const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes (reduced)

// ────────────────────────────────────────────────
// 🚨 DB DOWN ALERT (Edge-compatible, via Mailjet REST API)
// ────────────────────────────────────────────────
let lastAlertSent = 0;
const ALERT_COOLDOWN = 10 * 60 * 1000; // 1 alert max per 10 minutes
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 3; // Send alert after 3 consecutive failures

async function sendDbDownAlert(errorContext: string) {
  const now = Date.now();

  // Cooldown: don't spam developer
  if (now - lastAlertSent < ALERT_COOLDOWN) return;

  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;
  const senderEmail = process.env.MAILJET_SENDER_EMAIL;
  const devEmail = process.env.DEV_ALERT_EMAIL;

  if (!apiKey || !apiSecret || !senderEmail || !devEmail) return;

  try {
    const credentials = btoa(`${apiKey}:${apiSecret}`);
    const timestamp = new Date().toISOString();

    await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: senderEmail, Name: 'Simpaap Alert' },
            To: [{ Email: devEmail }],
            Subject: `[ALERTE CRITIQUE] Simpaap - Base de données inaccessible`,
            TextPart: [
              `ALERTE SECURITE - Base de données inaccessible`,
              ``,
              `Date/Heure: ${timestamp}`,
              `Contexte: ${errorContext}`,
              `Echecs consecutifs: ${consecutiveFailures}`,
              ``,
              `L'application Simpaap ne parvient pas a contacter la base de données.`,
              `Les tenants ne peuvent plus être resolus. Le cache existant est utilisé en fallback.`,
              ``,
              `Actions recommandées:`,
              `- Verifier le serveur PostgreSQL`,
              `- Verifier la connectivite reseau`,
              `- Verifier les variables DATABASE_URL / DIRECT_URL`,
              `- Consulter les logs du serveur`,
              ``,
              `-- Simpaap Middleware Alert System`,
            ].join('\n'),
            HTMLPart: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #dc2626; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0;">
                  <h2 style="margin: 0;">ALERTE CRITIQUE</h2>
                  <p style="margin: 5px 0 0;">Base de données inaccessible</p>
                </div>
                <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #374151;">Date/Heure</td>
                      <td style="padding: 8px 0; color: #6b7280;">${timestamp}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #374151;">Contexte</td>
                      <td style="padding: 8px 0; color: #6b7280;">${errorContext}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; color: #374151;">Echecs consecutifs</td>
                      <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${consecutiveFailures}</td>
                    </tr>
                  </table>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="color: #374151;">L'application ne parvient pas a contacter la base de données. Le cache existant est utilisé en fallback.</p>
                  <h3 style="color: #374151; margin-top: 20px;">Actions recommandées</h3>
                  <ul style="color: #6b7280; line-height: 1.8;">
                    <li>Vérifier le serveur PostgreSQL</li>
                    <li>Vérifier la connectivité réseau</li>
                    <li>Vérifier les variables DATABASE_URL / DIRECT_URL</li>
                    <li>Consulter les logs du serveur</li>
                  </ul>
                  <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">Simpaap Middleware Alert System</p>
                </div>
              </div>
            `,
            CustomID: 'db-down-alert',
          },
        ],
      }),
    });

    lastAlertSent = now;
  } catch {
    // Alert send failed — nothing else we can do from Edge Runtime
  }
}

/**
 * Generate internal API token for secure middleware-to-API communication
 * Uses Web Crypto API (Edge Runtime compatible) with SHA-256 digest
 */
async function generateInternalApiToken(): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000));
  const payload = `${secret}:internal-api:${timestamp}`;

  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate subdomain format (security check)
 */
function isValidSubdomainFormat(subdomain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain.toLowerCase());
}

/**
 * Refresh tenant list with secure internal token
 */
async function refreshAllTenants(baseUrl: string): Promise<Set<string>> {
  const now = Date.now();

  if (allTenantsCache && (now - lastRefresh) < REFRESH_INTERVAL) {
    consecutiveFailures = 0; // Cache is valid, reset failures
    return allTenantsCache;
  }

  try {
    const internalToken = await generateInternalApiToken();
    const response = await fetch(`${baseUrl}/api/tenant/list`, {
      headers: {
        'x-internal-token': internalToken,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const tenants = new Set<string>(data.tenants || []);

      allTenantsCache = tenants;
      lastRefresh = now;
      consecutiveFailures = 0; // Success: reset counter

      tenants.forEach(tenant => tenantCachePositive.set(tenant, true));

      return tenants;
    }

    // Non-OK response (500 = likely DB error)
    consecutiveFailures++;
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      await sendDbDownAlert(
        `refreshAllTenants - HTTP ${response.status} from /api/tenant/list`
      );
    }
  } catch (e) {
    consecutiveFailures++;
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      await sendDbDownAlert(
        `refreshAllTenants - fetch failed: ${e instanceof Error ? e.message : 'Unknown error'}`
      );
    }
  }

  return allTenantsCache || new Set();
}

/**
 * Check if tenant exists (with security validation)
 */
async function tenantExists(subdomain: string, baseUrl: string): Promise<boolean> {
  // Security: Validate subdomain format first
  if (!isValidSubdomainFormat(subdomain)) {
    return false;
  }

  // 1. Check positive cache (tenant exists)
  if (tenantCachePositive.get(subdomain)) {
    return true;
  }

  // 2. Check negative cache (tenant doesn't exist) — short TTL, allows retry
  if (tenantCacheNegative.has(subdomain)) {
    return false;
  }

  // 3. Check global cache
  const allTenants = await refreshAllTenants(baseUrl);
  if (allTenants.has(subdomain)) {
    tenantCachePositive.set(subdomain, true);
    return true;
  }

  // 3. Fallback: Individual DB check with internal token
  try {
    const internalToken = await generateInternalApiToken();
    const response = await fetch(`${baseUrl}/api/tenant?subdomain=${encodeURIComponent(subdomain)}`, {
      headers: {
        'x-internal-token': internalToken,
      },
    });

    if (response.status >= 500) {
      consecutiveFailures++;
      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        await sendDbDownAlert(
          `tenantExists("${subdomain}") - HTTP ${response.status} from /api/tenant`
        );
      }
      return false;
    }

    consecutiveFailures = 0;
    const exists = response.ok;

    if (exists) {
      tenantCachePositive.set(subdomain, true);
      if (allTenantsCache) allTenantsCache.add(subdomain);
    } else {
      tenantCacheNegative.set(subdomain, false);
    }

    return exists;
  } catch (e) {
    consecutiveFailures++;
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      await sendDbDownAlert(
        `tenantExists("${subdomain}") - fetch failed: ${e instanceof Error ? e.message : 'Unknown error'}`
      );
    }
    return false;
  }
}

// ────────────────────────────────────────────────
// 🛡️ CONFIGURATION & MIDDLEWARE
// ────────────────────────────────────────────────
export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
  ],
};

// 🆕 DÉFINITIONS DE ROUTES & DOMAINES AUTORISÉS
const standardRoutes = ["api", "_next", "_static", "favicon.ico"];
const publicRoutes = ["login", "register", "pricing", "about", "contact"]; // Pages sur domaine principal
const reservedSubdomains = ["www", "app", "dashboard"]; // Sous-domaines non-tenant

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  let hostname = req.headers.get("host") || "";
  hostname = hostname.split(":")[0];

  // Security: Remove localhost in production
  const allowedDomains = process.env.NODE_ENV === 'production'
    ? [
        "simpaap.vercel.app",
        "print.simp.ac",
        "www.print.simp.ac",
        "tudominio.ar",
        "www.tudominio.ar",
      ]
    : [
        "simpaap.vercel.app",
        "print.simp.ac",
        "www.print.simp.ac",
        "tudominio.ar",
        "www.tudominio.ar",
        "localhost",
      ];

  // 1. Détermination du sous-domaine potentiel
  const hostSegments = hostname.split(".");
  const potentialSubdomain = hostSegments.length > 1 ? hostSegments[0] : null;

  const isMainDomain = allowedDomains.includes(hostname);
  
  // Le sous-domaine est-il un nom réservé (admin, www, etc.)?
  const isReserved = potentialSubdomain && reservedSubdomains.includes(potentialSubdomain);
  
  // Le sous-domaine est considéré comme un TENANT s'il n'est PAS réservé.
  const subdomain = isMainDomain || isReserved ? null : potentialSubdomain;
  
  // ────────────────────────────────────────────────
  // 🔐 Get session
  // ────────────────────────────────────────────────
  const token = await getToken({ req });
  const sessionTenant = token?.userTenant || null;
  
  // Build baseUrl for internal API calls
  // In dev (port present): always use localhost to avoid DNS issues with subdomains
  // In prod: use NEXTAUTH_URL (main domain) so tenant subdomain requests don't call themselves
  const requestHost = req.headers.get("host") || "localhost:3000";
  const portMatch = requestHost.match(/:(\d+)$/);
  const baseUrl = portMatch
    ? `http://localhost:${portMatch[1]}`
    : (process.env.NEXTAUTH_URL || `${url.protocol}//${requestHost}`);

  // ────────────────────────────────────────────────
  // 🧠 1) SUBDOMAIN CASE → tenant.print.simp.ac
  // ────────────────────────────────────────────────
  if (subdomain) {
    // Security: Validate subdomain format
    if (!isValidSubdomainFormat(subdomain)) {
      return new NextResponse(null, { status: 404 });
    }

    // 1. Rewrite if session matches
    if (sessionTenant === subdomain) {
      return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
    }

    // 2. Verify tenant exists
    const exists = await tenantExists(subdomain, baseUrl);

    if (exists) {
      return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
    }

    // Block unknown subdomains
    return new NextResponse(null, { status: 404 });
  }

  // ────────────────────────────────────────────────
  // 🏠 2) MAIN DOMAIN & RESERVED SUBDOMAINS (Logique Stricte)
  // ────────────────────────────────────────────────
  
  const segments = url.pathname.split("/").filter(Boolean);
  const first = segments[0]; 

  // Détermine le préfixe de route pour la vérification (admin si admin.localhost, ou login si localhost/login)
  let routePathPrefix = potentialSubdomain && isReserved ? potentialSubdomain : null;
  const fullPathSegment = routePathPrefix || first;

  // Main domain or reserved subdomain handling
  if (isMainDomain || isReserved) {

    if (!fullPathSegment) {
        return NextResponse.next();
    }

    const authorizedRoutes = [...standardRoutes, ...publicRoutes, ...reservedSubdomains];

    if (!authorizedRoutes.includes(fullPathSegment)) {
        const existsAsTenant = await tenantExists(fullPathSegment, baseUrl);

        if (existsAsTenant) {
            return new NextResponse(null, { status: 404 });
        }

        return new NextResponse(null, { status: 404 });
    }

    if (isReserved) {
        return NextResponse.rewrite(
            new URL(`/${routePathPrefix}${url.pathname}`, req.url)
        );
    }
  }

  return NextResponse.next();
}