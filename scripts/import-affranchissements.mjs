import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSV file
const csvPath = path.join(__dirname, '../documentations/Affranchissements.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(';');
const data = lines.slice(1);

// Parse affranchissements
const affranchissements = data.map(line => {
  const [afranchissement, fullname, tranche, prix] = line.split(';');

  // Parse weight range
  const [pdsMin, pdsMax] = tranche.split('-').map(Number);

  // Parse price (replace comma with dot)
  const price = parseFloat(prix.replace(',', '.'));

  return {
    code: afranchissement,
    fullName: fullname,
    pdsMin,
    pdsMax,
    price
  };
});

// Group by code to create speed mappings
const speedMapping = {
  'ECOPLI': { name: 'ECOPLI', label: 'ECOPLI (J+4)' },
  'LETTRE VERTE': { name: 'Lettre Verte', label: 'Lettre Verte (J+3)' },
  'LRCI G3': { name: 'RECO G3', label: 'Lettre Recommandée G3 (J+3)' },
  'LRCI G2': { name: 'RECO G2', label: 'Lettre Recommandée G2 (J+2)' }
};

// Generate SQL or API calls
console.log('=== Affranchissements to Import ===\n');
console.log(`Total: ${affranchissements.length} entries\n`);

affranchissements.forEach((aff, index) => {
  console.log(`${index + 1}. ${aff.fullName} | ${aff.pdsMin}-${aff.pdsMax}g | ${aff.price.toFixed(2)}€`);
});

console.log('\n=== Speed Mappings Needed ===\n');
Object.entries(speedMapping).forEach(([code, speed]) => {
  console.log(`- ${code} -> ${speed.label}`);
});

console.log('\n=== SQL INSERT Statements ===\n');

// Assuming envelope C5 (taille: C5_PL) for all
const defaultEnvelope = 'C5_PL';

// Generate INSERT statements for each affranchissement
affranchissements.forEach(aff => {
  const speedCode = speedMapping[aff.code];
  const nameCode = aff.fullName.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  console.log(`-- ${aff.fullName} (${aff.pdsMin}-${aff.pdsMax}g)`);
  console.log(`INSERT INTO "affranchissement" ("fullName", "name", "env_taille", "pdsMin", "pdsMax", "price", "isActive", "createdAt", "updatedAt")`);
  console.log(`VALUES ('${aff.fullName}', '${nameCode}', '${defaultEnvelope}', ${aff.pdsMin}, ${aff.pdsMax}, ${aff.price}, true, NOW(), NOW());`);
  console.log('');
});

// Export for API usage
const apiPayload = affranchissements.map(aff => ({
  fullName: aff.fullName,
  env_taille: defaultEnvelope,
  speedId: null, // Will need to be mapped based on code
  pdsMin: String(aff.pdsMin),
  pdsMax: String(aff.pdsMax),
  price: String(aff.price),
  isActive: true
}));

// Save API payload
fs.writeFileSync(
  path.join(__dirname, 'affranchissements-import.json'),
  JSON.stringify(apiPayload, null, 2)
);

console.log('\n✅ API payload saved to: scripts/affranchissements-import.json');
