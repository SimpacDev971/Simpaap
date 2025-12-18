import {
  CachedTenantApplications,
  getTenantApplicationsFromCache,
  setTenantApplicationsCache,
  invalidateTenantApplicationsCache,
} from '@/lib/cache';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/tenant/applications?subdomain=xxx
 * Récupère les applications et catégories accessibles pour un tenant
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
    // 1️⃣ Check cache first
    const cached = getTenantApplicationsFromCache(subdomain);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 2️⃣ Query database
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        tenant_application: {
          include: {
            Application: {
              include: {
                categorie: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // 3️⃣ Transform data
    const applications = tenant.tenant_application.map((ta) => ({
      id: ta.Application.id,
      nom: ta.Application.nom,
      description: ta.Application.description,
      url: ta.Application.url,
      categorieid: ta.Application.categorieid,
    }));

    // Extraire les catégories uniques
    const categoriesMap = new Map<number, { id: number; nom: string; description: string | null }>();
    tenant.tenant_application.forEach((ta) => {
      const cat = ta.Application.categorie;
      if (!categoriesMap.has(cat.id)) {
        categoriesMap.set(cat.id, {
          id: cat.id,
          nom: cat.nom,
          description: cat.description,
        });
      }
    });
    const categories = Array.from(categoriesMap.values());

    // Grouper par catégorie
    const byCategory: Record<number, typeof applications> = {};
    applications.forEach((app) => {
      if (!byCategory[app.categorieid]) {
        byCategory[app.categorieid] = [];
      }
      byCategory[app.categorieid].push(app);
    });

    const result: CachedTenantApplications = {
      categories,
      applications,
      byCategory,
    };

    // 4️⃣ Cache the result
    setTenantApplicationsCache(subdomain, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tenant applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenant/applications
 * Met à jour les applications accessibles pour un tenant
 * Body: { tenantId: string, applicationIds: number[] }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, applicationIds } = body as {
      tenantId: string;
      applicationIds: number[];
    };

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(applicationIds)) {
      return NextResponse.json(
        { error: 'applicationIds must be an array' },
        { status: 400 }
      );
    }

    // Vérifier que le tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Utiliser une transaction pour supprimer et recréer les associations
    await prisma.$transaction(async (tx) => {
      // Supprimer toutes les associations existantes
      await tx.tenant_application.deleteMany({
        where: { tenantid: tenantId },
      });

      // Créer les nouvelles associations
      if (applicationIds.length > 0) {
        await tx.tenant_application.createMany({
          data: applicationIds.map((appId) => ({
            tenantid: tenantId,
            applicationid: appId,
          })),
        });
      }
    });

    // Invalider le cache pour ce tenant
    invalidateTenantApplicationsCache(tenant.subdomain);

    // Récupérer les applications mises à jour
    const updatedTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        tenant_application: {
          include: {
            Application: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      applications: updatedTenant?.tenant_application.map((ta) => ta.Application) || [],
    });
  } catch (error) {
    console.error('Error updating tenant applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
