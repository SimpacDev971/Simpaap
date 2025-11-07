import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const tenantId = url.searchParams.get('id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    // Vérifier que le tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: true },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Supprimer tous les utilisateurs du tenant qui ne sont pas SUPERADMIN
    // et supprimer le tenant en transaction
    await prisma.$transaction(async (tx) => {
      // Supprimer les users non-SUPERADMIN du tenant
      await tx.user.deleteMany({
        where: {
          tenantId: tenantId,
          role: {
            not: 'SUPERADMIN',
          },
        },
      })

      // Supprimer le tenant
      await tx.tenant.delete({
        where: { id: tenantId },
      })
    })

    return NextResponse.json({ message: 'Tenant and associated users deleted successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Error deleting tenant:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
