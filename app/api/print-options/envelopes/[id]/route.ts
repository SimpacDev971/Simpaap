import { invalidatePrintOptionsCache } from '@/lib/cache';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const envelopeId = parseInt(id, 10);
  if (isNaN(envelopeId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { value, label, description, isActive, sortOrder } = body;

    const existing = await prisma.envelope_type.findUnique({
      where: { id: envelopeId },
      include: { tenant_envelope_type: { include: { tenant: { select: { subdomain: true } } } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Envelope not found' }, { status: 404 });
    }

    const updated = await prisma.envelope_type.update({
      where: { id: envelopeId },
      data: {
        ...(value !== undefined && { value }),
        ...(label !== undefined && { label }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    existing.tenant_envelope_type.forEach(a => invalidatePrintOptionsCache(a.tenant.subdomain));
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Error updating envelope:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'An envelope with this value already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const envelopeId = parseInt(id, 10);
  if (isNaN(envelopeId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const existing = await prisma.envelope_type.findUnique({
      where: { id: envelopeId },
      include: { tenant_envelope_type: { include: { tenant: { select: { subdomain: true } } } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Envelope not found' }, { status: 404 });
    }

    const subdomains = existing.tenant_envelope_type.map(a => a.tenant.subdomain);
    await prisma.envelope_type.delete({ where: { id: envelopeId } });
    subdomains.forEach(s => invalidatePrintOptionsCache(s));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting envelope:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
