import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * PUT /api/print-options/speeds/[id]
 * Updates an affranchissement speed (global)
 * Body: { value?, label?, isActive?, sortOrder? }
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
  const speedId = parseInt(id, 10);

  if (isNaN(speedId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { value, label, isActive, sortOrder } = body;

    const existingSpeed = await prisma.affranchissement_speed.findUnique({
      where: { id: speedId },
    });

    if (!existingSpeed) {
      return NextResponse.json({ error: 'Speed not found' }, { status: 404 });
    }

    const updatedSpeed = await prisma.affranchissement_speed.update({
      where: { id: speedId },
      data: {
        ...(value !== undefined && { value }),
        ...(label !== undefined && { label }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder, 10) }),
      },
    });

    return NextResponse.json(updatedSpeed);
  } catch (error: unknown) {
    console.error('Error updating speed:', error);
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

/**
 * DELETE /api/print-options/speeds/[id]
 * Deletes an affranchissement speed (global)
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
  const speedId = parseInt(id, 10);

  if (isNaN(speedId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const existingSpeed = await prisma.affranchissement_speed.findUnique({
      where: { id: speedId },
    });

    if (!existingSpeed) {
      return NextResponse.json({ error: 'Speed not found' }, { status: 404 });
    }

    // Check if any affranchissements are using this speed
    const linkedAffranchissements = await prisma.affranchissement.count({
      where: { speedId: speedId },
    });

    if (linkedAffranchissements > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${linkedAffranchissements} affranchissement(s) are using this speed` },
        { status: 400 }
      );
    }

    await prisma.affranchissement_speed.delete({
      where: { id: speedId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting speed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
