import { invalidatePrintOptionsCache } from '@/lib/cache';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/tenant/[id]/print-options
 * Récupère toutes les options d'impression assignées au tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        tenant_print_color: { include: { print_color: true } },
        tenant_print_side: { include: { print_side: true } },
        tenant_enveloppe: { include: { enveloppe: true } },
        tenant_speed: { include: { speed: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      colors: tenant.tenant_print_color.map(a => a.print_color),
      sides: tenant.tenant_print_side.map(a => a.print_side),
      enveloppes: tenant.tenant_enveloppe.map(a => a.enveloppe),
      speeds: tenant.tenant_speed.map(a => a.speed),
    });
  } catch (error) {
    console.error('Error fetching tenant print options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/tenant/[id]/print-options
 * Met à jour les options d'impression assignées au tenant
 * Body: { colorIds?: number[], sideIds?: number[], enveloppeIds?: number[], speedIds?: number[] }
 * Requires SUPERADMIN or ADMIN of the tenant
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // SUPERADMIN can update any tenant, ADMIN can only update their own
  if (session.user.role !== 'SUPERADMIN') {
    if (!session.user.tenantSlug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const userTenant = await prisma.tenant.findUnique({
      where: { subdomain: session.user.tenantSlug },
    });
    if (!userTenant || userTenant.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const body = await request.json();
    const { colorIds, sideIds, enveloppeIds, speedIds } = body;

    // Find tenant to get subdomain for cache invalidation
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { subdomain: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Use transaction to update all assignments atomically
    await prisma.$transaction(async (tx) => {
      // Update colors if provided
      if (colorIds !== undefined) {
        await tx.tenant_print_color.deleteMany({ where: { tenantId: id } });
        if (colorIds.length > 0) {
          await tx.tenant_print_color.createMany({
            data: colorIds.map((printColorId: number) => ({ tenantId: id, printColorId })),
          });
        }
      }

      // Update sides if provided
      if (sideIds !== undefined) {
        await tx.tenant_print_side.deleteMany({ where: { tenantId: id } });
        if (sideIds.length > 0) {
          await tx.tenant_print_side.createMany({
            data: sideIds.map((printSideId: number) => ({ tenantId: id, printSideId })),
          });
        }
      }

      // Update enveloppes if provided
      if (enveloppeIds !== undefined) {
        await tx.tenant_enveloppe.deleteMany({ where: { tenantId: id } });
        if (enveloppeIds.length > 0) {
          await tx.tenant_enveloppe.createMany({
            data: enveloppeIds.map((enveloppeId: number) => ({ tenantId: id, enveloppeId })),
          });
        }
      }

      // Update speeds if provided
      if (speedIds !== undefined) {
        await tx.tenant_speed.deleteMany({ where: { tenantId: id } });
        if (speedIds.length > 0) {
          await tx.tenant_speed.createMany({
            data: speedIds.map((speedId: number) => ({ tenantId: id, speedId })),
          });
        }
      }
    });

    // Invalidate cache
    invalidatePrintOptionsCache(tenant.subdomain);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tenant print options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
