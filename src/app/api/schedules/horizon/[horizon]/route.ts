import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configure for static export
export const dynamic = 'force-dynamic';

// Generate static params for all horizon values
export async function generateStaticParams() {
  return [
    { horizon: '3' },
    { horizon: '5' },
    { horizon: '8' },
    { horizon: '10' }
  ];
}

interface TeamStats {
  id: number;
  name: string;
  xGFor: number;
  xGConceded: number;
}

interface Fixture {
  id: number;
  event: number;
  kickoffTime: string;
  teamH: number;
  teamA: number;
  finished: boolean;
}

interface TeamSchedule {
  teamId: number;
  teamName: string;
  fixtures: Array<{
    fixtureId: number;
    event: number;
    kickoffTime: string;
    opponentId: number;
    opponentName: string;
    isHome: boolean;
    opponentAttackFDR: number;
    opponentDefenceFDR: number;
  }>;
  averageAttackFDR: number;
  averageDefenceFDR: number;
  attackFDRRank: number;
  defenceFDRRank: number;
}

// Hardcoded FDR mapping (same as in fdr-calculator.ts)
const TEAM_FDR_MAPPING = {
  attack: {
    5: ['PSV', 'Feyenoord'],           // Very Hard
    4: ['AZ', 'Ajax'],                 // Hard
    3: ['FC Utrecht', 'FC Twente', 'N.E.C.', 'Sparta Rotterdam', 'Go Ahead Eagles', 'FC Groningen', 'sc Heerenveen', 'Fortuna Sittard'], // Medium
    2: ['PEC Zwolle', 'NAC Breda', 'Heracles Almelo'], // Easy
    1: ['Excelsior', 'FC Volendam', 'Telstar'] // Very Easy
  },
  defence: {
    5: ['PSV'],                        // Very Hard
    4: ['Ajax', 'Feyenoord', 'AZ'],    // Hard
    3: ['FC Twente', 'Go Ahead Eagles', 'FC Utrecht', 'N.E.C.'], // Medium
    2: ['sc Heerenveen', 'Sparta Rotterdam', 'Heracles Almelo', 'Fortuna Sittard', 'PEC Zwolle', 'NAC Breda', 'FC Groningen'], // Easy
    1: ['Telstar', 'FC Volendam', 'Excelsior'] // Very Easy
  }
};

