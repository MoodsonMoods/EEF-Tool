import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TeamsResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const dataPath = join(process.cwd(), 'data', 'internal', 'teams.json');
    const teamsData = JSON.parse(readFileSync(dataPath, 'utf-8'));

    const response: TeamsResponse = {
      data: teamsData,
      success: true,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch teams',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      { status: 500 }
    );
  }
} 