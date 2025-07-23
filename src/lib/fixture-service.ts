import { Team, Event } from '@/types';

export interface Fixture {
  id: number;
  gameweek: number;
  homeTeam: number;
  awayTeam: number;
  homeTeamName: string;
  awayTeamName: string;
  kickoffTime: string;
  finished: boolean;
  homeScore?: number;
  awayScore?: number;
}

export interface PlayerFixture {
  gameweek: number;
  opponent: string;
  isHome: boolean;
  kickoffTime: string;
  difficulty: 'VERY_EASY' | 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
}

export class FixtureService {
  private static fixtures: Fixture[] = [];
  private static teams: Team[] = [];
  private static events: Event[] = [];
  private static initialized = false;
  private static fdrCache: Map<number, { defenceFDR: number; attackFDR: number }> = new Map();

  static async initialize() {
    if (this.initialized) return;
    
    try {
      // Fetch real fixture data from API
      const [fixturesResponse, eventsResponse] = await Promise.all([
        fetch('/api/fixtures/'),
        fetch('/api/events/')
      ]);
      
      const fixturesData = await fixturesResponse.json();
      const eventsData = await eventsResponse.json();

      // Load teams data from internal file to match fixture team IDs
      const teamsData = await this.loadInternalTeamsData();

      if (fixturesData.success && eventsData.success && teamsData) {
        this.fixtures = this.parseFixtures(fixturesData.data, teamsData, eventsData.data);
        this.teams = teamsData;
        this.events = eventsData.data;
        
        // Try to pre-load FDR data, but don't fail if it doesn't work
        try {
          await this.preloadFDRData();
        } catch (error) {
          console.warn('Failed to preload FDR data, continuing without it:', error);
        }
        
        this.initialized = true;
        console.log(`FixtureService initialized with ${this.fixtures.length} real fixtures`);
        console.log('Sample parsed fixtures:', this.fixtures.slice(0, 3));
        console.log('Teams loaded:', this.teams.length);
        console.log('Events loaded:', this.events.length);
      } else {
        console.warn('Failed to fetch real fixture data, falling back to mock fixtures');
        await this.generateMockFixtures(teamsData || [], eventsData.data || []);
      }
    } catch (error) {
      console.error('Failed to initialize FixtureService with real data:', error);
      // Fall back to mock fixtures if real data is not available
      await this.generateMockFixtures([], []);
    }
  }

  private static async loadInternalTeamsData(): Promise<any[]> {
    try {
      const response = await fetch('/api/teams/internal/');
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Failed to load internal teams data:', error);
      return [];
    }
  }

