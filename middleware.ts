import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  let hostname = req.headers.get("host") || '';

  // Remove port if it exists
  hostname = hostname.split(':')[0];

  // Define allowed domains (including main domain and localhost)
  const allowedDomains = ["tudominio.ar", "www.tudominio.ar", "localhost"];

  // Check if the current hostname is in the list of allowed domains
  const isMainDomain = allowedDomains.includes(hostname);

  // Extract subdomain if not a main domain
  const subdomain = isMainDomain ? null : hostname.split('.')[0];

  console.log('Middleware: Hostname:', hostname);
  console.log('Middleware: Subdomain:', subdomain);

  // If it's a main domain, check if the path starts with a tenant subdomain
  // Block direct access to tenant routes via localhost:3000/[subdomain]/...
  if (isMainDomain) {
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const firstSegment = pathSegments[0];
    
    // Allow standard routes that are not tenant-specific
    const standardRoutes = ['api', 'login', 'admin', 'forgot-password', 'reset-password', '_next', '_static'];
    
    // If the first segment is not a standard route, check if it's a tenant
    if (firstSegment && !standardRoutes.includes(firstSegment)) {
      try {
        // Check if this segment corresponds to an existing tenant
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || `http://localhost:${url.port || 3000}`;
        const tenantCheck = await fetch(`${baseUrl}/api/tenant?subdomain=${firstSegment}`);
        console.log("tenantCheck "+tenantCheck)
        
        if (tenantCheck.ok) {
          // This is a tenant accessed directly via localhost:3000/[subdomain]/...
          // Block it to force the use of subdomain URLs
          console.log('Middleware: Blocking direct access to tenant route. Use subdomain URL instead:', url.pathname);
          return new NextResponse(null, { status: 404 });
        }
      } catch (error) {
        // If we can't check, allow the request to proceed (might not be a tenant)
        console.log('Middleware: Could not verify tenant, allowing request');
      }
    }
    
    console.log('Middleware: Main domain detected, passing through');
    return NextResponse.next();
  }

  // Handle subdomain logic
  if (subdomain) {
    try {
      // Use fetch to verify if the subdomain exists
      const response = await fetch(`${url.origin}/api/tenant?subdomain=${subdomain}`);
      console.log(response.ok)
      if (response.ok) {
        console.log('Middleware: Valid subdomain detected, rewriting URL');
        // Rewrite the URL to a dynamic route based on the subdomain
        return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
      }
    } catch (error) {
      console.error('Middleware: Error fetching tenant:', error);
    }
  }

  console.log('Middleware: Invalid subdomain or domain, returning 404');
  // If none of the above conditions are met, return a 404 response
  return new NextResponse(null, { status: 404 });
}
