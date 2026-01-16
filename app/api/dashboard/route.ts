import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/dashboard
 * Returns dashboard statistics based on user role:
 * - SUPERADMIN: Can see all tenants' data
 * - ADMIN: Can see all users' data within their tenant
 * - MEMBER: Can see only their own data
 *
 * Query params:
 * - tenantId: Filter by tenant (SUPERADMIN only)
 * - userId: Filter by user (ADMIN/SUPERADMIN)
 * - year: Filter by year (default: current year)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const filterTenantId = searchParams.get('tenantId');
  const filterUserId = searchParams.get('userId');
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

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

    // Build where clause based on role
    let whereClause: any = {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    };

    // Role-based filtering
    if (userRole === 'SUPERADMIN') {
      // SUPERADMIN can filter by any tenant
      if (filterTenantId) {
        whereClause.tenantId = filterTenantId;
      }
      if (filterUserId) {
        whereClause.userId = filterUserId;
      }
    } else if (userRole === 'ADMIN') {
      // ADMIN can only see their tenant's data
      whereClause.tenantId = userTenant.id;
      if (filterUserId) {
        whereClause.userId = filterUserId;
      }
    } else {
      // MEMBER can only see their own data
      whereClause.tenantId = userTenant.id;
      whereClause.userId = session.user.id;
    }

    // Fetch print items
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

    // Calculate monthly statistics
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace(/^./, (c) => c.toUpperCase()),
      totalSendings: 0,
      totalRecipients: 0,
      totalPages: 0,
      totalCost: 0,
    }));

    printItems.forEach((item) => {
      const month = new Date(item.createdAt).getMonth();
      monthlyStats[month].totalSendings += 1;
      monthlyStats[month].totalRecipients += item.totalRecipients || 0;
      monthlyStats[month].totalPages += item.totalPages || 0;
      monthlyStats[month].totalCost += Number(item.totalCost) || 0;
    });

    // Calculate summary stats
    const summary = {
      totalSendings: printItems.length,
      totalRecipients: printItems.reduce((sum, item) => sum + (item.totalRecipients || 0), 0),
      totalPages: printItems.reduce((sum, item) => sum + (item.totalPages || 0), 0),
      totalCost: printItems.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0),
    };

    // Get print option breakdown from rawData
    const printOptionStats = {
      colors: {} as Record<string, number>,
      sides: {} as Record<string, number>,
      envelopes: {} as Record<string, number>,
      speeds: {} as Record<string, number>,
    };

    printItems.forEach((item) => {
      const rawData = item.rawData as any;
      if (rawData?.productionOptions) {
        const opts = rawData.productionOptions;

        // Color stats
        if (opts.print?.color?.label) {
          const colorLabel = opts.print.color.label;
          printOptionStats.colors[colorLabel] = (printOptionStats.colors[colorLabel] || 0) + 1;
        }

        // Side stats
        if (opts.print?.side?.label) {
          const sideLabel = opts.print.side.label;
          printOptionStats.sides[sideLabel] = (printOptionStats.sides[sideLabel] || 0) + 1;
        }

        // Envelope stats
        if (opts.finishing?.envelope?.fullName) {
          const envLabel = opts.finishing.envelope.fullName;
          printOptionStats.envelopes[envLabel] = (printOptionStats.envelopes[envLabel] || 0) + 1;
        }

        // Speed stats
        if (opts.postage?.speed?.label) {
          const speedLabel = opts.postage.speed.label;
          printOptionStats.speeds[speedLabel] = (printOptionStats.speeds[speedLabel] || 0) + 1;
        }
      }
    });

    // Get available tenants for SUPERADMIN filter
    let availableTenants: { id: string; name: string; subdomain: string }[] = [];
    if (userRole === 'SUPERADMIN') {
      availableTenants = await prisma.tenant.findMany({
        select: { id: true, name: true, subdomain: true },
        orderBy: { name: 'asc' },
      });
    }

    // Get available users for ADMIN/SUPERADMIN filter
    let availableUsers: { id: string; name: string | null; email: string }[] = [];
    if (userRole === 'SUPERADMIN' || userRole === 'ADMIN') {
      const userWhereClause: any = {};
      if (userRole === 'ADMIN') {
        userWhereClause.tenantId = userTenant.id;
      } else if (filterTenantId) {
        userWhereClause.tenantId = filterTenantId;
      }

      availableUsers = await prisma.user.findMany({
        where: userWhereClause,
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({
      summary,
      monthlyStats,
      printOptionStats,
      recentItems: printItems.slice(0, 20).map((item) => ({
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
        rawData: item.rawData,
      })),
      filters: {
        availableTenants,
        availableUsers,
        currentYear: year,
        userRole,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
