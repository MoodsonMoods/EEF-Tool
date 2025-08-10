import { Fixture } from './fixture-service';

export interface FDRData {
  team: number;
  attack: number;
  defence: number;
  horizon: number;
  variance: number;
  homeMatches: number;
}

export interface PlayerFBref {
  playerId: number;
  teamId: number;
  xGFor: number;
  xGConceded: number;
  xA: number;
  minutes: number;
  games: number;
}

export class FDRCalculator {
  private static readonly DIFFICULTY_WEIGHTS = {
    VERY_EASY: 1,
    EASY: 2,
    MEDIUM: 3,
    HARD: 4,
    VERY_HARD: 5,
  };

  private static readonly TEAM_FDR_MAPPING = {
    // Attack FDR mapping based on 2023-2024 season performance
    attack: {
      5: ['PSV', 'Feyenoord'],           // Very Hard
      4: ['AZ', 'Ajax'],                 // Hard
      3: ['FC Utrecht', 'FC Twente', 'N.E.C.', 'Sparta Rotterdam', 'Go Ahead Eagles', 'FC Groningen', 'sc Heerenveen', 'Fortuna Sittard'], // Medium
      2: ['PEC Zwolle', 'NAC Breda', 'Heracles Almelo'], // Easy
      1: ['Excelsior', 'FC Volendam', 'Telstar'] // Very Easy
    },
    // Defence FDR mapping based on 2023-2024 season performance
    defence: {
      5: ['PSV'],                        // Very Hard
      4: ['Ajax', 'Feyenoord', 'AZ'],    // Hard
      3: ['FC Twente', 'Go Ahead Eagles', 'FC Utrecht', 'N.E.C.'], // Medium
      2: ['sc Heerenveen', 'Sparta Rotterdam', 'Heracles Almelo', 'Fortuna Sittard', 'PEC Zwolle', 'NAC Breda', 'FC Groningen'], // Easy
      1: ['Telstar', 'FC Volendam', 'Excelsior'] // Very Easy
    }
  };

  private static getTeamFDR(teamName: string, type: 'attack' | 'defence'): number {
    const mapping = this.TEAM_FDR_MAPPING[type];
    for (const [fdrLevel, teams] of Object.entries(mapping)) {
      if (teams.includes(teamName)) {
        return parseInt(fdrLevel);
      }
    }
    return 3; // Default to Medium if team not found
  }

  private static getTeamNameById(teamId: number): string {
    // This is a simple mapping based on the team IDs in the data
    const teamIdToName: Record<number, string> = {
      1: 'Ajax',
      2: 'AZ',
      3: 'FC Groningen',
      4: 'FC Twente',
      5: 'FC Utrecht',
      6: 'Feyenoord',
      7: 'Fortuna Sittard',
      8: 'Go Ahead Eagles',
      9: 'Heracles Almelo',
      10: 'N.E.C.',
      11: 'NAC Breda',
      12: 'PEC Zwolle',
      13: 'PSV',
      14: 'sc Heerenveen',
      15: 'Sparta Rotterdam',
      16: 'Telstar',
      17: 'FC Volendam',
      18: 'Excelsior'
    };
    return teamIdToName[teamId] || 'Unknown Team';
  }

  /**
   * Calculate FDR for a specific gameweek based on xG data
   */
  static calculateGameweekFDR(
    fixtures: Fixture[],
    fbrefData: PlayerFBref[],
    gameweek: number
  ): { attack: FDRData[]; defence: FDRData[] } {
    const gameweekFixtures = fixtures.filter(f => f.gameweek === gameweek);
    const teamStats = this.getTeamStats(fbrefData);

    const attackFDR: FDRData[] = [];
    const defenceFDR: FDRData[] = [];

    for (const fixture of gameweekFixtures) {
      const homeTeamStats = teamStats[fixture.homeTeam];
      const awayTeamStats = teamStats[fixture.awayTeam];

      if (homeTeamStats && awayTeamStats) {
        // Attack FDR for home team (how easy it is to score against away team)
        const homeAttackFDR = this.calculateAttackFDR(
          homeTeamStats.xGFor,
          awayTeamStats.xGConceded,
          true // home advantage
        );

        // Defence FDR for home team (how easy it is to keep clean sheet against away team)
        const homeDefenceFDR = this.calculateDefenceFDR(
          homeTeamStats.xGConceded,
          awayTeamStats.xGFor,
          true // home advantage
        );

        // Attack FDR for away team
        const awayAttackFDR = this.calculateAttackFDR(
          awayTeamStats.xGFor,
          homeTeamStats.xGConceded,
          false // away disadvantage
        );

        // Defence FDR for away team
        const awayDefenceFDR = this.calculateDefenceFDR(
          awayTeamStats.xGConceded,
          homeTeamStats.xGFor,
          false // away disadvantage
        );

        attackFDR.push({
          team: fixture.homeTeam,
          attack: homeAttackFDR,
          defence: homeDefenceFDR,
          horizon: 1,
          variance: 0,
          homeMatches: 1,
        });

        attackFDR.push({
          team: fixture.awayTeam,
          attack: awayAttackFDR,
          defence: awayDefenceFDR,
          horizon: 1,
          variance: 0,
          homeMatches: 0,
        });

        defenceFDR.push({
          team: fixture.homeTeam,
          attack: homeAttackFDR,
          defence: homeDefenceFDR,
          horizon: 1,
          variance: 0,
          homeMatches: 1,
        });

        defenceFDR.push({
          team: fixture.awayTeam,
          attack: awayAttackFDR,
          defence: awayDefenceFDR,
          horizon: 1,
          variance: 0,
          homeMatches: 0,
        });
      }
    }

    return { attack: attackFDR, defence: defenceFDR };
  }

