import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, RATE_LIMITS, validatePassword } from '@/lib/security';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });

  // Rate limiting by token
  const rateLimit = checkRateLimit(`reset-password:${token.substring(0, 8)}`, RATE_LIMITS.resetPassword.limit, RATE_LIMITS.resetPassword.windowMs);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
  }

  // Validate password strength
  const validation = validatePassword(password);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.errors.join('. ') }, { status: 400 });
  }

  const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!reset) return NextResponse.json({ error: 'Token invalide' }, { status: 400 });
  if (reset.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.passwordResetToken.delete({ where: { token } });
    return NextResponse.json({ error: 'Token expiré' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email: reset.email }, data: { password: hashed } });
  await prisma.passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ ok: true });
}
