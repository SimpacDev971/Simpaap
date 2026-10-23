import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {

  // ── TENANT ADMIN ──────────────────────────────────────
  const adminTenant = await prisma.tenant.upsert({
    where: { subdomain: 'admin' },
    update: {},
    create: { name: 'Admin', subdomain: 'admin' },
  })

  // ── CATÉGORIE ─────────────────────────────────────────
  let categorie = await prisma.categorie.findFirst({ where: { nom: 'Impression' } })
  if (!categorie) {
    categorie = await prisma.categorie.create({
      data: { nom: 'Impression', description: "Applications liées à l'impression et l'affranchissement" },
    })
  }

  // ── APPLICATION SIMPAAP ───────────────────────────────
  let simpaapApp = await prisma.application.findFirst({ where: { nom: 'Simpaap' } })
  if (!simpaapApp) {
    simpaapApp = await prisma.application.create({
      data: { nom: 'Simpaap', description: "Gestion de l'impression et de l'affranchissement postal", url: '/simpaap', categorieid: categorie.id },
    })
  }
  await prisma.tenant_application.upsert({
    where: { tenantid_applicationid: { tenantid: adminTenant.id, applicationid: simpaapApp.id } },
    update: {},
    create: { tenantid: adminTenant.id, applicationid: simpaapApp.id },
  })

  // ── COULEURS ──────────────────────────────────────────
  const colorsData = [
    { value: 'noir',    label: 'Noir',    sortOrder: 0 },
    { value: 'couleur', label: 'Couleur', sortOrder: 1 },
  ]
  const colors = []
  for (const c of colorsData) {
    let color = await prisma.print_color.findUnique({ where: { value: c.value } })
    if (!color) color = await prisma.print_color.create({ data: c })
    colors.push(color)
  }

  // ── CÔTÉS ─────────────────────────────────────────────
  const sidesData = [
    { value: 'recto',       label: 'Recto',       sortOrder: 0 },
    { value: 'recto_verso', label: 'Recto Verso',  sortOrder: 1 },
  ]
  const sides = []
  for (const s of sidesData) {
    let side = await prisma.print_side.findUnique({ where: { value: s.value } })
    if (!side) side = await prisma.print_side.create({ data: s })
    sides.push(side)
  }

  // ── ENVELOPPES ────────────────────────────────────────
  const enveloppesData = [
    { fullName: 'C65', taille: 'c65', pdsMax: 20,   poids: 5,  addrX: 109, addrY: 49, addrH: 45, addrL: 100 },
    { fullName: 'C4',  taille: 'c4',  pdsMax: 2000, poids: 15, addrX: 20,  addrY: 50, addrH: 35, addrL: 100 },
  ]
  const enveloppes = []
  for (const e of enveloppesData) {
    let env = await prisma.enveloppe.findUnique({ where: { taille: e.taille } })
    if (!env) env = await prisma.enveloppe.create({ data: e })
    enveloppes.push(env)
  }

  // ── VITESSES D'AFFRANCHISSEMENT ───────────────────────
  const speedsData = [
    { value: 'ecopli',       label: 'ECOPLI',       sortOrder: 0 },
    { value: 'reco',         label: 'RECO',          sortOrder: 1 },
    { value: 'lettre_verte', label: 'LETTRE VERTE',  sortOrder: 2 },
  ]
  const speeds = []
  for (const s of speedsData) {
    let speed = await prisma.affranchissement_speed.findUnique({ where: { value: s.value } })
    if (!speed) speed = await prisma.affranchissement_speed.create({ data: s })
    speeds.push(speed)
  }

  // Helpers pour retrouver les speedId par value
  const speedId = (value) => speeds.find(s => s.value === value).id

  // ── TARIFS D'AFFRANCHISSEMENT ─────────────────────────
  const affranchissementsData = [
    // ECOPLI (J+4)
    { fullName: 'ECOPLI (J+4)', name: 'ecopli_j4', pdsMin: 0,    pdsMax: 20,   price: 1.25,  speedValue: 'ecopli' },
    { fullName: 'ECOPLI (J+4)', name: 'ecopli_j4', pdsMin: 21,   pdsMax: 50,   price: 1.97,  speedValue: 'ecopli' },
    { fullName: 'ECOPLI (J+4)', name: 'ecopli_j4', pdsMin: 51,   pdsMax: 100,  price: 2.60,  speedValue: 'ecopli' },
    { fullName: 'ECOPLI (J+4)', name: 'ecopli_j4', pdsMin: 101,  pdsMax: 250,  price: 4.76,  speedValue: 'ecopli' },
    // LETTRE VERTE (J+3)
    { fullName: 'LETTRE VERTE (J+3)', name: 'lettre_verte_j3', pdsMin: 0,    pdsMax: 20,   price: 1.30,  speedValue: 'lettre_verte' },
    { fullName: 'LETTRE VERTE (J+3)', name: 'lettre_verte_j3', pdsMin: 21,   pdsMax: 50,   price: 2.16,  speedValue: 'lettre_verte' },
    { fullName: 'LETTRE VERTE (J+3)', name: 'lettre_verte_j3', pdsMin: 51,   pdsMax: 100,  price: 3.14,  speedValue: 'lettre_verte' },
    { fullName: 'LETTRE VERTE (J+3)', name: 'lettre_verte_j3', pdsMin: 101,  pdsMax: 250,  price: 5.15,  speedValue: 'lettre_verte' },
    { fullName: 'LETTRE VERTE (J+3)', name: 'lettre_verte_j3', pdsMin: 251,  pdsMax: 500,  price: 7.15,  speedValue: 'lettre_verte' },
    { fullName: 'LETTRE VERTE (J+3)', name: 'lettre_verte_j3', pdsMin: 501,  pdsMax: 1000, price: 9.09,  speedValue: 'lettre_verte' },
    { fullName: 'LETTRE VERTE (J+3)', name: 'lettre_verte_j3', pdsMin: 1001, pdsMax: 2000, price: 11.01, speedValue: 'lettre_verte' },
    // LETTRE RECO (J+3)
    { fullName: 'LETTRE RECO (J+3)', name: 'lettre_reco_j3', pdsMin: 0,    pdsMax: 20,   price: 6.72,  speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+3)', name: 'lettre_reco_j3', pdsMin: 21,   pdsMax: 50,   price: 7.32,  speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+3)', name: 'lettre_reco_j3', pdsMin: 51,   pdsMax: 100,  price: 8.16,  speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+3)', name: 'lettre_reco_j3', pdsMin: 101,  pdsMax: 250,  price: 9.64,  speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+3)', name: 'lettre_reco_j3', pdsMin: 251,  pdsMax: 500,  price: 11.03, speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+3)', name: 'lettre_reco_j3', pdsMin: 501,  pdsMax: 1000, price: 12.59, speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+3)', name: 'lettre_reco_j3', pdsMin: 1001, pdsMax: 2000, price: 14.56, speedValue: 'reco' },
    // LETTRE RECO (J+2)
    { fullName: 'LETTRE RECO (J+2)', name: 'lettre_reco_j2', pdsMin: 0,    pdsMax: 20,   price: 7.17,  speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+2)', name: 'lettre_reco_j2', pdsMin: 21,   pdsMax: 50,   price: 7.77,  speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+2)', name: 'lettre_reco_j2', pdsMin: 51,   pdsMax: 100,  price: 8.61,  speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+2)', name: 'lettre_reco_j2', pdsMin: 101,  pdsMax: 250,  price: 10.09, speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+2)', name: 'lettre_reco_j2', pdsMin: 251,  pdsMax: 500,  price: 11.48, speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+2)', name: 'lettre_reco_j2', pdsMin: 501,  pdsMax: 1000, price: 13.04, speedValue: 'reco' },
    { fullName: 'LETTRE RECO (J+2)', name: 'lettre_reco_j2', pdsMin: 1001, pdsMax: 2000, price: 15.01, speedValue: 'reco' },
  ]

  for (const a of affranchissementsData) {
    const existing = await prisma.affranchissement.findFirst({
      where: { name: a.name, pdsMin: a.pdsMin, pdsMax: a.pdsMax },
    })
    if (!existing) {
      await prisma.affranchissement.create({
        data: {
          fullName: a.fullName,
          name: a.name,
          pdsMin: a.pdsMin,
          pdsMax: a.pdsMax,
          price: a.price,
          speedId: speedId(a.speedValue),
        },
      })
    }
  }

  // ── LIAISON TENANT ADMIN ──────────────────────────────
  for (const color of colors) {
    await prisma.tenant_print_color.upsert({
      where: { tenantId_printColorId: { tenantId: adminTenant.id, printColorId: color.id } },
      update: {},
      create: { tenantId: adminTenant.id, printColorId: color.id },
    })
  }
  for (const side of sides) {
    await prisma.tenant_print_side.upsert({
      where: { tenantId_printSideId: { tenantId: adminTenant.id, printSideId: side.id } },
      update: {},
      create: { tenantId: adminTenant.id, printSideId: side.id },
    })
  }
  for (const env of enveloppes) {
    await prisma.tenant_enveloppe.upsert({
      where: { tenantId_enveloppeId: { tenantId: adminTenant.id, enveloppeId: env.id } },
      update: {},
      create: { tenantId: adminTenant.id, enveloppeId: env.id },
    })
  }
  for (const speed of speeds) {
    await prisma.tenant_speed.upsert({
      where: { tenantId_speedId: { tenantId: adminTenant.id, speedId: speed.id } },
      update: {},
      create: { tenantId: adminTenant.id, speedId: speed.id },
    })
  }

  console.log('✓ Seed complet — tenant admin prêt avec toutes les options Simpaap')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e instanceof Error ? e.message : String(e))
    if (e instanceof Error && e.stack) console.error(e.stack)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
