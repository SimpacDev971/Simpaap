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
        tenant_envelope_type: { include: { envelope_type: true } },
        tenant_postage_type: { include: { postage_type: true } },
        tenant_postage_speed: { include: { postage_speed: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      colors: tenant.tenant_print_color.map(a => a.print_color),
      sides: tenant.tenant_print_side.map(a => a.print_side),
      envelopes: tenant.tenant_envelope_type.map(a => a.envelope_type),
      postageTypes: tenant.tenant_postage_type.map(a => a.postage_type),
      postageSpeeds: tenant.tenant_postage_speed.map(a => a.postage_speed),
    });
  } catch (error) {
    console.error('Error fetching tenant print options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/tenant/[id]/print-options
 * Met à jour les options d'impression assignées au tenant
 * Body: { colorIds?: number[], sideIds?: number[], envelopeIds?: number[], postageTypeIds?: number[], postageSpeedIds?: number[] }
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
    const userTenant = await prisma.tenant.findUnique({
      where: { subdomain: session.user.tenantSlug },
    });
    if (!userTenant || userTenant.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const body = await request.json();
    const { colorIds, sideIds, envelopeIds, postageTypeIds, postageSpeedIds } = body;

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

      // Update envelopes if provided
      if (envelopeIds !== undefined) {
        await tx.tenant_envelope_type.deleteMany({ where: { tenantId: id } });
        if (envelopeIds.length > 0) {
          await tx.tenant_envelope_type.createMany({
            data: envelopeIds.map((envelopeTypeId: number) => ({ tenantId: id, envelopeTypeId })),
          });
        }
      }

      // Update postage types if provided
      if (postageTypeIds !== undefined) {
        await tx.tenant_postage_type.deleteMany({ where: { tenantId: id } });
        if (postageTypeIds.length > 0) {
          await tx.tenant_postage_type.createMany({
            data: postageTypeIds.map((postageTypeId: number) => ({ tenantId: id, postageTypeId })),
          });
        }
      }

      // Update postage speeds if provided
      if (postageSpeedIds !== undefined) {
        await tx.tenant_postage_speed.deleteMany({ where: { tenantId: id } });
        if (postageSpeedIds.length > 0) {
          await tx.tenant_postage_speed.createMany({
            data: postageSpeedIds.map((postageSpeedId: number) => ({ tenantId: id, postageSpeedId })),
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
