import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export interface ApplicationWithCategory {
  id: number;
  nom: string;
  description: string | null;
  url: string | null;
  categorieid: number;
  categorie: {
    id: number;
    nom: string;
    description: string | null;
  };
}

/**
 * GET /api/applications
 * Récupère toutes les applications disponibles avec leurs catégories
 */
export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      include: {
        categorie: true,
      },
      orderBy: [
        { categorie: { nom: "asc" } },
        { nom: "asc" },
      ],
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
