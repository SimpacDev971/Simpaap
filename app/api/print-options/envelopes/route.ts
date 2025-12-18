import { invalidatePrintOptionsCache } from '@/lib/cache';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/print-options/envelopes
 * Récupère tous les types d'enveloppes (global)
 * Optional: ?tenantId=xxx to get envelopes assigned to a tenant
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');

  try {
    if (tenantId) {
      const assignments = await prisma.tenant_envelope_type.findMany({
        where: { tenantId },
        include: { envelope_type: true },
        orderBy: { envelope_type: { sortOrder: 'asc' } },
      });
      return NextResponse.json(assignments.map(a => a.envelope_type));
    }

    const envelopes = await prisma.envelope_type.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(envelopes);
  } catch (error) {
    console.error('Error fetching envelopes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/print-options/envelopes
 * Crée un nouveau type d'enveloppe (global)
 * Body: { value, label, description?, isActive?, sortOrder? }
 * Requires SUPERADMIN
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { value, label, description, isActive = true, sortOrder = 0 } = body;

    if (!value || !label) {
      return NextResponse.json({ error: 'value and label are required' }, { status: 400 });
    }

    const envelope = await prisma.envelope_type.create({
      data: { value, label, description, isActive, sortOrder },
    });

    return NextResponse.json(envelope, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating envelope:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'An envelope with this value already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
