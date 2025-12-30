import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/dashboard/month-details
 * Returns detailed print items for a specific month
 *
 * Query params:
 * - month: Month number (1-12)
 * - year: Year (default: current year)
 * - tenantId: Filter by tenant (SUPERADMIN only)
 * - userId: Filter by user (ADMIN/SUPERADMIN)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const month = parseInt(searchParams.get('month') || '1');
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const filterTenantId = searchParams.get('tenantId');
  const filterUserId = searchParams.get('userId');

  const userRole = session.user.role;
  const userTenantSlug = session.user.tenantSlug;

  if (!userTenantSlug) {
    return NextResponse.json({ error: 'User has no tenant' }, { status: 400 });
  }

  try {
    // Get user's tenant
    const userTenant = await prisma.tenant.findUnique({
      where: { subdomain: userTenantSlug },
    });

    if (!userTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Build where clause based on role
    let whereClause: any = {
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
    };

    // Role-based filtering
    if (userRole === 'SUPERADMIN') {
      if (filterTenantId) {
        whereClause.tenantId = filterTenantId;
      }
      if (filterUserId) {
        whereClause.userId = filterUserId;
      }
    } else if (userRole === 'ADMIN') {
      whereClause.tenantId = userTenant.id;
      if (filterUserId) {
        whereClause.userId = filterUserId;
      }
    } else {
      whereClause.tenantId = userTenant.id;
      whereClause.userId = session.user.id;
    }

    // Fetch print items for the month
    const printItems = await prisma.print_item.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format items with full production options
    const items = printItems.map((item) => {
      const rawData = item.rawData as any;
      return {
        id: item.id,
        numTraitement: item.numTraitement?.toString(),
        createdAt: item.createdAt,
        sendAt: item.sendAt,
        status: item.status,
        totalPages: item.totalPages,
        totalRecipients: item.totalRecipients,
        totalCost: item.totalCost ? Number(item.totalCost) : null,
        user: item.user,
        tenant: item.tenant,
        productionOptions: rawData?.productionOptions || null,
        meta: rawData?.meta || null,
      };
    });

    // Calculate month summary
    const summary = {
      month,
      year,
      monthName: new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      totalSendings: items.length,
      totalRecipients: items.reduce((sum, item) => sum + (item.totalRecipients || 0), 0),
      totalPages: items.reduce((sum, item) => sum + (item.totalPages || 0), 0),
      totalCost: items.reduce((sum, item) => sum + (item.totalCost || 0), 0),
    };

    return NextResponse.json({
      summary,
      items,
    });
  } catch (error) {
    console.error('Month details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
