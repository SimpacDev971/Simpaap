import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * PUT /api/print-options/affranchissements/[id]
 * Updates an affranchissement (global)
 * Body: { fullName?, name?, speedId?, pdsMin?, pdsMax?, price?, isActive? }
 * Requires SUPERADMIN
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const affranchissementId = parseInt(id, 10);

  if (isNaN(affranchissementId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { fullName, name, speedId, pdsMin, pdsMax, price, isActive } = body;

    const existingAffranchissement = await prisma.affranchissement.findUnique({
      where: { id: affranchissementId },
    });

    if (!existingAffranchissement) {
      return NextResponse.json({ error: 'Affranchissement not found' }, { status: 404 });
    }

    // If speedId is being changed and provided, verify the new speed exists
    if (speedId !== undefined && speedId !== null && speedId !== '') {
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

    const updatedAffranchissement = await prisma.affranchissement.update({
      where: { id: affranchissementId },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(name !== undefined && { name }),
        ...(speedId !== undefined && { speedId: speedId ? parseInt(speedId, 10) : null }),
        ...(pdsMin !== undefined && { pdsMin: parseInt(pdsMin, 10) }),
        ...(pdsMax !== undefined && { pdsMax: parseInt(pdsMax, 10) }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        speed: {
          select: { id: true, value: true, label: true },
        },
      },
    });

    return NextResponse.json(updatedAffranchissement);
  } catch (error: unknown) {
    console.error('Error updating affranchissement:', error);
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

/**
 * DELETE /api/print-options/affranchissements/[id]
 * Deletes an affranchissement (global)
 * Requires SUPERADMIN
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const affranchissementId = parseInt(id, 10);

  if (isNaN(affranchissementId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const existingAffranchissement = await prisma.affranchissement.findUnique({
      where: { id: affranchissementId },
    });

    if (!existingAffranchissement) {
      return NextResponse.json({ error: 'Affranchissement not found' }, { status: 404 });
    }

    await prisma.affranchissement.delete({
      where: { id: affranchissementId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting affranchissement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
