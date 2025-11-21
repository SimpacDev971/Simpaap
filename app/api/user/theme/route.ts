import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { themes } from "../../../../lib/theme";
import { authOptions } from '../../auth/[...nextauth]/route';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { theme } = await req.json();
    
    if (!theme || typeof theme !== 'string') {
      return NextResponse.json({ error: 'Thème invalide' }, { status: 400 });
    }

    // Vérifier que le thème existe dans la liste des thèmes disponibles
    //const validThemes = ['default', 'jardi', 'maina'];

    // Récupérer la liste des noms de thèmes disponibles
    const validThemes = Object.keys(themes);
    if (!validThemes.includes(theme.toLowerCase())) {
      return NextResponse.json({ error: 'Thème non valide' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { theme: theme.toLowerCase() },
    });

    return NextResponse.json({ theme: updatedUser.theme }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur mise à jour thème:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
