#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const INTERNAL_DIR = path.join(DATA_DIR, 'internal');

// Create directories if they don't exist
function ensureDirectories() {
  const dirs = [DATA_DIR, RAW_DIR, INTERNAL_DIR];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Find the latest raw data directory
function findLatestRawData() {
  if (!fs.existsSync(RAW_DIR)) {
    throw new Error('Raw data directory does not exist. Run ingest first.');
  }
  
  const dateDirs = fs.readdirSync(RAW_DIR)
    .filter(dir => fs.statSync(path.join(RAW_DIR, dir)).isDirectory())
    .sort()
    .reverse();
  
  if (dateDirs.length === 0) {
    throw new Error('No raw data found. Run ingest first.');
  }
  
  const latestDateDir = dateDirs[0];
  const timeDirs = fs.readdirSync(path.join(RAW_DIR, latestDateDir))
    .filter(dir => fs.statSync(path.join(RAW_DIR, latestDateDir, dir)).isDirectory())
    .sort()
    .reverse();
  
  if (timeDirs.length === 0) {
    throw new Error('No raw data found in latest date directory.');
  }
  
  return path.join(RAW_DIR, latestDateDir, timeDirs[0]);
}

// Load raw data
function loadRawData(rawDataDir) {
  const bootstrapStaticPath = path.join(rawDataDir, 'bootstrap-static.json');
  const fixturesPath = path.join(rawDataDir, 'fixtures.json');
  
  if (!fs.existsSync(bootstrapStaticPath)) {
    throw new Error('bootstrap-static.json not found in raw data directory.');
  }
  
  const bootstrapStatic = JSON.parse(fs.readFileSync(bootstrapStaticPath, 'utf8'));
  
  let fixtures = [];
  if (fs.existsSync(fixturesPath)) {
    fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  }
  
  return {
    bootstrapStatic,
    fixtures
  };
}

// Normalize teams data
function normalizeTeams(teams) {
  return teams.map(team => ({
    id: team.id,
    name: team.name,
    shortName: team.short_name,
    code: team.code,
    position: team.position,
    played: team.played,
    win: team.win,
    draw: team.draw,
    loss: team.loss,
    points: team.points,
    form: team.form,
    strength: team.strength,
    unavailable: team.unavailable
  }));
}

// Normalize players data
function normalizePlayers(elements, teams) {
  const teamMap = teams.reduce((map, team) => {
    map[team.id] = team;
    return map;
  }, {});
  
  return elements.map(player => {
    const team = teamMap[player.team];
    
    return {
      id: player.id,
      code: player.code,
      firstName: player.first_name,
      secondName: player.second_name,
      webName: player.web_name,
      elementType: player.element_type,
      team: {
        id: team.id,
        name: team.name,
        shortName: team.short_name,
        code: team.code
      },
      nowCost: player.now_cost,
      totalPoints: player.total_points,
      eventPoints: player.event_points,
      pointsPerGame: parseFloat(player.points_per_game) || 0,
      form: parseFloat(player.form) || 0,
      selectedByPercent: parseFloat(player.selected_by_percent) || 0,
      transfersIn: player.transfers_in,
      transfersOut: player.transfers_out,
      transfersInEvent: player.transfers_in_event,
      transfersOutEvent: player.transfers_out_event,
      valueForm: parseFloat(player.value_form) || 0,
      valueSeason: parseFloat(player.value_season) || 0,
      epNext: parseFloat(player.ep_next) || 0,
      epThis: player.ep_this ? parseFloat(player.ep_this) : null,
      status: player.status,
      canSelect: player.can_select,
      canTransact: player.can_transact,
      news: player.news,
      newsAdded: player.news_added,
      chanceOfPlayingNextRound: player.chance_of_playing_next_round,
      chanceOfPlayingThisRound: player.chance_of_playing_this_round,
      removed: player.removed,
      special: player.special,
      inDreamteam: player.in_dreamteam,
      dreamteamCount: player.dreamteam_count,
      photo: player.photo,
      // Stats
      minutes: player.minutes,
      goalsScored: player.goals_scored,
      assists: player.assists,
      cleanSheets: player.clean_sheets,
      goalsConceded: player.goals_conceded,
      penaltiesSaved: player.penalties_saved,
      penaltiesMissed: player.penalties_missed,
      yellowCards: player.yellow_cards,
      redCards: player.red_cards,
      saves: player.saves,
      ownGoals: player.own_goals,
      bonus: player.bonus
    };
  });
}

// Normalize element types (positions)
function normalizeElementTypes(elementTypes) {
  return elementTypes.map(type => ({
    id: type.id,
    singularName: type.singular_name,
    singularNameShort: type.singular_name_short,
    pluralName: type.plural_name,
    pluralNameShort: type.plural_name_short,
    squadSelect: type.squad_select,
    squadMinSelect: type.squad_min_select,
    squadMaxSelect: type.squad_max_select,
    squadMinPlay: type.squad_min_play,
    squadMaxPlay: type.squad_max_play,
    elementCount: type.element_count
  }));
}

// Normalize events (gameweeks)
function normalizeEvents(events) {
  return events.map(event => ({
    id: event.id,
    name: event.name,
    deadlineTime: event.deadline_time,
    deadlineTimeEpoch: event.deadline_time_epoch,
    averageEntryScore: event.average_entry_score,
    finished: event.finished,
    dataChecked: event.data_checked,
    highestScoringEntry: event.highest_scoring_entry,
    highestScore: event.highest_score,
    isPrevious: event.is_previous,
    isCurrent: event.is_current,
    isNext: event.is_next,
    canEnter: event.can_enter,
    canManage: event.can_manage,
    released: event.released,
    rankedCount: event.ranked_count,
    transfersMade: event.transfers_made,
    mostSelected: event.most_selected,
    mostTransferredIn: event.most_transferred_in,
    topElement: event.top_element,
    mostCaptained: event.most_captained,
    mostViceCaptained: event.most_vice_captained
  }));
}

// Normalize game settings
function normalizeGameSettings(gameSettings) {
  return {
    leagueJoinPrivateMax: gameSettings.league_join_private_max,
    leagueJoinPublicMax: gameSettings.league_join_public_max,
    leagueMaxSizePublicClassic: gameSettings.league_max_size_public_classic,
    leagueMaxSizePublicH2h: gameSettings.league_max_size_public_h2h,
    leagueMaxSizePrivateH2h: gameSettings.league_max_size_private_h2h,
    leaguePrefixPublic: gameSettings.league_prefix_public,
    leaguePointsH2hWin: gameSettings.league_points_h2h_win,
    leaguePointsH2hLose: gameSettings.league_points_h2h_lose,
    leaguePointsH2hDraw: gameSettings.league_points_h2h_draw,
    elementSellAtPurchasePrice: gameSettings.element_sell_at_purchase_price,
    squadSquadplay: gameSettings.squad_squadplay,
    squadSquadsize: gameSettings.squad_squadsize,
    squadTeamLimit: gameSettings.squad_team_limit,
    squadTotalSpend: gameSettings.squad_total_spend,
    uiCurrencyMultiplier: gameSettings.ui_currency_multiplier,
    statsFormDays: gameSettings.stats_form_days,
    sysViceCaptainEnabled: gameSettings.sys_vice_captain_enabled,
    transfersCap: gameSettings.transfers_cap,
    transfersSellOnFee: gameSettings.transfers_sell_on_fee,
    maxExtraFreeTransfers: gameSettings.max_extra_free_transfers,
    timezone: gameSettings.timezone
  };
}

// Normalize scoring rules
function normalizeScoringRules(scoring) {
  return {
    shortPlay: scoring.short_play,
    longPlay: scoring.long_play,
    goalsScored: scoring.goals_scored,
    assists: scoring.assists,
    cleanSheets: scoring.clean_sheets,
    penaltiesMissed: scoring.penalties_missed,
    goalsConceded: scoring.goals_conceded,
    yellowCards: scoring.yellow_cards,
    redCards: scoring.red_cards,
    saves: scoring.saves,
    penaltiesSaved: scoring.penalties_saved,
    ownGoals: scoring.own_goals,
    bonus: scoring.bonus
  };
}

// Normalize fixtures data
function normalizeFixtures(fixtures) {
  return fixtures.map(fixture => ({
    id: fixture.id,
    code: fixture.code,
    event: fixture.event,
    finished: fixture.finished,
    finishedProvisional: fixture.finished_provisional,
    kickoffTime: fixture.kickoff_time,
    minutes: fixture.minutes,
    provisionalStartTime: fixture.provisional_start_time,
    started: fixture.started,
    teamA: fixture.team_a,
    teamAScore: fixture.team_a_score,
    teamH: fixture.team_h,
    teamHScore: fixture.team_h_score,
    stats: fixture.stats || []
  }));
}

// Generate manifest
function generateManifest(normalizedData, rawDataDir) {
  const manifest = {
    schemaVersion: '1.0.0',
    dataVersion: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    source: {
      rawDataDir: path.basename(rawDataDir),
      rawDataTimestamp: path.basename(path.dirname(rawDataDir)) + '/' + path.basename(rawDataDir)
    },
    counts: {
      players: normalizedData.players.length,
      teams: normalizedData.teams.length,
      events: normalizedData.events.length,
      elementTypes: normalizedData.elementTypes.length
    },
    gameSettings: {
      squadSize: normalizedData.gameSettings.squadSquadsize,
      squadPlay: normalizedData.gameSettings.squadSquadplay,
      totalSpend: normalizedData.gameSettings.squadTotalSpend,
      teamLimit: normalizedData.gameSettings.squadTeamLimit
    }
  };
  
  return manifest;
}

// Main normalization function
async function runNormalization() {
  console.log('🔄 Starting EEF data normalization...');
  console.log(`📁 Internal directory: ${INTERNAL_DIR}`);
  
  try {
    // Ensure directories exist
    ensureDirectories();
    
    // Find latest raw data
    const rawDataDir = findLatestRawData();
    console.log(`📂 Using raw data from: ${rawDataDir}`);
    
    // Load raw data
    const rawData = loadRawData(rawDataDir);
    console.log('📊 Loaded bootstrap-static data');
    
    // Normalize data
    console.log('🔄 Normalizing teams...');
    const teams = normalizeTeams(rawData.bootstrapStatic.teams);
    
    console.log('🔄 Normalizing players...');
    const players = normalizePlayers(rawData.bootstrapStatic.elements, rawData.bootstrapStatic.teams);
    
    console.log('🔄 Normalizing element types...');
    const elementTypes = normalizeElementTypes(rawData.bootstrapStatic.element_types);
    
    console.log('🔄 Normalizing events...');
    const events = normalizeEvents(rawData.bootstrapStatic.events);
    
    console.log('🔄 Normalizing fixtures...');
    const fixtures = normalizeFixtures(rawData.fixtures);
    
    console.log('🔄 Normalizing game settings...');
    const gameSettings = normalizeGameSettings(rawData.bootstrapStatic.game_settings);
    
    console.log('🔄 Normalizing scoring rules...');
    const scoringRules = normalizeScoringRules(rawData.bootstrapStatic.game_config.scoring);
    
    // Create normalized data object
    const normalizedData = {
      teams,
      players,
      elementTypes,
      events,
      fixtures,
      gameSettings,
      scoringRules,
      chips: rawData.bootstrapStatic.chips,
      phases: rawData.bootstrapStatic.phases
    };
    
    // Save normalized data
    console.log('💾 Saving normalized data...');
    
    // Save individual files
    fs.writeFileSync(path.join(INTERNAL_DIR, 'teams.json'), JSON.stringify(teams, null, 2));
    fs.writeFileSync(path.join(INTERNAL_DIR, 'players.json'), JSON.stringify(players, null, 2));
    fs.writeFileSync(path.join(INTERNAL_DIR, 'element-types.json'), JSON.stringify(elementTypes, null, 2));
    fs.writeFileSync(path.join(INTERNAL_DIR, 'events.json'), JSON.stringify(events, null, 2));
    fs.writeFileSync(path.join(INTERNAL_DIR, 'fixtures.json'), JSON.stringify(fixtures, null, 2));
    fs.writeFileSync(path.join(INTERNAL_DIR, 'game-settings.json'), JSON.stringify(gameSettings, null, 2));
    fs.writeFileSync(path.join(INTERNAL_DIR, 'scoring-rules.json'), JSON.stringify(scoringRules, null, 2));
    fs.writeFileSync(path.join(INTERNAL_DIR, 'chips.json'), JSON.stringify(rawData.bootstrapStatic.chips, null, 2));
    fs.writeFileSync(path.join(INTERNAL_DIR, 'phases.json'), JSON.stringify(rawData.bootstrapStatic.phases, null, 2));
    
    // Save complete normalized data
    fs.writeFileSync(path.join(INTERNAL_DIR, 'normalized-data.json'), JSON.stringify(normalizedData, null, 2));
    
    // Generate manifest
    const manifest = generateManifest(normalizedData, rawDataDir);
    fs.writeFileSync(path.join(INTERNAL_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
    
    // Summary
    console.log('\n📊 Normalization Summary:');
    console.log(`✓ Teams: ${teams.length}`);
    console.log(`✓ Players: ${players.length}`);
    console.log(`✓ Element Types: ${elementTypes.length}`);
    console.log(`✓ Events: ${events.length}`);
    console.log(`📁 Data saved to: ${INTERNAL_DIR}`);
    
    console.log('\n🎉 Normalization completed successfully!');
    
  } catch (error) {
    console.error('💥 Normalization failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runNormalization();
}

module.exports = {
  runNormalization,
  normalizeTeams,
  normalizePlayers,
  normalizeElementTypes,
  normalizeEvents,
  normalizeGameSettings,
  normalizeScoringRules
}; 