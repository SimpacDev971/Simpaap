import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
  const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!reset) return NextResponse.json({ error: 'Token invalide' }, { status: 400 });
  if (reset.expiresAt < new Date()) return NextResponse.json({ error: 'Token expiré' }, { status: 400 });
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email: reset.email }, data: { password: hashed } });
  await prisma.passwordResetToken.delete({ where: { token } });
  return NextResponse.json({ ok: true });
}
