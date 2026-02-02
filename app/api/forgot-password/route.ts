import { MailjetNotConfiguredError, sendEmail } from '@/lib/email';
import prisma from '@/lib/prisma';
import { checkRateLimit, RATE_LIMITS, isValidEmail, buildResetUrl, escapeHtml } from '@/lib/security';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

  // Validate email format
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Format d\'email invalide' }, { status: 400 });
  }

  // Rate limiting by email
  const rateLimit = checkRateLimit(`forgot-password:${email.toLowerCase()}`, RATE_LIMITS.forgotPassword.limit, RATE_LIMITS.forgotPassword.windowMs);
  if (!rateLimit.allowed) {
    // Still return ok to prevent enumeration
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true }
  });

  // Always return success to prevent user enumeration
  if (user) {
    // Delete any existing tokens for this email (prevent token accumulation)
    await prisma.passwordResetToken.deleteMany({
      where: { email }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const resetUrl = buildResetUrl(baseUrl, user.tenant?.subdomain || null, token);
    
    const displayName = user.name?.length ? escapeHtml(user.name) : 'utilisateur';
    
    try {
      await sendEmail({
        to: { email: user.email, name: user.name ?? undefined },
        subject: 'Réinitialisation de votre mot de passe - Simpaap',
        text: [
          `Bonjour ${displayName},`,
          '',
          'Vous avez demandé la réinitialisation de votre mot de passe.',
          '',
          `Cliquez sur le lien suivant pour réinitialiser votre mot de passe :`,
          resetUrl,
          '',
          'Ce lien est valide pendant 1 heure.',
          '',
          'Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.',
          '',
          'À bientôt,',
          'SIMPAC',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Réinitialisation de votre mot de passe</h2>
            <p>Bonjour ${displayName},</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
            <p style="margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Réinitialiser mon mot de passe
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Ou copiez ce lien dans votre navigateur :<br/>
              <a href="${resetUrl}" style="color: #0070f3; word-break: break-all;">${resetUrl}</a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Ce lien est valide pendant <strong>1 heure</strong>.
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </p>
            <p style="margin-top: 30px;">
              À bientôt,<br/>
              <strong>SIMPAC</strong>
            </p>
          </div>
        `,
        customId: 'password-reset',
      });
    } catch (error) {
      if (error instanceof MailjetNotConfiguredError) {
        // Dev only: log token ID (not full URL) for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[DEV] Email not configured - check database for reset token');
        }
      }
      // Don't log sensitive information like reset URLs
    }
  }
  return NextResponse.json({ ok: true });
}
