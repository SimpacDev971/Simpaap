import { MailjetNotConfiguredError, sendMailjetEmail } from '@/lib/mailjet';
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

    const { email, password, name, role, tenantSubdomain } = await req.json();

    // Champs obligatoires
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Utilisateur avec cet email existe déjà' }, { status: 409 });
    }

    // Utiliser le mot de passe fourni ou le mot de passe par défaut
    const defaultPassword = password || 'password';
    // Hachage du mot de passe
    const hashedPassword = await hash(defaultPassword, 10);

    // Création utilisateur
    const userData: any = {
      email,
      password: hashedPassword,
      name: name || '',
      role: role || 'MEMBER',
    };

    // Si tenantSubdomain fourni, trouver le tenant et le connecter
    if (tenantSubdomain) {
      const tenant = await prisma.tenant.findUnique({ where: { subdomain: tenantSubdomain } });
      if (!tenant) {
        return NextResponse.json({ error: 'Tenant non trouvé' }, { status: 404 });
      }
      userData.tenant = { connect: { id: tenant.id } };
    }

    const newUser = await prisma.user.create({ data: userData });

    try {
      const displayName = newUser.name?.length ? newUser.name : 'utilisateur';

      // Construct tenant login URL
      let loginUrl = '';
      if (tenantSubdomain) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const domain = baseUrl.replace(/^https?:\/\//, ''); // Remove protocol
        loginUrl = `https://${tenantSubdomain}.${domain}/login`;
      }

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
          loginUrl ? `Lien de connexion : ${loginUrl}` : '',
          '',
          'Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.',
          '',
          'Si vous ne reconnaissez pas cette invitation, contactez immédiatement votre administrateur.',
          '',
          'À bientôt,',
          'SIMPAC',
        ].join('\n'),
        html: `<p>Bonjour ${displayName},</p>
<p>Votre accès à <strong>Simpaap</strong> est prêt. Vous pouvez maintenant vous connecter avec vos identifiants :</p>
<p><strong>Email :</strong> ${newUser.email}<br/>
<strong>Mot de passe :</strong> <code>password</code></p>
${loginUrl ? `<p><a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Se connecter</a></p>` : ''}
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

    const { id, email, password, name, role, tenantSubdomain } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Empêcher un SUPERADMIN de modifier un autre SUPERADMIN
    if (existingUser.role === 'SUPERADMIN' && existingUser.id !== session.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier un autre SUPERADMIN' }, { status: 403 });
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

    // Mettre à jour le tenant si tenantSubdomain fourni
    if (tenantSubdomain !== undefined) {
      if (tenantSubdomain) {
        const tenant = await prisma.tenant.findUnique({ where: { subdomain: tenantSubdomain } });
        if (!tenant) {
          return NextResponse.json({ error: 'Tenant non trouvé' }, { status: 404 });
        }
        updateData.tenant = { connect: { id: tenant.id } };
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
    if (!session || session.user.role !== 'SUPERADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    console.log(session.user)
    let users = [];
    if (session.user.tenantSlug === 'admin') {
      users = await prisma.user.findMany({
        include: { tenant: true },
        orderBy: { tenantId: 'desc' },
      });
    } else {
      users = await prisma.user.findMany({
        where: session.user.tenantSlug
          ? {
              tenant: {
                is: { subdomain: session.user.tenantSlug },
              },
            }
          : undefined,
        include: { tenant: true },
        orderBy: { tenant: { name: 'asc' } },
      });
    }
    return NextResponse.json(users, { status: 200 });
  } catch (err: any) {
    console.error('Erreur récupération utilisateurs:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
