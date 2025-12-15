// app/api/tenant/list/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Start API TEnant List')
    // Récupère uniquement les subdomains (léger et rapide)
    const tenants = await prisma.tenant.findMany({
      select: {
        subdomain: true,
      },
    });

    // Retourne un tableau de strings
    const subdomains = tenants.map((t: { subdomain: any; }) => t.subdomain);
    console.log(subdomains.join(','))

    return NextResponse.json({
      success: true,
      tenants: subdomains,
      count: subdomains.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error("Error fetching tenants:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch tenants",
        tenants: [] 
      },
      { status: 500 }
    );
  }
}