import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FDRCalculator } from '@/lib/fdr-calculator';

// Configure for static export
export const dynamic = 'force-static';

// Generate static params for all horizon values
export async function generateStaticParams() {
  return [
    { horizon: '3' },
    { horizon: '5' },
    { horizon: '8' },
    { horizon: '10' }
  ];
}

interface TeamFDRData {
  teamId: number;
  teamName: string;
  attackFDR: number;
  defenceFDR: number;
  xGFor: number;
  xGConceded: number;
  rank: number;
  horizon: number;
  variance: number;
  homeMatches: number;
}

interface FDRResponse {
  success: boolean;
  data: {
    attack: TeamFDRData[];
    defence: TeamFDRData[];
    lastUpdated: string;
  };
  meta: {
    season: string;
    dataSource: string;
    totalTeams: number;
    horizon: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ horizon: string }> }
) {
  try {
    const { horizon: horizonParam } = await params;
    const horizon = parseInt(horizonParam);
    const startGameweek = 1; // Default start gameweek

    // Load team stats from data file
    const teamStatsPath = join(process.cwd(), 'data', 'internal', 'team-stats-2024-25.json');
    const teamStatsData = JSON.parse(readFileSync(teamStatsPath, 'utf-8'));
    const TEAM_STATS_2024_25 = teamStatsData.teams;

    // Load fixtures data
    const fixturesPath = join(process.cwd(), 'data', 'internal', 'fixtures.json');
    const fixturesData = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

    // Convert fixtures to the format expected by FDRCalculator
    const fixtures = fixturesData.map((fixture: any) => ({
      id: fixture.id,
      gameweek: fixture.event,
      homeTeam: fixture.teamH,
      awayTeam: fixture.teamA,
      kickoffTime: fixture.kickoffTime,
      finished: fixture.finished
    }));

    // Convert team stats to the format expected by FDRCalculator
    const fbrefData = Object.values(TEAM_STATS_2024_25).map((teamStats: any) => ({
      playerId: parseInt(teamStats.id),
      teamId: parseInt(teamStats.id),
      xGFor: teamStats.xGFor,
      xGConceded: teamStats.xGConceded,
      xA: 0, // Not used in FDR calculation
      minutes: 0, // Not used in FDR calculation
      games: 0 // Not used in FDR calculation
    }));

    // Calculate horizon-based FDR using the FDRCalculator
    const fdrResult = FDRCalculator.calculateHorizonFDR(fixtures, fbrefData, horizon, startGameweek);

    // Convert the result to the expected format
    const convertFDRData = (fdrArray: any[], type: 'attack' | 'defence'): TeamFDRData[] => {
      return fdrArray.map((item, index) => {
        // Find team name from team stats
        const teamStats = Object.values(TEAM_STATS_2024_25).find((stats: any) => stats.id === item.team);
        const teamName = teamStats ? (teamStats as any).name : `Team ${item.team}`;
        
        return {
          teamId: item.team,
          teamName,
          attackFDR: item.attack,
          defenceFDR: item.defence,
          xGFor: teamStats ? (teamStats as any).xGFor : 0,
          xGConceded: teamStats ? (teamStats as any).xGConceded : 0,
          rank: index + 1,
          horizon: item.horizon,
          variance: item.variance,
          homeMatches: item.homeMatches
        };
      });
    };

    const sortedAttackFDR = convertFDRData(fdrResult.attack, 'attack');
    const sortedDefenceFDR = convertFDRData(fdrResult.defence, 'defence');

    const response: FDRResponse = {
      success: true,
      data: {
        attack: sortedAttackFDR,
        defence: sortedDefenceFDR,
        lastUpdated: new Date().toISOString(),
      },
      meta: {
        season: teamStatsData.season,
        dataSource: 'Team Stats 2024-25',
        totalTeams: sortedAttackFDR.length,
        horizon: horizon,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching FDR data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch FDR data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
} 