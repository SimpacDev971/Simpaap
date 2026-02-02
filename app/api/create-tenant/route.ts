// app/api/create-tenant/route.ts
import prisma from '@/lib/prisma'
import {
  generateSecurePassword,
  isValidEmail,
  isValidSubdomain,
  checkRateLimit,
  RATE_LIMITS,
  escapeHtml
} from '@/lib/security'
import { MailjetNotConfiguredError, sendMailjetEmail } from '@/lib/mailjet'
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Rate limiting
    const rateLimit = checkRateLimit(`create-tenant:${session.user.id}`, RATE_LIMITS.createUser.limit, RATE_LIMITS.createUser.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const { name, subdomain, adminEmail } = await request.json()

    if (!name || !subdomain) {
      return NextResponse.json({ error: 'Name and subdomain are required' }, { status: 400 })
    }

    // Validate subdomain format
    if (!isValidSubdomain(subdomain)) {
      return NextResponse.json({ error: 'Format de sous-domaine invalide (lettres minuscules, chiffres et tirets uniquement)' }, { status: 400 })
    }

    if (!adminEmail) {
      return NextResponse.json({ error: 'Admin email is required' }, { status: 400 })
    }

    // Validate email format
    if (!isValidEmail(adminEmail)) {
      return NextResponse.json({ error: 'Format d\'email invalide' }, { status: 400 })
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
    })

    if (existingTenant) {
      return NextResponse.json({ error: 'Subdomain already exists' }, { status: 409 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà' }, { status: 409 })
    }

    // Generate secure random password
    const securePassword = generateSecurePassword(16)
    const hashedPassword = await hash(securePassword, 12)

    const result = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: { name, subdomain: subdomain.toLowerCase() },
      })

      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: `Admin ${name}`,
          role: 'ADMIN',
          tenantId: newTenant.id,
        },
      })

      return { tenant: newTenant, admin, password: securePassword }
    })

    // Send welcome email with secure password
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const domain = baseUrl.replace(/^https?:\/\//, '')
      const loginUrl = `https://${result.tenant.subdomain}.${domain}/login`

      await sendMailjetEmail({
        to: { email: adminEmail, name: `Admin ${name}` },
        subject: 'Votre espace Simpaap est prêt',
        text: [
          `Bonjour,`,
          '',
          `Votre espace Simpaap "${name}" a été créé avec succès.`,
          '',
          `Vos identifiants de connexion :`,
          `Email : ${adminEmail}`,
          `Mot de passe : ${securePassword}`,
          '',
          `Lien de connexion : ${loginUrl}`,
          '',
          'IMPORTANT : Pour des raisons de sécurité, veuillez changer votre mot de passe dès votre première connexion.',
          '',
          'À bientôt,',
          'SIMPAC',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Bienvenue sur Simpaap</h2>
            <p>Votre espace <strong>${escapeHtml(name)}</strong> a été créé avec succès.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Email :</strong> ${escapeHtml(adminEmail)}</p>
              <p><strong>Mot de passe :</strong> <code style="background: #e0e0e0; padding: 2px 6px;">${escapeHtml(securePassword)}</code></p>
            </div>
            <p><a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px;">Se connecter</a></p>
            <p style="color: #e74c3c; font-weight: bold;">IMPORTANT : Veuillez changer votre mot de passe dès votre première connexion.</p>
            <p style="color: #666; margin-top: 30px;">À bientôt,<br/>SIMPAC</p>
          </div>
        `,
        customId: 'tenant-created',
      })
    } catch (emailError) {
      if (emailError instanceof MailjetNotConfiguredError) {
        // Email not configured - return password in response for dev only
        if (process.env.NODE_ENV !== 'production') {
          return NextResponse.json(
            {
              tenant: result.tenant,
              message: `Tenant créé. Mot de passe temporaire (dev only): ${securePassword}`,
              tempPassword: securePassword,
            },
            { status: 201 }
          )
        }
      }
    }

    return NextResponse.json(
      {
        tenant: result.tenant,
        message: 'Tenant créé avec succès. Un email avec les identifiants a été envoyé.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating tenant')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}