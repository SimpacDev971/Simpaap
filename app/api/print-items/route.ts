import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/print-items?subdomain=xxx&page=1&limit=20
 * Récupère l'historique des items d'impression pour un tenant
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subdomain = req.nextUrl.searchParams.get('subdomain');
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);

  if (!subdomain) {
    return NextResponse.json(
      { error: 'subdomain parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check access: SUPERADMIN can see all, others only their tenant
    if (session.user.role !== 'SUPERADMIN' && session.user.tenantSlug !== subdomain) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get items with pagination
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.print_item.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.print_item.count({
        where: { tenantId: tenant.id },
      }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching print items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/print-items
 * Crée un nouvel item d'impression
 * Body: { rawData: object }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { rawData } = body;

    if (!rawData) {
      return NextResponse.json(
        { error: 'rawData is required' },
        { status: 400 }
      );
    }

    // Get tenant from session
    const tenantSlug = session.user.tenantSlug;

    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'User has no tenant' },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantSlug },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const printItem = await prisma.print_item.create({
      data: {
        numTraitement: BigInt(rawData?.meta?.numTraitement || Date.now()),
        tenantId: tenant.id,
        userId: session.user.id,
        totalPages: rawData?.meta?.totalPages || 0,
        totalRecipients: rawData?.productionOptions?.postage?.totalLetters || 0,
        totalCost: rawData?.productionOptions?.postage?.totalCost || null,
        rawData,
        status: 'pending',
      },
    });

    return NextResponse.json(printItem, { status: 201 });
  } catch (error) {
    console.error('Error creating print item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
