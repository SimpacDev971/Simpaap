import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/print-options/affranchissements
 * Retrieves all affranchissements (global)
 * Optional: ?env_taille=xxx to filter by envelope size
 * Optional: ?activeOnly=true to get only active rates
 */
export async function GET(req: NextRequest) {
  const envTaille = req.nextUrl.searchParams.get('env_taille');
  const activeOnly = req.nextUrl.searchParams.get('activeOnly') === 'true';

  try {
    const whereClause: { env_taille?: string; isActive?: boolean } = {};

    if (envTaille) {
      whereClause.env_taille = envTaille;
    }
    if (activeOnly) {
      whereClause.isActive = true;
    }

    const affranchissements = await prisma.affranchissement.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        enveloppe: {
          select: { fullName: true, taille: true },
        },
        speed: {
          select: { id: true, value: true, label: true },
        },
      },
      orderBy: [
        { env_taille: 'asc' },
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
 * Body: { fullName, name, env_taille, pdsMin, pdsMax, price, isActive? }
 * Requires SUPERADMIN
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { fullName, name, env_taille, speedId, pdsMin, pdsMax, price, isActive = true } = body;

    if (!fullName || !name || !env_taille || pdsMin === undefined || pdsMax === undefined || price === undefined) {
      return NextResponse.json(
        { error: 'fullName, name, env_taille, pdsMin, pdsMax and price are required' },
        { status: 400 }
      );
    }

    // Verify the envelope exists
    const enveloppe = await prisma.enveloppe.findUnique({
      where: { taille: env_taille },
    });

    if (!enveloppe) {
      return NextResponse.json(
        { error: `Envelope with taille "${env_taille}" not found` },
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
        env_taille,
        speedId: speedId ? parseInt(speedId, 10) : null,
        pdsMin: parseInt(pdsMin, 10),
        pdsMax: parseInt(pdsMax, 10),
        price: parseFloat(price),
        isActive,
      },
      include: {
        enveloppe: {
          select: { fullName: true, taille: true },
        },
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
