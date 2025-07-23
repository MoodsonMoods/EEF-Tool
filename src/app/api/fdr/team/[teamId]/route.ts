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

interface TeamFDRResponse {
  success: boolean;
  data: TeamFDRData | null;
  meta: {
    season: string;
    dataSource: string;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId: teamIdParam } = await params;
    const teamId = parseInt(teamIdParam);
    
    if (isNaN(teamId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid team ID'
      }, { status: 400 });
    }

    // First, get the team name from the main teams API
    const teamsResponse = await fetch(`${request.nextUrl.origin}/api/teams/`);
    if (!teamsResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch teams data'
      }, { status: 500 });
    }
    
    const teamsData = await teamsResponse.json();
    const team = teamsData.data.find((t: any) => t.id === teamId);
    
    if (!team) {
      return NextResponse.json({
        success: false,
        error: 'Team not found in teams API'
      }, { status: 404 });
    }

    // Map team names from main API to CSV data names
    const teamNameMapping: { [key: string]: string } = {
      'Ajax': 'Ajax',
      'PSV': 'PSV Eindhoven',
      'Feyenoord': 'Feyenoord',
      'AZ': 'AZ Alkmaar',
      'FC Twente': 'Twente',
      'FC Utrecht': 'Utrecht',
      'FC Groningen': 'Groningen',
      'Vitesse': 'Vitesse',
      'sc Heerenveen': 'Heerenveen',
      'Sparta Rotterdam': 'Sparta R\'dam',
      'Go Ahead Eagles': 'Go Ahead Eagles',
      'Fortuna Sittard': 'Fortuna Sittard',
      'RKC Waalwijk': 'RKC Waalwijk',
      'N.E.C.': 'NEC',
      'Heracles Almelo': 'Heracles Almelo',
      'Willem II': 'Willem II',
      'Almere City': 'Almere City',
      'Roda JC Kerkrade': 'Roda JC'
    };

    const csvTeamName = teamNameMapping[team.name];
    
    // Find the team in our CSV data
    let teamStats: any;
    let useDefaultStats = false;
    
    if (csvTeamName) {
      const teamEntry = Object.entries(TEAM_STATS_2024_25).find((entry) => 
        entry[0] === csvTeamName
      );
      if (teamEntry) {
        teamStats = teamEntry[1];
      }
    }
    
    // If team not found in CSV data, use default stats for promoted/new teams
    if (!teamStats) {
      useDefaultStats = true;
      console.log(`Team not found in FDR data: ${team.name} (${csvTeamName || 'no mapping'}), using default stats`);
      
      // Default stats for promoted/new teams (medium difficulty)
      teamStats = {
        xGFor: 1.3,
        xGConceded: 1.3
      };
    }
    
    // Calculate attack FDR (how easy it is to score against this team)
    // Higher xG conceded = easier to score against = lower FDR
    const attackFDR = calculateSimpleFDR(teamStats.xGConceded, false, true);

    // Calculate defence FDR (how easy it is to keep clean sheet against this team)
    // Lower xG for = easier to keep clean sheet against = lower FDR
    const defenceFDR = calculateSimpleFDR(teamStats.xGFor, false, false);

    const teamFDRData: TeamFDRData = {
      teamId: teamId, // Use the original team ID from the request
      teamName: team.name, // Use the original team name from the main API
      attackFDR,
      defenceFDR,
      xGFor: teamStats.xGFor,
      xGConceded: teamStats.xGConceded,
      rank: 0, // Rank would need to be calculated in context of all teams
    };

    const response: TeamFDRResponse = {
      success: true,
      data: teamFDRData,
      meta: {
        season: '2024-25',
        dataSource: 'CSV Import'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching team FDR data:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 