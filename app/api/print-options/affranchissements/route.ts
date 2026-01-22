import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/print-options/affranchissements
 * Retrieves all affranchissements (global)
 * Optional: ?activeOnly=true to get only active rates
 */
export async function GET(req: NextRequest) {
  const activeOnly = req.nextUrl.searchParams.get('activeOnly') === 'true';

  try {
    const whereClause: { isActive?: boolean } = {};

    if (activeOnly) {
      whereClause.isActive = true;
    }

    const affranchissements = await prisma.affranchissement.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        speed: {
          select: { id: true, value: true, label: true },
        },
      },
      orderBy: [
        { pdsMin: 'asc' },
      ],
    });

    return NextResponse.json(affranchissements);
  } catch (error) {
    console.error('Error fetching affranchissements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/print-options/affranchissements
 * Creates a new affranchissement (global)
 * Body: { fullName, name, speedId?, pdsMin, pdsMax, price, isActive? }
 * Requires SUPERADMIN
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { fullName, name, speedId, pdsMin, pdsMax, price, isActive = true } = body;

    if (!fullName || !name || pdsMin === undefined || pdsMax === undefined || price === undefined) {
      return NextResponse.json(
        { error: 'fullName, name, pdsMin, pdsMax and price are required' },
        { status: 400 }
      );
    }

    // Verify speed exists if provided
    if (speedId) {
      const speed = await prisma.affranchissement_speed.findUnique({
        where: { id: parseInt(speedId, 10) },
      });
      if (!speed) {
        return NextResponse.json(
          { error: `Speed with id "${speedId}" not found` },
          { status: 400 }
        );
      }
    }

    const affranchissement = await prisma.affranchissement.create({
      data: {
        fullName,
        name,
        speedId: speedId ? parseInt(speedId, 10) : null,
        pdsMin: parseInt(pdsMin, 10),
        pdsMax: parseInt(pdsMax, 10),
        price: parseFloat(price),
        isActive,
      },
      include: {
        speed: {
          select: { id: true, value: true, label: true },
        },
      },
    });

    return NextResponse.json(affranchissement, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating affranchissement:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An affranchissement with this combination already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
