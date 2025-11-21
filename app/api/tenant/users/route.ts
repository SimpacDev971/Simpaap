import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';

function isAdmin(session) {
  return session && (session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN');
}

async function getTenantFromRequest(req: NextRequest) {
  const url = new URL(req.url);
  const subdomain = url.searchParams.get('subdomain');
  if (!subdomain) return null;
  const tenant = await prisma.tenant.findUnique({ where: { subdomain } });
  return tenant;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 });
  
  // Vérifier que l'admin appartient bien à ce tenant (sauf SUPERADMIN)
  if (session.user.role === 'ADMIN' && session.user.tenantSlug !== tenant.subdomain) {
    return NextResponse.json({ error: 'Forbidden: You can only access your own tenant' }, { status: 403 });
  }
  
  const users = await prisma.user.findMany({ where: { tenantId: tenant.id } });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 });
  try {
    const { hash } = await import('bcryptjs');
    const data = await req.json();
    
    if (!data.email || !data.password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà' }, { status: 409 });
    }

    // Hacher le mot de passe
    const hashedPassword = await hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name || '',
        role: data.role || 'MEMBER',
        tenantId: tenant.id,
      },
    });
    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 });
  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    // Vérifie que le user appartient bien à ce tenant
    const oldUser = await prisma.user.findUnique({ where: { id: data.id } });
    if (!oldUser || oldUser.tenantId !== tenant.id)
      return NextResponse.json({ error: 'User not in tenant' }, { status: 400 });
    
    const { hash } = await import('bcryptjs');
    const updateData: any = {
      email: data.email || oldUser.email,
      name: data.name !== undefined ? data.name : oldUser.name,
      role: data.role || oldUser.role,
    };

    // Mettre à jour le mot de passe seulement s'il est fourni
    if (data.password && data.password.length > 0) {
      updateData.password = await hash(data.password, 10);
    }

    // Ignorer tenantSubdomain car on utilise déjà le tenant depuis l'URL
    // Le tenant ne peut pas être changé via cette API
    
    const updatedUser = await prisma.user.update({ where: { id: data.id }, data: updateData });
    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.tenantId !== tenant.id)
      return NextResponse.json({ error: 'User not in tenant' }, { status: 400 });
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
