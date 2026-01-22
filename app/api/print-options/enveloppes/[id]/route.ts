import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { invalidateAllPrintOptionsCache } from '@/lib/cache';

/**
 * PUT /api/print-options/enveloppes/[id]
 * Updates an envelope (global)
 * Body: { fullName?, taille?, pdsMax?, poids?, addrX?, addrY?, addrH?, addrL?, isActive? }
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
  const enveloppeId = parseInt(id, 10);

  if (isNaN(enveloppeId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { fullName, taille, pdsMax, poids, addrX, addrY, addrH, addrL, isActive } = body;

    const existingEnveloppe = await prisma.enveloppe.findUnique({
      where: { id: enveloppeId },
    });

    if (!existingEnveloppe) {
      return NextResponse.json({ error: 'Envelope not found' }, { status: 404 });
    }

    const updatedEnveloppe = await prisma.enveloppe.update({
      where: { id: enveloppeId },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(taille !== undefined && { taille }),
        ...(pdsMax !== undefined && { pdsMax: parseInt(pdsMax, 10) }),
        ...(poids !== undefined && { poids: parseInt(poids, 10) }),
        ...(addrX !== undefined && { addrX: parseFloat(addrX) }),
        ...(addrY !== undefined && { addrY: parseFloat(addrY) }),
        ...(addrH !== undefined && { addrH: parseFloat(addrH) }),
        ...(addrL !== undefined && { addrL: parseFloat(addrL) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Invalidate print options cache (envelopes are global, affect all tenants)
    invalidateAllPrintOptionsCache();

    return NextResponse.json(updatedEnveloppe);
  } catch (error: unknown) {
    console.error('Error updating enveloppe:', error);
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

/**
 * DELETE /api/print-options/enveloppes/[id]
 * Deletes an envelope (global)
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
  const enveloppeId = parseInt(id, 10);

  if (isNaN(enveloppeId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const existingEnveloppe = await prisma.enveloppe.findUnique({
      where: { id: enveloppeId },
    });

    if (!existingEnveloppe) {
      return NextResponse.json({ error: 'Envelope not found' }, { status: 404 });
    }

    await prisma.enveloppe.delete({
      where: { id: enveloppeId },
    });

    // Invalidate print options cache (envelopes are global, affect all tenants)
    invalidateAllPrintOptionsCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting enveloppe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