  private static async preloadFDRData(): Promise<void> {
    try {
      console.log('Pre-loading FDR data for all teams...');
      
      // Get unique team IDs from fixtures
      const teamIds = new Set<number>();
      this.fixtures.forEach(fixture => {
        teamIds.add(fixture.homeTeam);
        teamIds.add(fixture.awayTeam);
      });

      // Fetch FDR data for all teams in parallel, but don't fail if some fail
      const fdrPromises = Array.from(teamIds).map(async (teamId) => {
        try {
          const response = await fetch(`/api/fdr/team/${teamId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              this.fdrCache.set(teamId, {
                defenceFDR: data.data.defenceFDR,
                attackFDR: data.data.attackFDR
              });
            }
          }
        } catch (error) {
          // Silently ignore errors for teams without FDR data
        }
      });

      await Promise.all(fdrPromises);
      console.log(`FDR cache populated with ${this.fdrCache.size} teams`);
    } catch (error) {
      console.error('Error pre-loading FDR data:', error);
    }
  }

  private static parseFixtures(fixturesData: any[], teams: Team[], events: Event[]): Fixture[] {
    // Parse the real ESPN EEF API fixture data structure
    return fixturesData.map((fixture: any) => ({
      id: fixture.id,
      gameweek: fixture.event,
      homeTeam: fixture.teamH,
      awayTeam: fixture.teamA,
      homeTeamName: this.getTeamName(fixture.teamH, teams),
      awayTeamName: this.getTeamName(fixture.teamA, teams),
      kickoffTime: fixture.kickoffTime,
      finished: fixture.finished,
      homeScore: fixture.teamHScore,
      awayScore: fixture.teamAScore
    }));
  }

  private static getTeamName(teamId: number, teams: Team[]): string {
    const team = teams.find(t => t.id === teamId);
    return team?.name || `Team ${teamId}`;
  }

  private static async generateMockFixtures(teams: Team[], events: Event[]) {
    // Fallback to mock fixtures if real data is not available
    this.fixtures = this.generateFixtures(teams, events);
    this.teams = teams;
    this.events = events;
    
    // Pre-load FDR data even for mock fixtures
    await this.preloadFDRData();
    
    this.initialized = true;
    console.log(`FixtureService initialized with ${this.fixtures.length} mock fixtures`);
  }

  private static generateFixtures(teams: Team[], events: Event[]): Fixture[] {
    const fixtures: Fixture[] = [];
    let fixtureId = 1;

    // Generate fixtures for each gameweek
    events.forEach(event => {
      const gameweek = event.id;
      
      // Create a round-robin schedule (simplified)
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const homeTeam = teams[i];
          const awayTeam = teams[j];
          
          // Alternate home/away for variety
          const isHome = (i + j + gameweek) % 2 === 0;
          
          fixtures.push({
            id: fixtureId++,
            gameweek,
            homeTeam: isHome ? homeTeam.id : awayTeam.id,
            awayTeam: isHome ? awayTeam.id : homeTeam.id,
            homeTeamName: isHome ? homeTeam.name : awayTeam.name,
            awayTeamName: isHome ? awayTeam.name : homeTeam.name,
            kickoffTime: this.generateKickoffTime(event.deadlineTime, i, j),
            finished: event.finished,
          });
        }
      }
    });

    return fixtures;
  }

  private static generateKickoffTime(deadlineTime: string, team1Index: number, team2Index: number): string {
    const deadline = new Date(deadlineTime);
    const kickoffOffset = (team1Index + team2Index) % 7; // Spread games across the weekend
    const kickoff = new Date(deadline);
    kickoff.setDate(kickoff.getDate() - 1 + kickoffOffset);
    kickoff.setHours(14 + (kickoffOffset % 3), 0, 0, 0); // 14:00, 15:00, or 16:00
    
    return kickoff.toISOString();
  }

  static getFixturesForGameweek(gameweek: number): Fixture[] {
    return this.fixtures.filter(f => f.gameweek === gameweek);
  }

  static getCurrentFixtureForTeam(teamId: number, currentGameweek: number): Fixture | null {
    return this.fixtures.find(f => 
      (f.homeTeam === teamId || f.awayTeam === teamId) && 
      f.gameweek === currentGameweek
    ) || null;
  }

  static async getCurrentFixtureForPlayer(playerTeamId: number, currentGameweek: number, position?: 'GK' | 'DEF' | 'MID' | 'FWD'): Promise<PlayerFixture | null> {
    const fixture = this.getCurrentFixtureForTeam(playerTeamId, currentGameweek);
    if (!fixture) return null;

    const isHome = fixture.homeTeam === playerTeamId;
    const opponent = isHome ? fixture.awayTeamName : fixture.homeTeamName;
    
    // Get real FDR-based difficulty calculation based on position
    const difficulty = await this.calculateFixtureDifficulty(playerTeamId, fixture, position);
    
    return {
      gameweek: fixture.gameweek,
      opponent,
      isHome,
      kickoffTime: fixture.kickoffTime,
      difficulty,
    };
  }

  // Synchronous version for when FDR data is cached
  static getCurrentFixtureForPlayerSync(playerTeamId: number, currentGameweek: number, position?: 'GK' | 'DEF' | 'MID' | 'FWD'): PlayerFixture | null {
    const fixture = this.getCurrentFixtureForTeam(playerTeamId, currentGameweek);
    if (!fixture) return null;

    const isHome = fixture.homeTeam === playerTeamId;
    const opponent = isHome ? fixture.awayTeamName : fixture.homeTeamName;
    
    // Get difficulty from cache if available
    const difficulty = this.getCachedFixtureDifficulty(playerTeamId, fixture, position);
    
    return {
      gameweek: fixture.gameweek,
      opponent,
      isHome,
      kickoffTime: fixture.kickoffTime,
      difficulty,
    };
  }

  private static getCachedFixtureDifficulty(teamId: number, fixture: Fixture, position?: 'GK' | 'DEF' | 'MID' | 'FWD'): PlayerFixture['difficulty'] {
    const opponentTeamId = fixture.homeTeam === teamId ? fixture.awayTeam : fixture.homeTeam;
    const cachedFDR = this.fdrCache.get(opponentTeamId);
    
    if (cachedFDR) {
      let fdrNumber: number;
      
      if (position === 'GK' || position === 'DEF') {
        fdrNumber = cachedFDR.defenceFDR;
      } else {
        fdrNumber = cachedFDR.attackFDR;
      }
      
      return this.fdrToDifficulty(fdrNumber);
    }
    
    // Fallback to mock difficulty if not cached
    return this.getMockDifficulty(teamId, fixture);
  }

  private static async calculateFixtureDifficulty(teamId: number, fixture: Fixture, position?: 'GK' | 'DEF' | 'MID' | 'FWD'): Promise<PlayerFixture['difficulty']> {
    try {
      // Get opponent team ID
      const opponentTeamId = fixture.homeTeam === teamId ? fixture.awayTeam : fixture.homeTeam;
      
      // Check if FDR data is cached
      const cachedFDR = this.fdrCache.get(opponentTeamId);
      
      if (cachedFDR) {
        // Use cached FDR data
        let fdrNumber: number;
        
        if (position === 'GK' || position === 'DEF') {
          // Use defence FDR for goalkeepers and defenders
          fdrNumber = cachedFDR.defenceFDR;
        } else {
          // Use attack FDR for midfielders and forwards
          fdrNumber = cachedFDR.attackFDR;
        }
        
        return this.fdrToDifficulty(fdrNumber);
      }
      
      // Fallback: try to fetch FDR data if not cached
      const response = await fetch(`/api/fdr/team/${opponentTeamId}`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch FDR data for team ${opponentTeamId}, falling back to mock difficulty`);
        return this.getMockDifficulty(teamId, fixture);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data) {
        console.warn(`Invalid FDR data for team ${opponentTeamId}, falling back to mock difficulty`);
        return this.getMockDifficulty(teamId, fixture);
      }
      
      // Cache the FDR data for future use
      this.fdrCache.set(opponentTeamId, {
        defenceFDR: data.data.defenceFDR,
        attackFDR: data.data.attackFDR
      });
      
      // Convert FDR number to difficulty string based on position
      let fdrNumber: number;
      
      if (position === 'GK' || position === 'DEF') {
        // Use defence FDR for goalkeepers and defenders
        fdrNumber = data.data.defenceFDR;
      } else {
        // Use attack FDR for midfielders and forwards
        fdrNumber = data.data.attackFDR;
      }
      
      return this.fdrToDifficulty(fdrNumber);
      
    } catch (error) {
      console.error('Error calculating fixture difficulty with FDR:', error);
      return this.getMockDifficulty(teamId, fixture);
    }
  }

  private static getMockDifficulty(teamId: number, fixture: Fixture): PlayerFixture['difficulty'] {
    // Fallback mock difficulty calculation
    const difficulties: PlayerFixture['difficulty'][] = ['VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'];
    const randomIndex = (teamId + fixture.gameweek) % difficulties.length;
    return difficulties[randomIndex];
  }

  private static fdrToDifficulty(fdrNumber: number): PlayerFixture['difficulty'] {
    switch (fdrNumber) {
      case 1: return 'VERY_EASY';
      case 2: return 'EASY';
      case 3: return 'MEDIUM';
      case 4: return 'HARD';
      case 5: return 'VERY_HARD';
      default: return 'MEDIUM';
    }
  }

  static getCurrentGameweek(): number {
    // Find the current gameweek by looking for the event marked as "isNext"
    const nextEvent = this.events.find(event => event.isNext);
    
    if (nextEvent) {
      return nextEvent.id;
    }
    
    // Fallback: Find the current event
    const currentEvent = this.events.find(event => event.isCurrent);
    
    if (currentEvent) {
      return currentEvent.id;
    }
    
    // If no current/next event found, return the first event
    return this.events[0]?.id || 1;
  }

  static getTotalGameweeks(): number {
    // Always fall back to events length if fixtures are not available
    if (this.fixtures.length === 0 || !this.initialized) {
      return this.events.length;
    }
    const maxGameweek = Math.max(...this.fixtures.map(f => f.gameweek));
    return maxGameweek || this.events.length;
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  static clearFDRCache(): void {
    this.fdrCache.clear();
    console.log('FDR cache cleared');
  }

  static getFDRCacheSize(): number {
    return this.fdrCache.size;
  }
} 