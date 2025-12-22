import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/print-options/calculate-postage
 * Calculates postage rate for a given weight and envelope size
 * Body: { env_taille: string, weightGrams: number }
 * Returns: { rate: { id, fullName, name, price } | null }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { env_taille, weightGrams } = body;

    if (!env_taille || weightGrams === undefined) {
      return NextResponse.json(
        { error: 'env_taille and weightGrams are required' },
        { status: 400 }
      );
    }

    const weight = parseInt(weightGrams, 10);

    if (isNaN(weight) || weight < 0) {
      return NextResponse.json(
        { error: 'weightGrams must be a positive number' },
        { status: 400 }
      );
    }

    // Find the applicable rate
    const rate = await prisma.affranchissement.findFirst({
      where: {
        env_taille,
        pdsMin: { lte: weight },
        pdsMax: { gte: weight },
        isActive: true,
      },
      orderBy: { price: 'asc' }, // Get the cheapest rate if multiple match
      select: {
        id: true,
        fullName: true,
        name: true,
        price: true,
        pdsMin: true,
        pdsMax: true,
      },
    });

    return NextResponse.json({
      rate: rate ? {
        id: rate.id,
        fullName: rate.fullName,
        name: rate.name,
        price: Number(rate.price),
        pdsMin: rate.pdsMin,
        pdsMax: rate.pdsMax,
      } : null,
      input: { env_taille, weightGrams: weight },
    });
  } catch (error) {
    console.error('Error calculating postage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
