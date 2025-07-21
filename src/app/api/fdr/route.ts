import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

        // Load team stats from data file
        const teamStatsPath = join(process.cwd(), 'data', 'internal', 'team-stats-2024-25-csv-import.json');
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

// FDR calculation based on new difficulty categorization
function calculateSimpleFDR(xGValue: number, isHome: boolean = false, isAttack: boolean = false): number {
  let fdr: number;
  
  if (isAttack) {
    // Attack FDR (based on xGC - how easy it is to score against this team)
    // Higher xGC = easier to score against = lower FDR
    if (xGValue >= 2.0) fdr = 1; // Very Easy (including promoted teams with xGC=2)
    else if (xGValue > 1.5) fdr = 2; // Easy
    else if (xGValue > 1.2) fdr = 3; // Medium
    else if (xGValue > 1.0) fdr = 4; // Hard
    else fdr = 5; // Very Hard
  } else {
    // Defence FDR (based on xG - how easy it is to keep clean sheet against this team)
    // Lower xG = easier to keep clean sheet against = lower FDR
    if (xGValue < 1.0) fdr = 1; // Very Easy
    else if (xGValue < 1.2) fdr = 2; // Easy
    else if (xGValue < 1.5) fdr = 3; // Medium
    else if (xGValue < 1.8) fdr = 4; // Hard
    else fdr = 5; // Very Hard
  }
  
  return fdr;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const horizon = parseInt(searchParams.get('horizon') || '5');
    const gameweek = parseInt(searchParams.get('gameweek') || '1');

    const fdrData: TeamFDRData[] = [];

    // Calculate FDR for each team from the CSV-imported data
    for (const [teamName, teamStats] of Object.entries(TEAM_STATS_2024_25)) {
      const stats = teamStats as any; // Type assertion for now
      
      // Calculate attack FDR (how easy it is to score against this team)
      // Higher xG conceded = easier to score against = lower FDR
      const attackFDR = calculateSimpleFDR(stats.xGConceded, false, true);

      // Calculate defence FDR (how easy it is to keep clean sheet against this team)
      // Lower xG for = easier to keep clean sheet against = lower FDR
      const defenceFDR = calculateSimpleFDR(stats.xGFor, false, false);

      fdrData.push({
        teamId: parseInt(stats.id),
        teamName: stats.name,
        attackFDR,
        defenceFDR,
        xGFor: stats.xGFor,
        xGConceded: stats.xGConceded,
        rank: 0, // Will be set after sorting
      });
    }

    // Sort by attack FDR (easiest first) - sort by xGConceded descending (higher xGC = easier to score against)
    const sortedAttackFDR = [...fdrData].sort((a, b) => b.xGConceded - a.xGConceded).map((team, index) => ({
      ...team,
      rank: index + 1
    }));

    // Sort by defence FDR (easiest first) - sort by xGFor ascending (lower xG = easier to keep clean sheet against)
    const sortedDefenceFDR = [...fdrData].sort((a, b) => a.xGFor - b.xGFor).map((team, index) => ({
      ...team,
      rank: index + 1
    }));

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