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
  const sideId = parseInt(id, 10);
  if (isNaN(sideId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { value, label, isActive, sortOrder } = body;

    const existing = await prisma.print_side.findUnique({
      where: { id: sideId },
      include: { tenant_print_side: { include: { tenant: { select: { subdomain: true } } } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Side not found' }, { status: 404 });
    }

    const updated = await prisma.print_side.update({
      where: { id: sideId },
      data: {
        ...(value !== undefined && { value }),
        ...(label !== undefined && { label }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    existing.tenant_print_side.forEach(a => invalidatePrintOptionsCache(a.tenant.subdomain));
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Error updating print side:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A side with this value already exists' }, { status: 409 });
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
  const sideId = parseInt(id, 10);
  if (isNaN(sideId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const existing = await prisma.print_side.findUnique({
      where: { id: sideId },
      include: { tenant_print_side: { include: { tenant: { select: { subdomain: true } } } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Side not found' }, { status: 404 });
    }

    const subdomains = existing.tenant_print_side.map(a => a.tenant.subdomain);
    await prisma.print_side.delete({ where: { id: sideId } });
    subdomains.forEach(s => invalidatePrintOptionsCache(s));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting print side:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
