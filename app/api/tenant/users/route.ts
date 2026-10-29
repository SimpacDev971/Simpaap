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
import { checkRoleAssignment } from '@/lib/auth/apiGuards';

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

    const roleError = checkRoleAssignment(session!, data.role || 'MEMBER', tenant.subdomain);
    if (roleError) {
      return NextResponse.json({ error: roleError }, { status: 403 });
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

    // Generate invitation token — user sets their own password, never transmitted in clear
    const crypto = await import('crypto');
    await prisma.passwordResetToken.deleteMany({ where: { email: newUser.email } });
    const inviteToken = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: { email: newUser.email, token: inviteToken, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
    });

    try {
      const displayName = newUser.name?.length ? escapeHtml(newUser.name) : 'utilisateur';
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const domain = baseUrl.replace(/^https?:\/\//, '');
      const setupUrl = `https://${tenant.subdomain}.${domain}/reset-password?token=${inviteToken}`;

      await sendMailjetEmail({
        to: { email: newUser.email, name: newUser.name ?? undefined },
        subject: 'Bienvenue sur Simpaap — Activez votre compte',
        text: [
          `Bonjour ${displayName},`,
          '',
          'Votre compte Simpaap a été créé.',
          `Identifiant : ${newUser.email}`,
          '',
          'Cliquez sur le lien ci-dessous pour définir votre mot de passe :',
          '',
          setupUrl,
          '',
          'Ce lien est valide pendant 72 heures.',
          '',
          'Si vous ne reconnaissez pas cette invitation, ignorez cet email.',
          '',
          'À bientôt,',
          'Simpaap',
        ].join('\n'),
        html: `<p>Bonjour ${displayName},</p>
<p>Votre compte <strong>Simpaap</strong> a été créé.<br/>Identifiant : <strong>${escapeHtml(newUser.email)}</strong></p>
<p style="margin: 24px 0;">
  <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px;">
    Définir mon mot de passe
  </a>
</p>
<p style="color: #666; font-size: 14px;">Ce lien est valide pendant <strong>72 heures</strong>.</p>
<p style="color: #666; font-size: 14px;">Si vous ne reconnaissez pas cette invitation, ignorez cet email.</p>
<p>À bientôt,<br/>Simpaap</p>`,
        customId: 'user-invited',
      });
    } catch (error) {
      if (error instanceof MailjetNotConfiguredError) {
        if (process.env.NODE_ENV !== 'production') {
          return NextResponse.json({ ...newUser }, { status: 201 });
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

  // Verify admin belongs to this tenant (except SUPERADMIN)
  if (session?.user.role === 'ADMIN' && session.user.tenantSlug !== tenant.subdomain) {
    return NextResponse.json({ error: 'Forbidden: You can only update users in your own tenant' }, { status: 403 });
  }

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

    // Changement de rôle : SUPERADMIN uniquement sur le tenant admin, par un SUPERADMIN du tenant admin
    if (data.role && data.role !== oldUser.role) {
      const roleError = checkRoleAssignment(session!, data.role, tenant.subdomain);
      if (roleError) {
        return NextResponse.json({ error: roleError }, { status: 403 });
      }
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

  // Verify admin belongs to this tenant (except SUPERADMIN)
  if (session?.user.role === 'ADMIN' && session.user.tenantSlug !== tenant.subdomain) {
    return NextResponse.json({ error: 'Forbidden: You can only delete users in your own tenant' }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.tenantId !== tenant.id)
      return NextResponse.json({ error: 'User not in tenant' }, { status: 400 });
    // Ne pas permettre la suppression d'un SUPERADMIN
    if (user.role === 'SUPERADMIN')
      return NextResponse.json({ error: 'Impossible de supprimer un SUPERADMIN' }, { status: 403 });
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 400 });
  }
}
