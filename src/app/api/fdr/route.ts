import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load team stats from data file
const teamStatsPath = join(process.cwd(), 'data', 'internal', 'team-stats-2024-25.json');
const teamStatsData = JSON.parse(readFileSync(teamStatsPath, 'utf-8'));
const TEAM_STATS_2024_25 = teamStatsData.teams;

interface TeamFDRData {
  teamId: number;
  teamName: string;
  attackFDR: number;
  defenceFDR: number;
  xGFor: number;
  xGConceded: number;
  rank: number;
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
  };
}

// Simple FDR calculation based on xG values
function calculateSimpleFDR(xGValue: number, isHome: boolean = false, invert: boolean = false): number {
  // Adjust for home/away advantage
  const adjustedXG = isHome ? xGValue - 0.1 : xGValue + 0.1;
  
  // Map xG values to FDR (1-5 scale)
  let fdr: number;
  if (adjustedXG <= 0.8) fdr = 1; // Very Easy
  else if (adjustedXG <= 1.0) fdr = 2; // Easy
  else if (adjustedXG <= 1.3) fdr = 3; // Medium
  else if (adjustedXG <= 1.6) fdr = 4; // Hard
  else fdr = 5; // Very Hard
  
  // Invert the scale if needed (for attack FDR)
  if (invert) {
    fdr = 6 - fdr; // 1 becomes 5, 2 becomes 4, etc.
  }
  
  return fdr;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const horizon = parseInt(searchParams.get('horizon') || '5');
    const gameweek = parseInt(searchParams.get('gameweek') || '1');

    // Read teams data
    const teamsPath = join(process.cwd(), 'data', 'internal', 'teams.json');
    const teamsData = JSON.parse(readFileSync(teamsPath, 'utf-8'));

    const fdrData: TeamFDRData[] = [];

    // Calculate FDR for each team
    for (const team of teamsData) {
      const teamStats = TEAM_STATS_2024_25[team.name as keyof typeof TEAM_STATS_2024_25];
      
              if (teamStats) {
          // Calculate attack FDR (how easy it is to score against this team)
          // Higher xG conceded = easier to score against = lower FDR
          const attackFDR = calculateSimpleFDR(teamStats.xGConceded, false, true);

          // Calculate defence FDR (how easy it is to keep clean sheet against this team)
          // Lower xG for = easier to keep clean sheet against = lower FDR
          const defenceFDR = calculateSimpleFDR(teamStats.xGFor, false, false);

        fdrData.push({
          teamId: team.id,
          teamName: team.name,
          attackFDR,
          defenceFDR,
          xGFor: teamStats.xGFor,
          xGConceded: teamStats.xGConceded,
          rank: 0, // Will be set after sorting
        });
      }
    }

    // Sort by attack FDR (easiest first) and assign ranks
    const sortedAttackFDR = [...fdrData].sort((a, b) => a.attackFDR - b.attackFDR);
    sortedAttackFDR.forEach((team, index) => {
      team.rank = index + 1;
    });

    // Sort by defence FDR (easiest first) and assign ranks
    const sortedDefenceFDR = [...fdrData].sort((a, b) => a.defenceFDR - b.defenceFDR);
    sortedDefenceFDR.forEach((team, index) => {
      team.rank = index + 1;
    });

    const response: FDRResponse = {
      success: true,
      data: {
        attack: sortedAttackFDR,
        defence: sortedDefenceFDR,
        lastUpdated: new Date().toISOString(),
      },
      meta: {
        season: teamStatsData.season,
        dataSource: teamStatsData.dataSource,
        totalTeams: fdrData.length,
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