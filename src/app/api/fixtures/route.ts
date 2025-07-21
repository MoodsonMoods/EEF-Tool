import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FixturesResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const dataPath = join(process.cwd(), 'data', 'internal', 'fixtures.json');
    const fixturesData = JSON.parse(readFileSync(dataPath, 'utf-8'));

    const response: FixturesResponse = {
      data: fixturesData,
      success: true,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch fixtures:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch fixtures',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      { status: 500 }
    );
  }
} 