import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/print-options/speeds
 * Retrieves all affranchissement speeds (global)
 * Optional: ?activeOnly=true to get only active speeds
 */
export async function GET(req: NextRequest) {
  const activeOnly = req.nextUrl.searchParams.get('activeOnly') === 'true';

  try {
    const whereClause: { isActive?: boolean } = {};

    if (activeOnly) {
      whereClause.isActive = true;
    }

    const speeds = await prisma.affranchissement_speed.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(speeds);
  } catch (error) {
    console.error('Error fetching speeds:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/print-options/speeds
 * Creates a new affranchissement speed (global)
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

    const speed = await prisma.affranchissement_speed.create({
      data: {
        value,
        label,
        isActive,
        sortOrder: parseInt(sortOrder, 10),
      },
    });

    return NextResponse.json(speed, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating speed:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A speed with this value already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
