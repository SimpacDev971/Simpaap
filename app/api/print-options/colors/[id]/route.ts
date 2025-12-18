import { invalidatePrintOptionsCache } from '@/lib/cache';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * PUT /api/print-options/colors/[id]
 * Met à jour une couleur d'impression (global)
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
  const colorId = parseInt(id, 10);

  if (isNaN(colorId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { value, label, isActive, sortOrder } = body;

    // Find existing color
    const existingColor = await prisma.print_color.findUnique({
      where: { id: colorId },
      include: {
        tenant_print_color: {
          include: { tenant: { select: { subdomain: true } } }
        }
      },
    });

    if (!existingColor) {
      return NextResponse.json({ error: 'Color not found' }, { status: 404 });
    }

    const updatedColor = await prisma.print_color.update({
      where: { id: colorId },
      data: {
        ...(value !== undefined && { value }),
        ...(label !== undefined && { label }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    // Invalidate cache for all tenants that have this color assigned
    existingColor.tenant_print_color.forEach(assignment => {
      invalidatePrintOptionsCache(assignment.tenant.subdomain);
    });

    return NextResponse.json(updatedColor);
  } catch (error: unknown) {
    console.error('Error updating print color:', error);
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

/**
 * DELETE /api/print-options/colors/[id]
 * Supprime une couleur d'impression (global)
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
  const colorId = parseInt(id, 10);

  if (isNaN(colorId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    // Find existing color to get assigned tenants for cache invalidation
    const existingColor = await prisma.print_color.findUnique({
      where: { id: colorId },
      include: {
        tenant_print_color: {
          include: { tenant: { select: { subdomain: true } } }
        }
      },
    });

    if (!existingColor) {
      return NextResponse.json({ error: 'Color not found' }, { status: 404 });
    }

    // Store subdomains before deletion (cascade will remove assignments)
    const subdomains = existingColor.tenant_print_color.map(a => a.tenant.subdomain);

    await prisma.print_color.delete({
      where: { id: colorId },
    });

    // Invalidate cache for all affected tenants
    subdomains.forEach(subdomain => {
      invalidatePrintOptionsCache(subdomain);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting print color:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