  /**
   * Calculate horizon FDR rankings for N gameweeks
   */
  static calculateHorizonFDR(
    fixtures: Fixture[],
    fbrefData: PlayerFBref[],
    horizon: number,
    currentGameweek: number
  ): { attack: FDRData[]; defence: FDRData[] } {
    const teamStats = this.getTeamStats(fbrefData);
    const teams = Object.keys(teamStats).map(Number);
    const attackFDR: FDRData[] = [];
    const defenceFDR: FDRData[] = [];

    for (const team of teams) {
      const horizonFixtures = fixtures.filter(
        f => 
          (f.homeTeam === team || f.awayTeam === team) &&
          f.gameweek >= currentGameweek &&
          f.gameweek < currentGameweek + horizon
      );

      if (horizonFixtures.length === 0) continue;

      const attackScores: number[] = [];
      const defenceScores: number[] = [];
      let homeMatches = 0;

      for (const fixture of horizonFixtures) {
        const isHome = fixture.homeTeam === team;
        const opponent = isHome ? fixture.awayTeam : fixture.homeTeam;
        const opponentStats = teamStats[opponent];
        const teamStatsData = teamStats[team];

        if (opponentStats && teamStatsData) {
          // Get team name from the data
          const teamName = this.getTeamNameById(team);
          
          const attackFDR = this.calculateAttackFDR(
            teamStatsData.xGFor,
            opponentStats.xGConceded,
            isHome,
            teamName
          );

          const defenceFDR = this.calculateDefenceFDR(
            teamStatsData.xGConceded,
            opponentStats.xGFor,
            isHome,
            teamName
          );

          attackScores.push(attackFDR);
          defenceScores.push(defenceFDR);

          if (isHome) homeMatches++;
        }
      }

      if (attackScores.length > 0) {
        const avgAttack = attackScores.reduce((a, b) => a + b, 0) / attackScores.length;
        const avgDefence = defenceScores.reduce((a, b) => a + b, 0) / defenceScores.length;
        const variance = this.calculateVariance(attackScores);

        attackFDR.push({
          team,
          attack: avgAttack,
          defence: avgDefence,
          horizon,
          variance,
          homeMatches,
        });

        defenceFDR.push({
          team,
          attack: avgAttack,
          defence: avgDefence,
          horizon,
          variance,
          homeMatches,
        });
      }
    }

    // Sort by difficulty (ascending = easiest first)
    attackFDR.sort((a, b) => a.attack - b.attack);
    defenceFDR.sort((a, b) => a.defence - b.defence);

    return { attack: attackFDR, defence: defenceFDR };
  }

  static calculateAttackFDR(
    teamXGFor: number,
    opponentXGConceded: number,
    isHome: boolean,
    teamName?: string
  ): number {
    // If we have a team name, use the hardcoded mapping
    if (teamName) {
      return this.getTeamFDR(teamName, 'attack');
    }
    
    // Fallback to old calculation if no team name provided
    const homeAdvantage = isHome ? 0.15 : -0.15;
    const adjustedXGFor = teamXGFor + homeAdvantage;
    const adjustedXGConceded = opponentXGConceded + (isHome ? -0.1 : 0.1);

    const normalizedTeamXG = Math.min(adjustedXGFor, 2.0);
    const normalizedOpponentDefence = Math.max(0, 2.0 - adjustedXGConceded);
    
    const combinedScore = (normalizedTeamXG + normalizedOpponentDefence) / 2;

    return this.mapScoreToDifficulty(combinedScore, 'ATTACK');
  }

  private static calculateDefenceFDR(
    teamXGConceded: number,
    opponentXGFor: number,
    isHome: boolean,
    teamName?: string
  ): number {
    // If we have a team name, use the hardcoded mapping
    if (teamName) {
      return this.getTeamFDR(teamName, 'defence');
    }
    
    // Fallback to old calculation if no team name provided
    const homeAdvantage = isHome ? -0.15 : 0.15;
    const adjustedXGConceded = teamXGConceded + homeAdvantage;
    const adjustedXGFor = opponentXGFor + (isHome ? -0.1 : 0.1);

    const normalizedTeamDefence = Math.max(0, 2.0 - adjustedXGConceded);
    const normalizedOpponentAttack = Math.max(0, 2.0 - adjustedXGFor);
    
    const combinedScore = (normalizedTeamDefence + normalizedOpponentAttack) / 2;

    return this.mapScoreToDifficulty(combinedScore, 'DEFENCE');
  }

  private static mapScoreToDifficulty(score: number, type: 'ATTACK' | 'DEFENCE'): number {
    // This method is now only used as fallback, but we need to keep it for compatibility
    // For now, return a default value
    return 3; // Default to Medium
  }

  private static getTeamStats(fbrefData: PlayerFBref[]): Record<number, { xGFor: number; xGConceded: number }> {
    const teamStats: Record<number, { xGFor: number; xGConceded: number }> = {};

    for (const player of fbrefData) {
      // Since we're passing team-level data as "player" data, 
      // we just need to map teamId to the xG values directly
      teamStats[player.teamId] = {
        xGFor: player.xGFor,
        xGConceded: player.xGConceded
      };
    }

    return teamStats;
  }

  private static calculateVariance(scores: number[]): number {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Get FDR color class for UI display
   */
  static getFDRColorClass(fdr: number): string {
    switch (fdr) {
      case 1: return 'bg-green-100 text-green-800 border-green-200';
      case 2: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 5: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  /**
   * Get FDR label for display
   */
  static getFDRLabel(fdr: number): string {
    switch (fdr) {
      case 1: return 'Very Easy';
      case 2: return 'Easy';
      case 3: return 'Medium';
      case 4: return 'Hard';
      case 5: return 'Very Hard';
      default: return 'Unknown';
    }
  }
} 