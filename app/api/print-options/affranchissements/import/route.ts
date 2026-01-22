import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Speed mapping based on fullName
function getSpeedForAffranchissement(fullName: string, speeds: any[]) {
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

// Generate a unique code from fullName
function generateCode(fullName: string): string {
  return fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .substring(0, 50); // Limit length
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { csvData } = body;

    if (!csvData) {
      return NextResponse.json({ error: "Aucune donnée CSV fournie" }, { status: 400 });
    }

    // Parse CSV
    const lines = csvData.split('\n').filter((line: string) => line.trim());
    const data = lines.slice(1); // Skip header

    if (data.length === 0) {
      return NextResponse.json({ error: "Le fichier CSV est vide" }, { status: 400 });
    }

    // Parse affranchissement templates from CSV
    const templates = data.map((line: string) => {
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

    console.log(`📋 Parsed ${templates.length} price templates from CSV`);

    // Get all speeds for automatic linking
    const speeds = await prisma.affranchissement_speed.findMany();
    console.log(`🚀 Found ${speeds.length} speeds for linking`);

    // Get ALL existing affranchissements
    const existingAffranchissements = await prisma.affranchissement.findMany();
    console.log(`📄 Found ${existingAffranchissements.length} existing affranchissements in database`);

    let totalUpdated = 0;
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const template of templates) {
      // Generate unique code
      const name = generateCode(template.fullName);

      // Check if this affranchissement already exists (same fullName, pdsMin, pdsMax)
      const existing = existingAffranchissements.find(
        (aff) =>
          aff.fullName === template.fullName &&
          aff.pdsMin === template.pdsMin &&
          aff.pdsMax === template.pdsMax
      );

      if (existing) {
        // UPDATE existing affranchissement - only update the price, keep everything else
        if (existing.price !== template.price) {
          await prisma.affranchissement.update({
            where: { id: existing.id },
            data: {
              price: template.price,
              // Update speedId if it changed
              speedId: getSpeedForAffranchissement(template.fullName, speeds)
            }
          });
          console.log(`   ✏️  Updated: ${template.fullName} (${template.pdsMin}-${template.pdsMax}g) ${existing.price.toFixed(2)}€ → ${template.price.toFixed(2)}€`);
          totalUpdated++;
        } else {
          console.log(`   ⏭️  Skipped: ${template.fullName} (${template.pdsMin}-${template.pdsMax}g) - price unchanged`);
          totalSkipped++;
        }
      } else {
        // CREATE new affranchissement
        const speedId = getSpeedForAffranchissement(template.fullName, speeds);

        await prisma.affranchissement.create({
          data: {
            fullName: template.fullName,
            name: name,
            speedId: speedId,
            pdsMin: template.pdsMin,
            pdsMax: template.pdsMax,
            price: template.price,
            isActive: true
          }
        });

        console.log(`   ✅ Created: ${template.fullName} (${template.pdsMin}-${template.pdsMax}g) - ${template.price.toFixed(2)}€`);
        totalCreated++;
      }
    }

    const summary = {
      success: true,
      message: `Import réussi: ${totalUpdated} mis à jour, ${totalCreated} créés, ${totalSkipped} ignorés`,
      updated: totalUpdated,
      created: totalCreated,
      skipped: totalSkipped,
      templatesInCSV: templates.length
    };

    console.log(`\n✅ Import completed successfully!`);
    console.log(`   Updated: ${totalUpdated}`);
    console.log(`   Created: ${totalCreated}`);
    console.log(`   Skipped: ${totalSkipped}`);

    return NextResponse.json(summary);

  } catch (error: unknown) {
    console.error("❌ Error importing affranchissements:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Erreur lors de l'import: ${message}` },
      { status: 500 }
    );
  }
}
