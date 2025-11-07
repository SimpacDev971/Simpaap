import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'

async function main() {
  // Créer tenant si nécessaire
  const tenants = [{ name: 'test', subdomain: 'test' }]
  for (const tenant of tenants) {
    await prisma.tenant.upsert({
      where: { subdomain: tenant.subdomain },
      update: {},
      create: tenant,
    })
  }

  // Créer superadmin
  const hash = await bcrypt.hash('admin1234', 10)
  await prisma.user.upsert({
    where: { email: 'njudes@simpac.fr' },
    update: {},
    create: {
      email: 'njudes@simpac.fr',
      password: hash,
      name: 'Nico',
      role: 'SUPERADMIN',
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
