#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const INTERNAL_DIR = path.join(__dirname, '..', 'data', 'internal');
const TYPES_DIR = path.join(__dirname, '..', 'src', 'types');

// Create types directory if it doesn't exist
function ensureTypesDirectory() {
  if (!fs.existsSync(TYPES_DIR)) {
    fs.mkdirSync(TYPES_DIR, { recursive: true });
  }
}

// Load normalized data
function loadNormalizedData() {
  const normalizedDataPath = path.join(INTERNAL_DIR, 'normalized-data.json');
  
  if (!fs.existsSync(normalizedDataPath)) {
    throw new Error('normalized-data.json not found. Run normalize first.');
  }
  
  return JSON.parse(fs.readFileSync(normalizedDataPath, 'utf8'));
}

// Generate TypeScript types
function generateTypes(normalizedData) {
  const types = [];

  // Team type
  types.push(`
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
`);

  // Player type
  types.push(`
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
`);

  // Element Type (Position) type
  types.push(`
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
`);

  // Event (Gameweek) type
  types.push(`
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
`);

  // Game Settings type
  types.push(`
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
`);

  // Scoring Rules type
  types.push(`
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
`);

  // Chip type
  types.push(`
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
`);

  // Phase type
  types.push(`
export interface Phase {
  id: number;
  name: string;
  startEvent: number;
  stopEvent: number;
  highestScore: number | null;
}
`);

  // Normalized Data type
  types.push(`
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
`);

  // API Response types
  types.push(`
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
export interface FixturesResponse extends ApiResponse<any[]> {}
export interface EventsResponse extends ApiResponse<Event[]> {}
export interface GameSettingsResponse extends ApiResponse<GameSettings> {}
export interface ScoringRulesResponse extends ApiResponse<ScoringRules> {}
export interface NormalizedDataResponse extends ApiResponse<NormalizedData> {}
`);

  // Utility types
  types.push(`
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

export interface SquadSlot {
  playerId: number;
  position: Position;
  isOnBench: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
  benchOrder?: number;
}

export interface FormationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PreferencesState {
  language: 'en' | 'nl';
  theme: 'light' | 'dark';
  autoSave: boolean;
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
  freeTransfers: number;
  transferHistory: Array<{ id: string; gameweek: number; playerOut: number; playerIn: number; timestamp: string; cost: number }>;
}
`);

  return types.join('\n');
}

// Generate index file
function generateIndexFile() {
  return `// Auto-generated types from normalized data
// Generated on: ${new Date().toISOString()}

export * from './eef-types';
`;
}

// Main function
async function runTypeGeneration() {
  console.log('🔧 Starting TypeScript type generation...');
  console.log(`📁 Types directory: ${TYPES_DIR}`);
  
  try {
    // Ensure types directory exists
    ensureTypesDirectory();
    
    // Load normalized data
    const normalizedData = loadNormalizedData();
    console.log('📊 Loaded normalized data');
    
    // Generate types
    console.log('🔧 Generating TypeScript types...');
    const typesContent = generateTypes(normalizedData);
    
    // Save types file
    const typesFilePath = path.join(TYPES_DIR, 'eef-types.ts');
    fs.writeFileSync(typesFilePath, typesContent);
    console.log(`💾 Saved types to: ${typesFilePath}`);
    
    // Generate index file
    const indexContent = generateIndexFile();
    const indexFilePath = path.join(TYPES_DIR, 'index.ts');
    fs.writeFileSync(indexFilePath, indexContent);
    console.log(`💾 Saved index to: ${indexFilePath}`);
    
    // Summary
    console.log('\n📊 Type Generation Summary:');
    console.log(`✓ Teams: ${normalizedData.teams.length}`);
    console.log(`✓ Players: ${normalizedData.players.length}`);
    console.log(`✓ Element Types: ${normalizedData.elementTypes.length}`);
    console.log(`✓ Events: ${normalizedData.events.length}`);
    console.log(`📁 Types saved to: ${TYPES_DIR}`);
    
    console.log('\n🎉 Type generation completed successfully!');
    
  } catch (error) {
    console.error('💥 Type generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTypeGeneration();
}

module.exports = {
  runTypeGeneration,
  generateTypes
}; 