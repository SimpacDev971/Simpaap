import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  const user = await prisma.user.findUnique({ 
    where: { email },
    include: { tenant: true }
  });
  // Jamais d'info d'existence de l'email pour sécurité.
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    // 1h de validité
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });
    // Remplacer ici par ton SMTP/Service réel
    // En production, utiliser l'URL du tenant si l'utilisateur appartient à un tenant
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const resetUrl = user.tenantId 
      ? `${baseUrl}/${user.tenant?.subdomain}/reset-password?token=${token}`
      : `${baseUrl}/reset-password?token=${token}`;
    console.log(`[RESET] Pour ${email} : ${resetUrl}`);
  }
  return NextResponse.json({ ok: true });
}
