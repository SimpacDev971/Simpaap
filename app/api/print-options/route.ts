import {
  CachedPrintOptions,
  getPrintOptionsFromCache,
  setPrintOptionsCache,
} from '@/lib/cache';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/print-options?subdomain=xxx
 * Récupère toutes les options d'impression assignées à un tenant
 * Utilise le cache LRU pour optimiser les performances
 */
export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get('subdomain');

  if (!subdomain) {
    return NextResponse.json(
      { error: 'Subdomain parameter is required' },
      { status: 400 }
    );
  }

  try {
    // 1. Check cache first
    const cached = getPrintOptionsFromCache(subdomain);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 2. Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // 3. Query all assigned print options for this tenant via join tables
    const [colors, sides] = await Promise.all([
      prisma.tenant_print_color.findMany({
        where: { tenantId: tenant.id },
        include: { print_color: true },
        orderBy: { print_color: { sortOrder: 'asc' } },
      }).then(assignments =>
        assignments
          .map(a => a.print_color)
          .filter(c => c.isActive)
          .map(({ id, value, label, isActive, sortOrder }) => ({ id, value, label, isActive, sortOrder }))
      ),
      prisma.tenant_print_side.findMany({
        where: { tenantId: tenant.id },
        include: { print_side: true },
        orderBy: { print_side: { sortOrder: 'asc' } },
      }).then(assignments =>
        assignments
          .map(a => a.print_side)
          .filter(s => s.isActive)
          .map(({ id, value, label, isActive, sortOrder }) => ({ id, value, label, isActive, sortOrder }))
      ),
    ]);

    const result: CachedPrintOptions = {
      colors,
      sides,
    };

    // 4. Cache the result
    setPrintOptionsCache(subdomain, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching print options:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
