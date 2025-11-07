import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get('subdomain')

  // Si pas de subdomain, retourner tous les tenants (nécessite SUPERADMIN)
  if (!subdomain) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(tenants);
    } catch (error) {
      console.error('API: Error fetching tenants:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
      select: { id: true, name: true, subdomain: true }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('API: Error fetching tenant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}