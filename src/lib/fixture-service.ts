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

  static async initialize() {
    if (this.initialized) return;
    
    try {
      // Fetch real fixture data from API
      const [fixturesResponse, teamsResponse, eventsResponse] = await Promise.all([
        fetch('/api/fixtures/'),
        fetch('/api/teams/'),
        fetch('/api/events/')
      ]);
      
      const fixturesData = await fixturesResponse.json();
      const teamsData = await teamsResponse.json();
      const eventsData = await eventsResponse.json();

      if (fixturesData.success && teamsData.success && eventsData.success) {
        this.fixtures = this.parseFixtures(fixturesData.data, teamsData.data, eventsData.data);
        this.teams = teamsData.data;
        this.events = eventsData.data;
        this.initialized = true;
        console.log(`FixtureService initialized with ${this.fixtures.length} real fixtures`);
        console.log('Sample parsed fixtures:', this.fixtures.slice(0, 3));
        console.log('Teams loaded:', this.teams.length);
        console.log('Events loaded:', this.events.length);
      } else {
        console.warn('Failed to fetch real fixture data, falling back to mock fixtures');
        this.generateMockFixtures(teamsData.data || [], eventsData.data || []);
      }
    } catch (error) {
      console.error('Failed to initialize FixtureService with real data:', error);
      // Fall back to mock fixtures if real data is not available
      this.generateMockFixtures([], []);
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

  private static generateMockFixtures(teams: Team[], events: Event[]) {
    // Fallback to mock fixtures if real data is not available
    this.fixtures = this.generateFixtures(teams, events);
    this.teams = teams;
    this.events = events;
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

  static getCurrentFixtureForPlayer(playerTeamId: number, currentGameweek: number): PlayerFixture | null {
    const fixture = this.getCurrentFixtureForTeam(playerTeamId, currentGameweek);
    if (!fixture) return null;

    const isHome = fixture.homeTeam === playerTeamId;
    const opponent = isHome ? fixture.awayTeamName : fixture.homeTeamName;
    
    // Mock difficulty calculation (in a real app, this would use FDR data)
    const difficulty = this.calculateFixtureDifficulty(playerTeamId, fixture);
    
    return {
      gameweek: fixture.gameweek,
      opponent,
      isHome,
      kickoffTime: fixture.kickoffTime,
      difficulty,
    };
  }

  private static calculateFixtureDifficulty(teamId: number, fixture: Fixture): PlayerFixture['difficulty'] {
    // Mock difficulty calculation - in reality this would use team strength, form, etc.
    const difficulties: PlayerFixture['difficulty'][] = ['VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'];
    const randomIndex = (teamId + fixture.gameweek) % difficulties.length;
    return difficulties[randomIndex];
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
    const maxGameweek = Math.max(...this.fixtures.map(f => f.gameweek));
    return maxGameweek;
  }

  static isInitialized(): boolean {
    return this.initialized;
  }
} 