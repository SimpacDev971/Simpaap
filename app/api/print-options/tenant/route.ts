import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * GET /api/print-options/tenant
 * Returns the print options assigned to the current user's tenant
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get tenant from user's tenantSlug
    const tenantSlug = session.user.tenantSlug;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantSlug },
      include: {
        tenant_print_color: {
          include: { print_color: true },
          where: { print_color: { isActive: true } },
        },
        tenant_print_side: {
          include: { print_side: true },
          where: { print_side: { isActive: true } },
        },
        tenant_enveloppe: {
          include: { enveloppe: true },
          where: { enveloppe: { isActive: true } },
        },
        tenant_speed: {
          include: { speed: true },
          where: { speed: { isActive: true } },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Sort options by sortOrder where available
    const colors = tenant.tenant_print_color
      .map(a => a.print_color)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const sides = tenant.tenant_print_side
      .map(a => a.print_side)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const enveloppes = tenant.tenant_enveloppe
      .map(a => a.enveloppe);

    const speeds = tenant.tenant_speed
      .map(a => a.speed)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return NextResponse.json({
      colors,
      sides,
      enveloppes,
      speeds,
    });
  } catch (error) {
    console.error('Error fetching tenant print options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
