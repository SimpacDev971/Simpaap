import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'

async function main() {
  // Créer tenant "admin" si nécessaire
  const adminTenant = await prisma.tenant.upsert({
    where: { subdomain: 'admin' },
    update: {},
    create: {
      name: 'Admin',
      subdomain: 'admin',
    },
  })

  // Créer superadmin et le connecter au tenant "admin"
  const hash = await bcrypt.hash('admin1234', 10)
  await prisma.user.upsert({
    where: { email: 'njudes@simpac.fr' },
    update: {},
    create: {
      email: 'njudes@simpac.fr',
      password: hash,
      name: 'Nico',
      role: 'SUPERADMIN',
      tenant: { connect: { id: adminTenant.id } }, // <--- obligatoire
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
