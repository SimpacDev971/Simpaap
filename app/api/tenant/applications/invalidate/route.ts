import {
  invalidateAllApplicationsCache,
  invalidateTenantApplicationsCache,
} from '@/lib/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tenant/applications/invalidate
 * Invalide le cache des applications
 * Body: { subdomain?: string } - Si subdomain fourni, invalide uniquement ce tenant
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { subdomain } = body;

    if (subdomain) {
      invalidateTenantApplicationsCache(subdomain);
      return NextResponse.json({
        success: true,
        message: `Cache invalidated for tenant: ${subdomain}`,
      });
    }

    // Invalider tout le cache
    invalidateAllApplicationsCache();
    return NextResponse.json({
      success: true,
      message: 'All application caches invalidated',
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
