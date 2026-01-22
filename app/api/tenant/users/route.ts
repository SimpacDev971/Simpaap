import prisma from '@/lib/prisma';
import { getServerSession, Session } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';
import { MailjetNotConfiguredError, sendMailjetEmail } from '@/lib/mailjet';

function isAdmin(session: Session | null) {
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
  if (session?.user.role === 'ADMIN' && session.user.tenantSlug !== tenant.subdomain) {
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

    if (!data.email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà' }, { status: 409 });
    }

    // Utiliser le mot de passe fourni ou le mot de passe par défaut
    const defaultPassword = data.password || 'password';
    // Hacher le mot de passe
    const hashedPassword = await hash(defaultPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name || '',
        role: data.role || 'MEMBER',
        tenantId: tenant.id,
      },
    });

    // Send invitation email
    try {
      const displayName = newUser.name?.length ? newUser.name : 'utilisateur';

      // Construct tenant login URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const domain = baseUrl.replace(/^https?:\/\//, ''); // Remove protocol
      const loginUrl = `https://${tenant.subdomain}.${domain}/login`;

      await sendMailjetEmail({
        to: { email: newUser.email, name: newUser.name ?? undefined },
        subject: 'Bienvenue sur Simpaap',
        text: [
          `Bonjour ${displayName},`,
          '',
          "Votre espace Simpaap est prêt. Vous pouvez maintenant vous connecter avec vos identifiants :",
          '',
          `Email : ${newUser.email}`,
          `Mot de passe : password`,
          '',
          `Lien de connexion : ${loginUrl}`,
          '',
          'Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.',
          '',
          'Si vous ne reconnaissez pas cette invitation, contactez immédiatement votre administrateur.',
          '',
          'À bientôt,',
          'L'équipe Simpaap',
        ].join('\n'),
        html: `<p>Bonjour ${displayName},</p>
<p>Votre accès à <strong>Simpaap</strong> est prêt. Vous pouvez maintenant vous connecter avec vos identifiants :</p>
<p><strong>Email :</strong> ${newUser.email}<br/>
<strong>Mot de passe :</strong> <code>password</code></p>
<p><a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Se connecter</a></p>
<p style="color: #666; font-size: 14px;">Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.</p>
<p>Si vous ne reconnaissez pas cette invitation, contactez immédiatement votre administrateur.</p>
<p>À bientôt,<br/>L'équipe Simpaap</p>`,
        customId: 'user-created',
      });
    } catch (error) {
      if (error instanceof MailjetNotConfiguredError) {
        console.warn('Mailjet non configuré — email de bienvenue non envoyé.');
      } else {
        console.error('Erreur envoi email de bienvenue Mailjet:', error);
      }
    }

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

    // Empêcher un SUPERADMIN de modifier un autre SUPERADMIN
    if (oldUser.role === 'SUPERADMIN' && oldUser.id !== session?.user?.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier un autre SUPERADMIN' }, { status: 403 });
    }
    
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 400 });
  }
}
