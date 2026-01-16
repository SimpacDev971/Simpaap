import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { invalidateAllPrintOptionsCache } from '@/lib/cache';

/**
 * GET /api/print-options/enveloppes
 * Retrieves all envelopes (global)
 * Optional: ?activeOnly=true to get only active envelopes
 */
export async function GET(req: NextRequest) {
  const activeOnly = req.nextUrl.searchParams.get('activeOnly') === 'true';

  try {
    const enveloppes = await prisma.enveloppe.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { taille: 'asc' },
    });

    return NextResponse.json(enveloppes);
  } catch (error) {
    console.error('Error fetching enveloppes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/print-options/enveloppes
 * Creates a new envelope (global)
 * Body: { fullName, taille, pdsMax, poids, addrX, addrY, addrH, addrL, isActive? }
 * Requires SUPERADMIN
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { fullName, taille, pdsMax, poids, addrX, addrY, addrH, addrL, isActive = true } = body;

    if (!fullName || !taille || pdsMax === undefined) {
      return NextResponse.json(
        { error: 'fullName, taille and pdsMax are required' },
        { status: 400 }
      );
    }

    const enveloppe = await prisma.enveloppe.create({
      data: {
        fullName,
        taille,
        pdsMax: parseInt(pdsMax, 10),
        poids: parseInt(poids, 10) || 5,
        addrX: parseFloat(addrX) || 0,
        addrY: parseFloat(addrY) || 0,
        addrH: parseFloat(addrH) || 0,
        addrL: parseFloat(addrL) || 0,
        isActive,
      },
    });

    // Invalidate print options cache (envelopes are global, affect all tenants)
    invalidateAllPrintOptionsCache();

    return NextResponse.json(enveloppe, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating enveloppe:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An envelope with this taille already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
