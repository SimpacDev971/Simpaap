import { invalidatePrintOptionsCache } from '@/lib/cache';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/print-options/postage-speeds
 * Récupère toutes les vitesses d'envoi (global)
 * Optional: ?tenantId=xxx to get speeds assigned to a tenant
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');

  try {
    if (tenantId) {
      const assignments = await prisma.tenant_postage_speed.findMany({
        where: { tenantId },
        include: { postage_speed: true },
        orderBy: { postage_speed: { sortOrder: 'asc' } },
      });
      return NextResponse.json(assignments.map(a => a.postage_speed));
    }

    const postageSpeeds = await prisma.postage_speed.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(postageSpeeds);
  } catch (error) {
    console.error('Error fetching postage speeds:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/print-options/postage-speeds
 * Crée une nouvelle vitesse d'envoi (global)
 * Body: { value, label, isActive?, sortOrder? }
 * Requires SUPERADMIN
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { value, label, isActive = true, sortOrder = 0 } = body;

    if (!value || !label) {
      return NextResponse.json({ error: 'value and label are required' }, { status: 400 });
    }

    const postageSpeed = await prisma.postage_speed.create({
      data: { value, label, isActive, sortOrder },
    });

    return NextResponse.json(postageSpeed, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating postage speed:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A postage speed with this value already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
