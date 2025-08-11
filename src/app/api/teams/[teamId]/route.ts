import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Team, ApiResponse } from '@/types';

// Configure for static export
export const dynamic = 'force-static';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId: teamIdParam } = await params;
    const teamId = parseInt(teamIdParam);
    
    if (isNaN(teamId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid team ID. Must be a number.',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        },
        { status: 400 }
      );
    }

    const dataPath = join(process.cwd(), 'data', 'internal', 'teams.json');
    const teamsData: Team[] = JSON.parse(readFileSync(dataPath, 'utf-8'));

    const team = teamsData.find(t => t.id === teamId);

    if (!team) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Team with ID ${teamId} not found`,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<Team> = {
      data: team,
      success: true,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch team:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch team',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      { status: 500 }
    );
  }
} 