import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Read the CSV file
const csvPath = path.join(__dirname, '../documentations/Affranchissements.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.split('\n').filter(line => line.trim());
const data = lines.slice(1); // Skip header

// Parse affranchissements
const affranchissements = data.map(line => {
  const [afranchissement, fullname, tranche, prix] = line.split(';');

  // Parse weight range
  const [pdsMin, pdsMax] = tranche.split('-').map(Number);

  // Parse price (replace comma with dot)
  const price = parseFloat(prix.replace(',', '.'));

  // Generate code from fullName
  const name = fullname
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .substring(0, 50); // Limit length

  return {
    code: afranchissement,
    fullName: fullname,
    name,
    pdsMin,
    pdsMax,
    price
  };
});

// Speed mapping based on fullName
function getSpeedForAffranchissement(fullName, speeds) {
  if (fullName.includes('ECOPLI')) {
    return speeds.find(s => s.label.toLowerCase().includes('ecopli'))?.id || null;
  }
  if (fullName.includes('LETTRE VERTE')) {
    return speeds.find(s => s.label.toLowerCase().includes('verte'))?.id || null;
  }
  if (fullName.includes('LETTRE RECO')) {
    return speeds.find(s => s.label.toLowerCase().includes('reco'))?.id || null;
  }
  return null;
}

async function main() {
  console.log('🚀 Starting affranchissements import...\n');

  // Get existing speeds
  const speeds = await prisma.affranchissement_speed.findMany();
  console.log('📦 Existing speeds:');
  speeds.forEach(s => console.log(`  - ${s.label} (id: ${s.id})`));
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  for (const aff of affranchissements) {
    try {
      const speedId = getSpeedForAffranchissement(aff.fullName, speeds);

      await prisma.affranchissement.create({
        data: {
          fullName: aff.fullName,
          name: aff.name,
          speedId: speedId,
          pdsMin: aff.pdsMin,
          pdsMax: aff.pdsMax,
          price: aff.price,
          isActive: true
        }
      });

      const speedLabel = speeds.find(s => s.id === speedId)?.label || 'None';
      console.log(`✅ ${aff.fullName} (${aff.pdsMin}-${aff.pdsMax}g) - ${aff.price.toFixed(2)}€ [${speedLabel}]`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error inserting ${aff.fullName}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Import Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total: ${affranchissements.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
