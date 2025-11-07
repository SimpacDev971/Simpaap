import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, password, name, role, tenantId } = await req.json();

    // Champs obligatoires
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Utilisateur avec cet email existe déjà' }, { status: 409 });
    }

    // Hachage du mot de passe
    const hashedPassword = await hash(password, 10);

    // Création utilisateur
    const userData: any = {
      email,
      password: hashedPassword,
      name: name || '',
      role: role || 'MEMBER',
    };

    // Si tenantId fourni, connecter le tenant
    if (tenantId) {
      userData.tenant = { connect: { id: tenantId } };
    }

    const newUser = await prisma.user.create({ data: userData });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    console.error('Erreur création utilisateur:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, email, password, name, role, tenantId } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Vérifier si l'email est changé et s'il existe déjà
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
      }
    }

    const updateData: any = {
      email: email || existingUser.email,
      name: name !== undefined ? name : existingUser.name,
      role: role || existingUser.role,
    };

    // Mettre à jour le mot de passe seulement s'il est fourni
    if (password && password.length > 0) {
      updateData.password = await hash(password, 10);
    }

    // Mettre à jour le tenant si fourni
    if (tenantId !== undefined) {
      if (tenantId) {
        updateData.tenant = { connect: { id: tenantId } };
      } else {
        updateData.tenantId = null;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { tenant: true },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (err: any) {
    console.error('Erreur mise à jour utilisateur:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Ne pas permettre la suppression d'un SUPERADMIN
    if (user.role === 'SUPERADMIN') {
      return NextResponse.json({ error: 'Impossible de supprimer un SUPERADMIN' }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: 'Utilisateur supprimé avec succès' }, { status: 200 });
  } catch (err: any) {
    console.error('Erreur suppression utilisateur:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: { tenant: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (err: any) {
    console.error('Erreur récupération utilisateurs:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