function getTeamFDR(teamName: string, type: 'attack' | 'defence'): number {
  const mapping = TEAM_FDR_MAPPING[type];
  for (const [fdrLevel, teams] of Object.entries(mapping)) {
    if (teams.includes(teamName)) {
      return parseInt(fdrLevel);
    }
  }
  return 3; // Default to Medium if team not found
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ horizon: string }> }
) {
  try {
    const { horizon: horizonParam } = await params;
    const horizon = parseInt(horizonParam);
    const { searchParams } = new URL(request.url);
    const startGameweek = parseInt(searchParams.get('startGameweek') || '1');

    // Load team stats
    const teamStatsPath = join(process.cwd(), 'data', 'internal', 'team-stats-2024-25-csv-import.json');
    const teamStatsData = JSON.parse(readFileSync(teamStatsPath, 'utf-8'));
    const TEAM_STATS_2024_25 = teamStatsData.teams;

    // Load teams mapping
    const teamsPath = join(process.cwd(), 'data', 'internal', 'teams.json');
    const teamsData = JSON.parse(readFileSync(teamsPath, 'utf-8'));
    const teamsMap = new Map<number, string>();
    teamsData.forEach((team: any) => {
      teamsMap.set(team.id, team.name);
    });

    // Load fixtures
    const fixturesPath = join(process.cwd(), 'data', 'internal', 'fixtures.json');
    const fixturesData: Fixture[] = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

    // Filter fixtures starting from the specified gameweek
    const upcomingFixtures = fixturesData
      .filter(fixture => fixture.event >= startGameweek)
      .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime())
      .slice(0, horizon * 18); // 18 teams, so up to 18 fixtures per gameweek

    // Group fixtures by team
    const teamSchedules = new Map<number, TeamSchedule>();

    // Initialize schedules for all teams from the teams mapping (this contains all teams in fixtures)
    for (const [teamId, teamName] of Array.from(teamsMap.entries())) {
      teamSchedules.set(teamId, {
        teamId,
        teamName: teamName,
        fixtures: [],
        averageAttackFDR: 0,
        averageDefenceFDR: 0,
        attackFDRRank: 0,
        defenceFDRRank: 0
      });
    }

    // Process fixtures for each team individually to get their next sequential fixtures
    for (const [teamId, schedule] of Array.from(teamSchedules.entries())) {
      // Find all fixtures where this team is either home or away, starting from startGameweek
      const teamFixtures = upcomingFixtures.filter(fixture => 
        (fixture.teamH === teamId || fixture.teamA === teamId) &&
        fixture.event >= startGameweek
      );
      
      // Sort by kickoff time to ensure chronological order
      teamFixtures.sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime());
      
      // Take only the first 'horizon' fixtures for this team
      const nextFixtures = teamFixtures.slice(0, horizon);
      
      // Add these fixtures to the team's schedule
      for (const fixture of nextFixtures) {
        const isHome = fixture.teamH === teamId;
        const opponentId = isHome ? fixture.teamA : fixture.teamH;
        const opponentName = teamsMap.get(opponentId);
        
        // Try to find opponent stats by matching team names
        let opponentStats = null;
        if (opponentName) {
          for (const [csvTeamName, teamStats] of Object.entries(TEAM_STATS_2024_25)) {
            const stats = teamStats as any;
            if (csvTeamName.toLowerCase().includes(opponentName.toLowerCase()) || 
                opponentName.toLowerCase().includes(csvTeamName.toLowerCase())) {
              opponentStats = stats;
              break;
            }
          }
        }
        
        // Include all fixtures, even if opponent doesn't have stats
        schedule.fixtures.push({
          fixtureId: fixture.id,
          event: fixture.event,
          kickoffTime: fixture.kickoffTime,
          opponentId: opponentId,
          opponentName: opponentName || 'Unknown Team',
          isHome: isHome,
          opponentAttackFDR: opponentName ? getTeamFDR(opponentName, 'attack') : 3, // Use hardcoded mapping
          opponentDefenceFDR: opponentName ? getTeamFDR(opponentName, 'defence') : 3 // Use hardcoded mapping
        });
      }
    }

    // Calculate averages and ranks
    const schedulesArray = Array.from(teamSchedules.values());
    
    // Calculate averages
    for (const schedule of schedulesArray) {
      if (schedule.fixtures.length > 0) {
        const totalAttackFDR = schedule.fixtures.reduce((sum, fixture) => sum + fixture.opponentAttackFDR, 0);
        const totalDefenceFDR = schedule.fixtures.reduce((sum, fixture) => sum + fixture.opponentDefenceFDR, 0);
        
        schedule.averageAttackFDR = totalAttackFDR / schedule.fixtures.length;
        schedule.averageDefenceFDR = totalDefenceFDR / schedule.fixtures.length;
      }
    }

    // Sort and assign ranks
    const sortedByAttackFDR = [...schedulesArray].sort((a, b) => a.averageAttackFDR - b.averageAttackFDR);
    const sortedByDefenceFDR = [...schedulesArray].sort((a, b) => a.averageDefenceFDR - b.averageDefenceFDR);

    sortedByAttackFDR.forEach((schedule, index) => {
      schedule.attackFDRRank = index + 1;
    });

    sortedByDefenceFDR.forEach((schedule, index) => {
      schedule.defenceFDRRank = index + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        schedules: schedulesArray,
        horizon,
        startGameweek,
        totalTeams: schedulesArray.length
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });

  } catch (error) {
    console.error('Failed to fetch team schedules:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch team schedules',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      { status: 500 }
    );
  }
} 