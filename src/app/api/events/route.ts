import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EventsResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const dataPath = join(process.cwd(), 'data', 'internal', 'events.json');
    const eventsData = JSON.parse(readFileSync(dataPath, 'utf-8'));

    const response: EventsResponse = {
      data: eventsData,
      success: true,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch events',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      { status: 500 }
    );
  }
} 