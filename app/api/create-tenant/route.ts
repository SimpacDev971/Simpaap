// app/api/create-tenant/route.ts
import prisma from '@/lib/prisma'
import {
  generateSecurePassword,
  isValidEmail,
  isValidSubdomain,
  checkRateLimit,
  RATE_LIMITS,
  escapeHtml,
  buildTenantLoginUrl
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

      return { tenant: newTenant, admin }
    })

    // Generate invitation token — admin sets their own password, never transmitted in clear
    const crypto = await import('crypto')
    await prisma.passwordResetToken.deleteMany({ where: { email: adminEmail } })
    const inviteToken = crypto.randomBytes(32).toString('hex')
    await prisma.passwordResetToken.create({
      data: { email: adminEmail, token: inviteToken, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) },
    })

    // Send welcome email with setup link only
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const domain = baseUrl.replace(/^https?:\/\//, '')
      const setupUrl = `https://${result.tenant.subdomain}.${domain}/reset-password?token=${inviteToken}`
      const loginUrl = buildTenantLoginUrl(baseUrl, result.tenant.subdomain)

      await sendMailjetEmail({
        to: { email: adminEmail, name: `Admin ${name}` },
        subject: 'Votre espace Simpaap est prêt — Activez votre compte',
        text: [
          `Bonjour,`,
          '',
          `Votre espace Simpaap "${escapeHtml(name)}" a été créé avec succès.`,
          `Identifiant : ${adminEmail}`,
          `URL : ${loginUrl}`,
          '',
          'Cliquez sur le lien ci-dessous pour définir votre mot de passe et accéder à votre espace :',
          '',
          setupUrl,
          '',
          'Ce lien est valide pendant 72 heures.',
          '',
          'À bientôt,',
          'Simpaap',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Votre espace Simpaap est prêt</h2>
            <p>L'espace <strong>${escapeHtml(name)}</strong> a été créé avec succès.<br/>Identifiant : <strong>${escapeHtml(adminEmail)}</strong><br/>URL : <a href="${loginUrl}" style="color: #0070f3;">${loginUrl}</a></p>
            <p style="margin: 24px 0;">
              <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px;">
                Définir mon mot de passe
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">Ce lien est valide pendant <strong>72 heures</strong>.</p>
            <p style="color: #666; margin-top: 30px;">À bientôt,<br/>Simpaap</p>
          </div>
        `,
        customId: 'tenant-created',
      })
    } catch (emailError) {
      if (emailError instanceof MailjetNotConfiguredError) {
        if (process.env.NODE_ENV !== 'production') {
          return NextResponse.json(
            {
              tenant: result.tenant,
              message: `Tenant créé. Email non configuré en dev.`,
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