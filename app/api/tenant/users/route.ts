import prisma from '@/lib/prisma';
import {
  generateSecurePassword,
  isValidEmail,
  checkRateLimit,
  RATE_LIMITS,
  escapeHtml,
  validatePassword
} from '@/lib/security';
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

  // Rate limiting
  const rateLimit = checkRateLimit(`create-user:${session?.user.id}`, RATE_LIMITS.createUser.limit, RATE_LIMITS.createUser.windowMs);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 });
  }

  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 });

  // Verify admin belongs to this tenant (except SUPERADMIN)
  if (session?.user.role === 'ADMIN' && session.user.tenantSlug !== tenant.subdomain) {
    return NextResponse.json({ error: 'Forbidden: You can only create users in your own tenant' }, { status: 403 });
  }

  try {
    const { hash } = await import('bcryptjs');
    const data = await req.json();

    if (!data.email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Validate email format
    if (!isValidEmail(data.email)) {
      return NextResponse.json({ error: 'Format d\'email invalide' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà' }, { status: 409 });
    }

    // Generate secure password or validate provided one
    let finalPassword: string;
    if (data.password) {
      const validation = validatePassword(data.password);
      if (!validation.isValid) {
        return NextResponse.json({ error: validation.errors.join('. ') }, { status: 400 });
      }
      finalPassword = data.password;
    } else {
      finalPassword = generateSecurePassword(16);
    }

    const hashedPassword = await hash(finalPassword, 12);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name || '',
        role: data.role || 'MEMBER',
        tenantId: tenant.id,
      },
    });

    try {
      const displayName = newUser.name?.length ? escapeHtml(newUser.name) : 'utilisateur';
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const domain = baseUrl.replace(/^https?:\/\//, '');
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
          `Mot de passe : ${finalPassword}`,
          '',
          `Lien de connexion : ${loginUrl}`,
          '',
          'IMPORTANT : Changez votre mot de passe dès votre première connexion.',
          '',
          'Si vous ne reconnaissez pas cette invitation, contactez immédiatement votre administrateur.',
          '',
          'À bientôt,',
          'SIMPAC',
        ].join('\n'),
        html: `<p>Bonjour ${displayName},</p>
<p>Votre accès à <strong>Simpaap</strong> est prêt.</p>
<div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
  <p><strong>Email :</strong> ${escapeHtml(newUser.email)}</p>
  <p><strong>Mot de passe :</strong> <code style="background: #e0e0e0; padding: 2px 6px;">${escapeHtml(finalPassword)}</code></p>
</div>
<p><a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Se connecter</a></p>
<p style="color: #e74c3c; font-weight: bold;">IMPORTANT : Changez votre mot de passe dès votre première connexion.</p>
<p>Si vous ne reconnaissez pas cette invitation, contactez immédiatement votre administrateur.</p>
<p>À bientôt,<br/>SIMPAC</p>`,
        customId: 'user-created',
      });
    } catch (error) {
      if (error instanceof MailjetNotConfiguredError) {
        if (process.env.NODE_ENV !== 'production') {
          return NextResponse.json({ ...newUser, tempPassword: finalPassword }, { status: 201 });
        }
      }
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
