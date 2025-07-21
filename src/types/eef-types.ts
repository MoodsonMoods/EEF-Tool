
export interface Team {
  id: number;
  name: string;
  shortName: string;
  code: number;
  position: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
  points: number;
  form: string | null;
  strength: number | null;
  unavailable: boolean;
}


export interface Player {
  id: number;
  code: number;
  firstName: string;
  secondName: string;
  webName: string;
  elementType: number;
  team: {
    id: number;
    name: string;
    shortName: string;
    code: number;
  };
  nowCost: number;
  totalPoints: number;
  eventPoints: number;
  pointsPerGame: number;
  form: number;
  selectedByPercent: number;
  transfersIn: number;
  transfersOut: number;
  transfersInEvent: number;
  transfersOutEvent: number;
  valueForm: number;
  valueSeason: number;
  epNext: number;
  epThis: number | null;
  status: string;
  canSelect: boolean;
  canTransact: boolean;
  news: string;
  newsAdded: string | null;
  chanceOfPlayingNextRound: number | null;
  chanceOfPlayingThisRound: number | null;
  removed: boolean;
  special: boolean;
  inDreamteam: boolean;
  dreamteamCount: number;
  photo: string;
  // Stats
  minutes: number;
  goalsScored: number;
  assists: number;
  cleanSheets: number;
  goalsConceded: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  ownGoals: number;
  bonus: number;
}


export interface ElementType {
  id: number;
  singularName: string;
  singularNameShort: string;
  pluralName: string;
  pluralNameShort: string;
  squadSelect: number;
  squadMinSelect: number | null;
  squadMaxSelect: number | null;
  squadMinPlay: number;
  squadMaxPlay: number;
  elementCount: number;
}


export interface Event {
  id: number;
  name: string;
  deadlineTime: string;
  deadlineTimeEpoch: number;
  averageEntryScore: number;
  finished: boolean;
  dataChecked: boolean;
  highestScoringEntry: number | null;
  highestScore: number | null;
  isPrevious: boolean;
  isCurrent: boolean;
  isNext: boolean;
  canEnter: boolean;
  canManage: boolean;
  released: boolean;
  rankedCount: number;
  transfersMade: number;
  mostSelected: number | null;
  mostTransferredIn: number | null;
  topElement: number | null;
  mostCaptained: number | null;
  mostViceCaptained: number | null;
}


export interface GameSettings {
  leagueJoinPrivateMax: number;
  leagueJoinPublicMax: number;
  leagueMaxSizePublicClassic: number;
  leagueMaxSizePublicH2h: number;
  leagueMaxSizePrivateH2h: number;
  leaguePrefixPublic: string;
  leaguePointsH2hWin: number;
  leaguePointsH2hLose: number;
  leaguePointsH2hDraw: number;
  elementSellAtPurchasePrice: boolean;
  squadSquadplay: number;
  squadSquadsize: number;
  squadTeamLimit: number;
  squadTotalSpend: number;
  uiCurrencyMultiplier: number;
  statsFormDays: number;
  sysViceCaptainEnabled: boolean;
  transfersCap: number;
  transfersSellOnFee: number;
  maxExtraFreeTransfers: number;
  timezone: string;
}


export interface ScoringRules {
  shortPlay: number;
  longPlay: number;
  goalsScored: Record<string, number>;
  assists: number;
  cleanSheets: Record<string, number>;
  penaltiesMissed: number;
  goalsConceded: Record<string, number>;
  yellowCards: number;
  redCards: number;
  saves: number;
  penaltiesSaved: number;
  ownGoals: number;
  bonus: number;
}


export interface Chip {
  id: number;
  name: string;
  number: number;
  startEvent: number;
  stopEvent: number;
  chipType: string;
  overrides: {
    rules: Record<string, any>;
    scoring: Record<string, any>;
    elementTypes: any[];
    pickMultiplier: number | null;
  };
}


export interface Phase {
  id: number;
  name: string;
  startEvent: number;
  stopEvent: number;
  highestScore: number | null;
}


export interface NormalizedData {
  teams: Team[];
  players: Player[];
  elementTypes: ElementType[];
  events: Event[];
  gameSettings: GameSettings;
  scoringRules: ScoringRules;
  chips: Chip[];
  phases: Phase[];
}


export interface ApiResponse<T> {
  data: T;
  success: boolean;
  timestamp: string;
  version: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PlayersResponse extends ApiResponse<Player[]> {}
export interface TeamsResponse extends ApiResponse<Team[]> {}

export interface FixturesResponse extends ApiResponse<any[]> {} // Will be properly typed once we know the fixture structure
export interface EventsResponse extends ApiResponse<Event[]> {}
export interface GameSettingsResponse extends ApiResponse<GameSettings> {}
export interface ScoringRulesResponse extends ApiResponse<ScoringRules> {}
export interface NormalizedDataResponse extends ApiResponse<NormalizedData> {}


export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export type PlayerStatus = 'a' | 'i' | 'n' | 's' | 'u';

export interface PlayerFilters {
  position?: Position;
  team?: number;
  minPrice?: number;
  maxPrice?: number;
  minPoints?: number;
  maxPoints?: number;
  search?: string;
}

export interface PlayerSort {
  field: keyof Player;
  direction: 'asc' | 'desc';
}

export interface Formation {
  gk: number;
  def: number;
  mid: number;
  fwd: number;
}

export interface SquadPlayer {
  player: Player;
  position: Position;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isSubstitute: boolean;
  substituteOrder?: number;
}

// Planner-related types
export interface SquadSlot {
  playerId: number;
  position: Position;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isOnBench: boolean;
  benchOrder?: number;
}

export interface FormationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SquadScenario {
  id: string;
  name: string;
  description?: string;
  formation: Formation;
  startingXI: SquadSlot[];
  bench: SquadSlot[];
  budget: number;
  transferCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PreferencesState {
  language: 'en' | 'nl';
  theme: 'light' | 'dark';
  autoSave: boolean;
}

export interface ScenariosState {
  scenarios: SquadScenario[];
  activeScenarioId: string | null;
}

export interface PlannerState {
  currentFormation: Formation;
  selectedPlayers: SquadSlot[];
  availableBudget: number;
  transferCount: number;
  currentGameweek: number;
}
