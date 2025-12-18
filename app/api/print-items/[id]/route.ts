import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/print-items/[id]
 * Récupère un item d'impression spécifique
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const printItem = await prisma.print_item.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        tenant: { select: { id: true, name: true, subdomain: true } },
      },
    });

    if (!printItem) {
      return NextResponse.json({ error: 'Print item not found' }, { status: 404 });
    }

    // Check access: SUPERADMIN can see all, others only their tenant
    if (
      session.user.role !== 'SUPERADMIN' &&
      session.user.tenantSlug !== printItem.tenant.subdomain
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(printItem);
  } catch (error) {
    console.error('Error fetching print item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/print-items/[id]
 * Met à jour le statut d'un item d'impression
 * Body: { status: string, sendAt?: Date }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { status, sendAt } = body;

    const existingItem = await prisma.print_item.findUnique({
      where: { id },
      include: { tenant: { select: { subdomain: true } } },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Print item not found' }, { status: 404 });
    }

    // Check access: SUPERADMIN can update all, others only their tenant
    if (
      session.user.role !== 'SUPERADMIN' &&
      session.user.tenantSlug !== existingItem.tenant.subdomain
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedItem = await prisma.print_item.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(sendAt !== undefined && { sendAt: new Date(sendAt) }),
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating print item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
