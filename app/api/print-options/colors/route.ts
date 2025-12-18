import { invalidatePrintOptionsCache } from '@/lib/cache';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/print-options/colors
 * Récupère toutes les couleurs d'impression (global)
 * Optional: ?tenantId=xxx to get colors assigned to a tenant
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');

  try {
    if (tenantId) {
      // Get colors assigned to this tenant
      const assignments = await prisma.tenant_print_color.findMany({
        where: { tenantId },
        include: {
          print_color: true,
        },
        orderBy: { print_color: { sortOrder: 'asc' } },
      });
      return NextResponse.json(assignments.map(a => a.print_color));
    }

    // Get all global colors
    const colors = await prisma.print_color.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(colors);
  } catch (error) {
    console.error('Error fetching print colors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/print-options/colors
 * Crée une nouvelle couleur d'impression (global)
 * Body: { value, label, isActive?, sortOrder? }
 * Requires SUPERADMIN
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { value, label, isActive = true, sortOrder = 0 } = body;

    if (!value || !label) {
      return NextResponse.json(
        { error: 'value and label are required' },
        { status: 400 }
      );
    }

    const color = await prisma.print_color.create({
      data: { value, label, isActive, sortOrder },
    });

    // Invalidate cache for all tenants that might have this assigned
    // (for new options, no cache invalidation needed)

    return NextResponse.json(color, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating print color:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A color with this value already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
