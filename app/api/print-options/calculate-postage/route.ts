import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/print-options/calculate-postage
 * Calculates postage rate for a given weight and optionally speed
 * Body: { weightGrams: number, speedId?: number }
 * Returns: { rate: { id, fullName, name, price, speed } | null }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { weightGrams, speedId } = body;

    if (weightGrams === undefined) {
      return NextResponse.json(
        { error: 'weightGrams is required' },
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

    // Build where clause - only weight range and optionally speed
    const whereClause: {
      pdsMin: { lte: number };
      pdsMax: { gte: number };
      isActive: boolean;
      speedId?: number;
    } = {
      pdsMin: { lte: weight },
      pdsMax: { gte: weight },
      isActive: true,
    };

    // Add speed filter if provided
    if (speedId !== undefined && speedId !== null) {
      whereClause.speedId = parseInt(speedId, 10);
    }

    // Find the applicable rate
    const rate = await prisma.affranchissement.findFirst({
      where: whereClause,
      orderBy: { price: 'asc' }, // Get the cheapest rate if multiple match
      select: {
        id: true,
        fullName: true,
        name: true,
        price: true,
        pdsMin: true,
        pdsMax: true,
        speedId: true,
        speed: {
          select: {
            id: true,
            value: true,
            label: true,
          },
        },
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
        speedId: rate.speedId,
        speed: rate.speed,
      } : null,
      input: { weightGrams: weight, speedId: speedId || null },
    });
  } catch (error) {
    console.error('Error calculating postage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
