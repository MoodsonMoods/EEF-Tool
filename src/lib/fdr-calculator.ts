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

  private static readonly XG_THRESHOLDS = {
    ATTACK: {
      VERY_EASY: 2.0, // High xG for
      EASY: 1.5,
      MEDIUM: 1.0,
      HARD: 0.5,
      VERY_HARD: 0.0, // Low xG for
    },
    DEFENCE: {
      VERY_EASY: 0.0, // Low xG conceded
      EASY: 0.5,
      MEDIUM: 1.0,
      HARD: 1.5,
      VERY_HARD: 2.0, // High xG conceded
    },
  };

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
    const teams = Object.keys(teamStats);
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
          const attackFDR = this.calculateAttackFDR(
            teamStatsData.xGFor,
            opponentStats.xGConceded,
            isHome
          );

          const defenceFDR = this.calculateDefenceFDR(
            teamStatsData.xGConceded,
            opponentStats.xGFor,
            isHome
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

  private static calculateAttackFDR(
    teamXGFor: number,
    opponentXGConceded: number,
    isHome: boolean
  ): number {
    const homeAdvantage = isHome ? 0.2 : -0.2;
    const adjustedXGFor = teamXGFor + homeAdvantage;
    const adjustedXGConceded = opponentXGConceded + (isHome ? -0.1 : 0.1);

    // Combine attacking strength and opponent defensive weakness
    const combinedScore = (adjustedXGFor + (2.0 - adjustedXGConceded)) / 2;

    return this.mapScoreToDifficulty(combinedScore, 'ATTACK');
  }

  private static calculateDefenceFDR(
    teamXGConceded: number,
    opponentXGFor: number,
    isHome: boolean
  ): number {
    const homeAdvantage = isHome ? -0.2 : 0.2; // Home teams concede less
    const adjustedXGConceded = teamXGConceded + homeAdvantage;
    const adjustedXGFor = opponentXGFor + (isHome ? -0.1 : 0.1);

    // Combine defensive strength and opponent attacking weakness
    const combinedScore = (2.0 - adjustedXGConceded + (2.0 - adjustedXGFor)) / 2;

    return this.mapScoreToDifficulty(combinedScore, 'DEFENCE');
  }

  private static mapScoreToDifficulty(score: number, type: 'ATTACK' | 'DEFENCE'): number {
    const thresholds = this.XG_THRESHOLDS[type];

    if (score >= thresholds.VERY_EASY) return this.DIFFICULTY_WEIGHTS.VERY_EASY;
    if (score >= thresholds.EASY) return this.DIFFICULTY_WEIGHTS.EASY;
    if (score >= thresholds.MEDIUM) return this.DIFFICULTY_WEIGHTS.MEDIUM;
    if (score >= thresholds.HARD) return this.DIFFICULTY_WEIGHTS.HARD;
    return this.DIFFICULTY_WEIGHTS.VERY_HARD;
  }

  private static getTeamStats(fbrefData: PlayerFBref[]): Record<string, { xGFor: number; xGConceded: number }> {
    const teamStats: Record<string, { xGFor: number; xGConceded: number }> = {};

    for (const player of fbrefData) {
      if (!teamStats[player.team]) {
        teamStats[player.team] = { xGFor: 0, xGConceded: 0 };
      }

      teamStats[player.team].xGFor += player.xGFor;
      teamStats[player.team].xGConceded += player.xGConceded;
    }

    // Normalize by number of players per team
    const playerCounts: Record<string, number> = {};
    for (const player of fbrefData) {
      playerCounts[player.team] = (playerCounts[player.team] || 0) + 1;
    }

    for (const team in teamStats) {
      const count = playerCounts[team] || 1;
      teamStats[team].xGFor /= count;
      teamStats[team].xGConceded /= count;
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