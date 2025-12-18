import { invalidatePrintOptionsCache } from '@/lib/cache';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/print-options/sides
 * Récupère tous les côtés d'impression (global)
 * Optional: ?tenantId=xxx to get sides assigned to a tenant
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');

  try {
    if (tenantId) {
      const assignments = await prisma.tenant_print_side.findMany({
        where: { tenantId },
        include: { print_side: true },
        orderBy: { print_side: { sortOrder: 'asc' } },
      });
      return NextResponse.json(assignments.map(a => a.print_side));
    }

    const sides = await prisma.print_side.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(sides);
  } catch (error) {
    console.error('Error fetching print sides:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/print-options/sides
 * Crée un nouveau côté d'impression (global)
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
      return NextResponse.json({ error: 'value and label are required' }, { status: 400 });
    }

    const side = await prisma.print_side.create({
      data: { value, label, isActive, sortOrder },
    });

    return NextResponse.json(side, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating print side:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A side with this value already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
