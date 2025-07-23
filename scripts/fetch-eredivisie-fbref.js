#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// FBR API configuration
const FBR_API_BASE = 'https://fbrapi.com';
const RATE_LIMIT_DELAY = 3000; // 3 seconds between requests

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API requests
async function makeApiRequest(endpoint, params = {}, apiKey = null, method = 'GET') {
  const url = new URL(endpoint, FBR_API_BASE);
  
  // Add query parameters for GET requests
  if (method === 'GET') {
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
  }

  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  try {
    const options = {
      method,
      headers
    };
    
    // Add body for POST requests
    if (method === 'POST' && Object.keys(params).length > 0) {
      options.body = JSON.stringify(params);
    }
    
    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

// Generate API key
async function generateApiKey() {
  console.log('🔑 Generating FBR API key...');
  const response = await makeApiRequest('/generate_api_key', {}, null, 'POST');
  return response.api_key;
}

// Get Netherlands country code
async function getNetherlandsCountryCode(apiKey) {
  console.log('🌍 Getting Netherlands country code...');
  const countriesResponse = await makeApiRequest('/countries', {}, apiKey);
  const netherlands = countriesResponse.data.find(country => 
    country.country.toLowerCase().includes('netherlands')
  );
  
  if (!netherlands) {
    throw new Error('Netherlands not found');
  }
  
  console.log(`✅ Found Netherlands: ${netherlands.country} (${netherlands.country_code})`);
  return netherlands.country_code;
}

// Get Eredivisie league ID
async function getEredivisieLeagueId(apiKey, countryCode) {
  console.log('🏆 Getting Eredivisie league ID...');
  const leaguesResponse = await makeApiRequest('/leagues', { 
    country_code: countryCode 
  }, apiKey);
  
  // Find Eredivisie in the nested structure
  let eredivisie = null;
  for (const category of leaguesResponse.data) {
    if (category.leagues) {
      eredivisie = category.leagues.find(league => 
        league.competition_name?.toLowerCase().includes('eredivisie') &&
        league.gender === 'M' // We want the men's league
      );
      if (eredivisie) break;
    }
  }
  
  if (!eredivisie) {
    throw new Error('Eredivisie not found');
  }
  
  console.log(`✅ Found Eredivisie: ${eredivisie.competition_name} (ID: ${eredivisie.league_id})`);
  return eredivisie.league_id;
}

// Get available seasons for Eredivisie
async function getAvailableSeasons(apiKey, leagueId) {
  console.log('📅 Getting available seasons for Eredivisie...');
  const response = await makeApiRequest('/league-seasons', {
    league_id: leagueId
  }, apiKey);
  
  console.log(`✅ Found ${response.data?.length || 0} seasons`);
  if (response.data) {
    response.data.forEach(season => {
      console.log(`- ${season.season_id}: ${season.league_start} to ${season.league_end} (Advanced stats: ${season.has_adv_stats})`);
    });
  }
  
  return response.data;
}

// Get league standings for Eredivisie (this includes xG and xGA data)
async function getLeagueStandings(apiKey, leagueId, seasonId) {
  console.log(`📊 Getting league standings for Eredivisie ${seasonId}...`);
  const response = await makeApiRequest('/league-standings', {
    league_id: leagueId,
    season_id: seasonId
  }, apiKey);
  
  console.log(`✅ Retrieved standings for ${response.data?.length || 0} teams`);
  return response.data;
}

// Process standings data and create our data structure
function processStandingsData(standingsData, seasonId) {
  console.log('🔄 Processing standings data...');
  
  const processedTeams = {};
  
  // Define promoted teams for 2024-2025 season
  const promotedTeams2024 = [
    'Almere City',
    'Heracles Almelo',
    'Roda JC Kerkrade',
    'Willem II'
  ];
  
  standingsData.forEach(team => {
    const teamName = team.team_name || 'Unknown';
    
    // Check if this is a promoted team
    const isPromoted = promotedTeams2024.some(promotedName => 
      teamName.toLowerCase().includes(promotedName.toLowerCase())
    );
    
    if (isPromoted) {
      // Promoted teams: xG=0, xGC=2
      processedTeams[teamName] = {
        id: team.team_id || 0,
        name: teamName,
        shortName: teamName.split(' ').map(word => word[0]).join('').toUpperCase(),
        xGFor: 0,
        xGConceded: 2.0,
        goalsFor: 0,
        goalsConceded: 0,
        cleanSheets: 0,
        failedToScore: 0,
        homeAdvantage: 0.15,
        awayDisadvantage: -0.10,
        promoted: true,
        rank: team.rk || 0,
        matchesPlayed: team.mp || 0,
        wins: team.w || 0,
        draws: team.d || 0,
        losses: team.l || 0,
        points: team.pts || 0
      };
    } else {
      // Regular teams: extract from standings data
      const xGFor = team.xg || 0;
      const xGConceded = team.xga || 0;
      const goalsFor = team.gf || 0;
      const goalsConceded = team.ga || 0;
      const matchesPlayed = team.mp || 0;
      
      // Calculate per-game averages
      const xGForPerGame = matchesPlayed > 0 ? xGFor / matchesPlayed : 0;
      const xGConcededPerGame = matchesPlayed > 0 ? xGConceded / matchesPlayed : 0;
      const goalsForPerGame = matchesPlayed > 0 ? goalsFor / matchesPlayed : 0;
      const goalsConcededPerGame = matchesPlayed > 0 ? goalsConceded / matchesPlayed : 0;
      
      processedTeams[teamName] = {
        id: team.team_id || 0,
        name: teamName,
        shortName: teamName.split(' ').map(word => word[0]).join('').toUpperCase(),
        xGFor: parseFloat(xGForPerGame) || 0,
        xGConceded: parseFloat(xGConcededPerGame) || 0,
        goalsFor: parseFloat(goalsForPerGame) || 0,
        goalsConceded: parseFloat(goalsConcededPerGame) || 0,
        cleanSheets: 0, // Not available in standings
        failedToScore: 0, // Not available in standings
        homeAdvantage: 0.15,
        awayDisadvantage: -0.10,
        promoted: false,
        rank: team.rk || 0,
        matchesPlayed: matchesPlayed,
        wins: team.w || 0,
        draws: team.d || 0,
        losses: team.l || 0,
        points: team.pts || 0,
        totalXG: parseFloat(xGFor) || 0,
        totalXGA: parseFloat(xGConceded) || 0
      };
    }
  });
  
  console.log(`✅ Processed ${Object.keys(processedTeams).length} teams`);
  return processedTeams;
}

// Save data to file
function saveTeamStats(processedTeams, seasonId) {
  const outputPath = path.join(__dirname, '..', 'data', 'internal', 'team-stats-2024-25-fbref.json');
  
  const outputData = {
    season: seasonId,
    lastUpdated: new Date().toISOString(),
    dataSource: "FBref via FBR API (League Standings)",
    teams: processedTeams,
    metadata: {
      totalTeams: Object.keys(processedTeams).length,
      promotedTeams: Object.values(processedTeams).filter(team => team.promoted).length,
      relegatedTeams: 0, // Will need to determine
      averageXGFor: Object.values(processedTeams).reduce((sum, team) => sum + team.xGFor, 0) / Object.keys(processedTeams).length,
      averageXGConceded: Object.values(processedTeams).reduce((sum, team) => sum + team.xGConceded, 0) / Object.keys(processedTeams).length,
      notes: [
        "Data sourced from FBref via FBR API League Standings endpoint",
        "xG and xGC values are per game averages calculated from total season values",
        "Promoted teams have xG=0 and xGC=2 as placeholder values",
        "Home/away advantages are estimated based on historical data",
        "Clean sheets and failed to score stats not available in standings data"
      ]
    }
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`✅ Team stats saved to: ${outputPath}`);
  
  return outputPath;
}

// Main execution function
async function main() {
  console.log('🚀 Starting Eredivisie data fetch from FBR API...\n');
  
  try {
    // Step 1: Generate API key
    const apiKey = await generateApiKey();
    await delay(RATE_LIMIT_DELAY);
    
    // Step 2: Get Netherlands country code
    const countryCode = await getNetherlandsCountryCode(apiKey);
    await delay(RATE_LIMIT_DELAY);
    
    // Step 3: Get Eredivisie league ID
    const leagueId = await getEredivisieLeagueId(apiKey, countryCode);
    await delay(RATE_LIMIT_DELAY);
    
    // Step 4: Get available seasons
    const availableSeasons = await getAvailableSeasons(apiKey, leagueId);
    await delay(RATE_LIMIT_DELAY);
    
    // Step 5: Get league standings (without season_id to get most recent)
    console.log('📊 Getting league standings for most recent season...');
    const standingsData = await getLeagueStandings(apiKey, leagueId);
    
    // Determine the season from the data or use 2024-2025 as default
    const seasonId = '2024-2025'; // We'll assume this is the most recent
    
    // Step 6: Process the data
    const processedTeams = processStandingsData(standingsData, seasonId);
    
    // Step 7: Save to file
    const outputPath = saveTeamStats(processedTeams, seasonId);
    
    console.log('\n🎉 Successfully fetched and processed Eredivisie team stats!');
    console.log(`📁 Data saved to: ${outputPath}`);
    
    // Display summary
    console.log('\n📋 Summary:');
    console.log(`- Total teams: ${Object.keys(processedTeams).length}`);
    console.log(`- Promoted teams: ${Object.values(processedTeams).filter(team => team.promoted).length}`);
    console.log(`- Average xG For: ${(Object.values(processedTeams).reduce((sum, team) => sum + team.xGFor, 0) / Object.keys(processedTeams).length).toFixed(2)}`);
    console.log(`- Average xG Conceded: ${(Object.values(processedTeams).reduce((sum, team) => sum + team.xGConceded, 0) / Object.keys(processedTeams).length).toFixed(2)}`);
    
    // Show top 3 teams by xG For (excluding promoted teams)
    const regularTeams = Object.values(processedTeams).filter(team => !team.promoted);
    const topScoringTeams = regularTeams
      .sort((a, b) => b.xGFor - a.xGFor)
      .slice(0, 3);
    
    console.log('\n🏆 Top 3 teams by xG For (excluding promoted):');
    topScoringTeams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}: ${team.xGFor.toFixed(2)} xG (Rank: ${team.rank})`);
    });
    
    // Show promoted teams
    const promotedTeams = Object.values(processedTeams).filter(team => team.promoted);
    if (promotedTeams.length > 0) {
      console.log('\n⬆️ Promoted teams (xG=0, xGC=2):');
      promotedTeams.forEach(team => {
        console.log(`- ${team.name}`);
      });
    }
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  generateApiKey,
  getNetherlandsCountryCode,
  getEredivisieLeagueId,
  getAvailableSeasons,
  getLeagueStandings,
  processStandingsData,
  saveTeamStats
}; 