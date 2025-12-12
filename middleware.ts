import { LRUCache } from 'lru-cache';
import { getToken } from "next-auth/jwt";
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// ────────────────────────────────────────────────
// 🚀 TENANT CACHE avec LRU
// ────────────────────────────────────────────────
const tenantCache = new LRUCache<string, boolean>({
  max: 500, // Maximum 500 tenants en cache
  ttl: 1000 * 60 * 5, // TTL = 5 minutes
  updateAgeOnGet: true, // Reset TTL à chaque accès
  updateAgeOnHas: false,
});

// Cache pour stocker TOUS les tenants (refresh périodique)
let allTenantsCache: Set<string> | null = null;
let lastRefresh = 0;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * 🔄 Refresh la liste complète des tenants depuis la DB
 */
async function refreshAllTenants(baseUrl: string): Promise<Set<string>> {
  const now = Date.now();
  
  // Si le cache est encore valide, on le retourne
  if (allTenantsCache && (now - lastRefresh) < REFRESH_INTERVAL) {
    return allTenantsCache;
  }

  try {
    console.log("🔄 Refreshing all tenants from DB...");
    // ⚠️ Assurez-vous que cette route est publique et ne nécessite pas d'authentification
    const response = await fetch(`${baseUrl}/api/tenant/list`);
    
    if (response.ok) {
      const data = await response.json();
      const tenants = new Set<string>(data.tenants || []);
      
      allTenantsCache = tenants;
      lastRefresh = now;
      
      // Pré-remplir le LRU cache avec tous les tenants
      tenants.forEach(tenant => tenantCache.set(tenant, true));
      
      console.log(`✅ Cached ${tenants.size} tenants`);
      return tenants;
    }
  } catch (e) {
    console.error("❌ Error refreshing tenants:", e);
  }

  // Fallback : retourner le cache existant ou un Set vide
  return allTenantsCache || new Set();
}

/**
 * ✅ Vérifie si un tenant existe (avec cache intelligent)
 */
async function tenantExists(subdomain: string, baseUrl: string): Promise<boolean> {
  // 1️⃣ Check LRU cache (ultra-rapide)
  const cached = tenantCache.get(subdomain);
  if (cached !== undefined) {
    console.log(`⚡ Tenant "${subdomain}" found in LRU cache. Value: ${cached}`);
    return cached;
  }

  // 2️⃣ Check allTenantsCache
  const allTenants = await refreshAllTenants(baseUrl);
  if (allTenants.has(subdomain)) {
    console.log(`✅ Tenant "${subdomain}" found in global cache`);
    tenantCache.set(subdomain, true);
    return true;
  }

  // 3️⃣ Fallback : vérification DB individuelle (rare)
  try {
    console.log(`🔍 Checking tenant "${subdomain}" in DB...`);
    const response = await fetch(`${baseUrl}/api/tenant?subdomain=${subdomain}`);
    const exists = response.ok;
    
    // Cache le résultat (même négatif pour éviter spam)
    tenantCache.set(subdomain, exists);
    
    // Si trouvé, l'ajouter au cache global
    if (exists && allTenantsCache) {
      allTenantsCache.add(subdomain);
    }
    
    return exists;
  } catch (e) {
    console.error(`❌ Error checking tenant "${subdomain}":`, e);
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

  const allowedDomains = [
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
  
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_URL ||
    `http://localhost:${url.port || 3000}`;

  // ────────────────────────────────────────────────
  // 🧠 1) SUBDOMAIN CASE → tenant.print.simp.ac (Logique Stricte)
  // ────────────────────────────────────────────────
  if (subdomain) {
    // 1. Rewrite si session match
    if (sessionTenant === subdomain) {
      console.log("⚡ Session matches subdomain → rewrite immediately");
      return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
    }

    // 2. Vérification DB/Cache: Le sous-domaine doit être un tenant existant.
    const exists = await tenantExists(subdomain, baseUrl);

    if (exists) {
      console.log(`✅ Valid tenant subdomain "${subdomain}" → rewrite`);
      return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
    }

    // ⛔ BLOCAGE : Sous-domaine inconnu non-tenant.
    console.log(`❌ Invalid subdomain "${subdomain}" (not a tenant) → 404`);
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

  // On entre dans ce bloc si on est sur le domaine principal OU un sous-domaine réservé
  if (isMainDomain || isReserved) {
      
    // Si c'est la racine (pas de premier segment) → Autorisé
    if (!fullPathSegment) {
        console.log("✅ Root path (/) → allow");
        return NextResponse.next();
    }
    
    // Concaténation de toutes les routes autorisées (standard, publique, et réservée)
    const authorizedRoutes = [...standardRoutes, ...publicRoutes, ...reservedSubdomains];
    
    // 1. Vérification : Si le segment n'est pas dans la liste autorisée
    if (!authorizedRoutes.includes(fullPathSegment)) {
      
        // Tentative de vérification : Est-ce un tenant qui essaie d'accéder par la mauvaise méthode ?
        const existsAsTenant = await tenantExists(fullPathSegment, baseUrl);
        
        if (existsAsTenant) {
            // C'est un tenant -> Bloqué pour forcer l'usage du sous-domaine.
            console.log(`🚫 Tenant path "/${fullPathSegment}" blocked (use subdomain)`);
            return new NextResponse(null, { status: 404 });
        }
        
        // ⛔ BLOCAGE : Ni public, ni réservé, ni un tenant.
        console.log(`❌ Unauthorized path "/${fullPathSegment}" → 404`);
        return new NextResponse(null, { status: 404 });
    }

    // 2. Si c'est un sous-domaine RESERVÉ (ex: admin.localhost)
    if (isReserved) {
        console.log(`➡️ Rewriting reserved subdomain "${routePathPrefix}"`);
        // Réécrire vers le dossier racine correspondant (ex: /admin/dashboard)
        return NextResponse.rewrite(
            new URL(`/${routePathPrefix}${url.pathname}`, req.url)
        );
    }
  }

  // Si rien n'a matché (route standard/publique sur main domain)
  console.log("✅ Main domain/Public route → allow");
  return NextResponse.next();
}