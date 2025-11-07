// app/api/create-tenant/route.ts
import prisma from '@/lib/prisma'
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

    const { name, subdomain, adminEmail } = await request.json()

    if (!name || !subdomain) {
      return NextResponse.json({ error: 'Name and subdomain are required' }, { status: 400 })
    }

    if (!adminEmail) {
      return NextResponse.json({ error: 'Admin email is required' }, { status: 400 })
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain },
    })

    if (existingTenant) {
      return NextResponse.json({ error: 'Subdomain already exists' }, { status: 409 })
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà' }, { status: 409 })
    }

    // Créer le tenant et l'admin en transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer le tenant
      const newTenant = await tx.tenant.create({
        data: { name, subdomain },
      })

      // Hacher le mot de passe par défaut
      const defaultPassword = 'password'
      const hashedPassword = await hash(defaultPassword, 10)

      // Créer l'admin
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

    return NextResponse.json(
      {
        tenant: result.tenant,
        message: `Tenant créé avec succès. Admin créé avec le mot de passe par défaut "password"`,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating tenant:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}