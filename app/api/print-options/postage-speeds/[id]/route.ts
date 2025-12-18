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
  const postageSpeedId = parseInt(id, 10);
  if (isNaN(postageSpeedId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { value, label, isActive, sortOrder } = body;

    const existing = await prisma.postage_speed.findUnique({
      where: { id: postageSpeedId },
      include: { tenant_postage_speed: { include: { tenant: { select: { subdomain: true } } } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Postage speed not found' }, { status: 404 });
    }

    const updated = await prisma.postage_speed.update({
      where: { id: postageSpeedId },
      data: {
        ...(value !== undefined && { value }),
        ...(label !== undefined && { label }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    existing.tenant_postage_speed.forEach(a => invalidatePrintOptionsCache(a.tenant.subdomain));
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Error updating postage speed:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A postage speed with this value already exists' }, { status: 409 });
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
  const postageSpeedId = parseInt(id, 10);
  if (isNaN(postageSpeedId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const existing = await prisma.postage_speed.findUnique({
      where: { id: postageSpeedId },
      include: { tenant_postage_speed: { include: { tenant: { select: { subdomain: true } } } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Postage speed not found' }, { status: 404 });
    }

    const subdomains = existing.tenant_postage_speed.map(a => a.tenant.subdomain);
    await prisma.postage_speed.delete({ where: { id: postageSpeedId } });
    subdomains.forEach(s => invalidatePrintOptionsCache(s));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting postage speed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
