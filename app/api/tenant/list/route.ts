// app/api/tenant/list/route.ts
import prisma from "@/lib/prisma";
import { verifyInternalApiToken } from "@/lib/security";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  try {
    // Security: Check for internal API token (from middleware) OR SUPERADMIN session
    const internalToken = req.headers.get('x-internal-token');
    const isInternalRequest = internalToken && verifyInternalApiToken(internalToken);

    if (!isInternalRequest) {
      // If not internal request, require SUPERADMIN authentication
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch tenants (no sensitive logging)
    const tenants = await prisma.tenant.findMany({
      select: {
        subdomain: true,
      },
    });

    const subdomains = tenants.map((t: { subdomain: string }) => t.subdomain);

    return NextResponse.json({
      success: true,
      tenants: subdomains,
      count: subdomains.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error("Error fetching tenants");

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tenants",
        tenants: []
      },
      { status: 500 }
    );
  }
}