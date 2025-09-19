import { NextResponse } from 'next/server';
import { FDRCalculator } from '@/lib/fdr-calculator';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const mapping = FDRCalculator.getTeamTierMapping();
    const attack = mapping.attack;
    const defence = mapping.defence;

    return NextResponse.json({
      success: true,
      data: {
        attack,
        defence,
      },
      meta: {
        season: '2025-2026',
        source: 'FBref-derived tiers in FDRCalculator',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to load tiers' }, { status: 500 });
  }
}


