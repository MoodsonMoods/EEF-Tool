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

  console.log(`Making ${method} request to: ${url.toString()}`);
  
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
    console.error(`Error making ${method} request to ${endpoint}:`, error.message);
    throw error;
  }
}

// Step 1: Generate API key
async function generateApiKey() {
  console.log('🔑 Generating FBR API key...');
  
  try {
    const response = await makeApiRequest('/generate_api_key', {}, null, 'POST');
    const apiKey = response.api_key;
    console.log('✅ API key generated successfully');
    return apiKey;
  } catch (error) {
    console.error('❌ Failed to generate API key:', error.message);
    throw error;
  }
}

// Step 2: Find Eredivisie league ID (uses country_code and nested leagues list)
async function findEredivisieLeagueId(apiKey) {
  console.log('🔍 Finding Eredivisie league ID...');
  
  try {
    // First, get all countries to find Netherlands
    const countriesResponse = await makeApiRequest('/countries', {}, apiKey);
    await delay(RATE_LIMIT_DELAY);
    
    const netherlands = countriesResponse.data.find(country => 
      country.country.toLowerCase().includes('netherlands')
    );
    
    if (!netherlands) {
      throw new Error('Netherlands not found in countries list');
    }
    
    console.log(`✅ Found Netherlands with country code: ${netherlands.country_code}`);
    
    // Get leagues for Netherlands using country_code
    const leaguesResponse = await makeApiRequest('/leagues', { 
      country_code: netherlands.country_code 
    }, apiKey);
    await delay(RATE_LIMIT_DELAY);
    
    // The response can be nested by categories with a leagues array
    let eredivisie = null;
    if (Array.isArray(leaguesResponse.data)) {
      for (const category of leaguesResponse.data) {
        if (category.leagues && Array.isArray(category.leagues)) {
          const found = category.leagues.find(league => 
            (league.competition_name || league.league_name || '').toLowerCase().includes('eredivisie') &&
            (league.gender ? league.gender === 'M' : true)
          );
          if (found) {
            eredivisie = found;
            break;
          }
        }
      }
      // Fallback to flat list if not found in nested
      if (!eredivisie) {
        eredivisie = leaguesResponse.data.find(league => 
          (league.competition_name || league.league_name || '').toLowerCase().includes('eredivisie')
        );
      }
    }
    
    if (!eredivisie) {
      throw new Error('Eredivisie not found in leagues list');
    }
    
    console.log(`✅ Found Eredivisie with league ID: ${eredivisie.league_id}`);
    return eredivisie.league_id;
  } catch (error) {
    console.error('❌ Failed to find Eredivisie league ID:', error.message);
    throw error;
  }
}

// Step 3: Get team season stats for a given season
async function getTeamSeasonStats(apiKey, leagueId, seasonId) {
  console.log(`📊 Fetching team season stats for Eredivisie ${seasonId}...`);
  
  try {
    const response = await makeApiRequest('/team-season-stats', {
      league_id: leagueId,
      season_id: seasonId
    }, apiKey);
    
    console.log(`✅ Retrieved stats for ${response.data.length} teams`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch team season stats:', error.message);
    throw error;
  }
}

// Step 4: Process and save the data
function processTeamStats(teamStats) {
  console.log('🔄 Processing team statistics...');
  
  const processedTeams = {};
  
  teamStats.forEach(team => {
    const rawName = team.meta_data?.team_name || team.team_name || team.team || team.name || '';
    if (typeof rawName !== 'string' || rawName.trim().length === 0) {
      return; // skip malformed entry
    }
    const teamName = rawName.trim();
    
    // Extract xG and xGC from the stats
    // Note: Data is nested under stats.stats for team-season-stats endpoint
    const statRoot = team.stats?.stats || {};
    const xGFor = statRoot.xg_for_per90 ?? statRoot.xg_for ?? statRoot.xg ?? statRoot.npxg_for_per90 ?? statRoot.npxg_for ?? 0;
    const xGConceded = statRoot.xg_against_per90 ?? statRoot.xga ?? statRoot.xg_against ?? 0;
    const goalsFor = statRoot.goals_for_per90 ?? statRoot.goals_for ?? statRoot.gf ?? 0;
    const goalsConceded = statRoot.goals_against_per90 ?? statRoot.goals_against ?? statRoot.ga ?? 0;
    const teamId = team.meta_data?.team_id ?? team.team_id ?? team.id ?? 0;
    
    processedTeams[teamName] = {
      id: teamId,
      name: teamName,
      shortName: teamName.split(' ').map(word => word[0]).join('').toUpperCase(),
      xGFor: parseFloat(xGFor) || 0,
      xGConceded: parseFloat(xGConceded) || 0,
      goalsFor: parseInt(goalsFor) || 0,
      goalsConceded: parseInt(goalsConceded) || 0,
      cleanSheets: 0, // Will need to calculate from match data
      failedToScore: 0, // Will need to calculate from match data
      homeAdvantage: 0.15, // Default values for now
      awayDisadvantage: -0.10,
      promoted: false // Will need to determine from previous season data
    };
  });
  
  console.log(`✅ Processed ${Object.keys(processedTeams).length} teams`);
  return processedTeams;
}

// Step 5: Save data to file
function saveTeamStats(processedTeams, seasonId) {
  // Normalize season string for filename like 2025-26
  const seasonForFile = seasonId.replace('2024-2025', '2024-25').replace('2025-2026', '2025-26');
  const defaultFile = `team-stats-${seasonForFile}-fbref.json`;
  const outputPath = path.join(__dirname, '..', 'data', 'internal', defaultFile);
  
  const outputData = {
    season: seasonId,
    lastUpdated: new Date().toISOString(),
    dataSource: "FBref via FBR API",
    teams: processedTeams,
    metadata: {
      totalTeams: Object.keys(processedTeams).length,
      promotedTeams: 0, // Will need to determine
      relegatedTeams: 0, // Will need to determine
      averageXGFor: Object.values(processedTeams).reduce((sum, team) => sum + team.xGFor, 0) / Object.keys(processedTeams).length,
      averageXGConceded: Object.values(processedTeams).reduce((sum, team) => sum + team.xGConceded, 0) / Object.keys(processedTeams).length,
      notes: [
        "Data sourced from FBref via FBR API",
        "xG and xGC values are per game averages",
        "Home/away advantages are estimated based on historical data",
        "Clean sheets and failed to score stats need to be calculated from match data"
      ]
    }
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`✅ Team stats saved to: ${outputPath}`);
  
  return outputPath;
}

// Main execution function
async function main() {
  // Parse season from CLI args: --season=YYYY-YYYY
  const seasonArg = process.argv.find(arg => arg.startsWith('--season='));
  const seasonId = seasonArg ? seasonArg.split('=')[1] : '2024-2025';
  console.log(`🚀 Starting FBR API data fetch for Eredivisie ${seasonId}...\n`);
  
  try {
    // Step 1: Generate API key
    const apiKey = await generateApiKey();
    await delay(RATE_LIMIT_DELAY);
    
    // Step 2: Find Eredivisie league ID
    const leagueId = await findEredivisieLeagueId(apiKey);
    await delay(RATE_LIMIT_DELAY);
    
    // Step 3: Get team season stats
    const teamStats = await getTeamSeasonStats(apiKey, leagueId, seasonId);
    if (Array.isArray(teamStats) && teamStats.length > 0) {
      console.log('🔎 Sample team stats entry shape:', Object.keys(teamStats[0] || {}));
      console.log('🔎 meta_data keys:', Object.keys(teamStats[0]?.meta_data || {}));
      console.log('🔎 stats keys:', Object.keys(teamStats[0]?.stats || {}));
    } else {
      console.log('⚠️ Team stats response is empty or not an array');
    }
    
    // Step 4: Process the data
    const processedTeams = processTeamStats(teamStats);
    
    // Step 5: Save to file
    const outputPath = saveTeamStats(processedTeams, seasonId);
    
    console.log('\n🎉 Successfully fetched and processed Eredivisie team stats!');
    console.log(`📁 Data saved to: ${outputPath}`);
    
    // Display summary
    console.log('\n📋 Summary:');
    console.log(`- Total teams: ${Object.keys(processedTeams).length}`);
    console.log(`- Average xG For: ${(Object.values(processedTeams).reduce((sum, team) => sum + team.xGFor, 0) / Object.keys(processedTeams).length).toFixed(2)}`);
    console.log(`- Average xG Conceded: ${(Object.values(processedTeams).reduce((sum, team) => sum + team.xGConceded, 0) / Object.keys(processedTeams).length).toFixed(2)}`);
    
    // Show top 3 teams by xG For
    const topScoringTeams = Object.values(processedTeams)
      .sort((a, b) => b.xGFor - a.xGFor)
      .slice(0, 3);
    
    console.log('\n🏆 Top 3 teams by xG For:');
    topScoringTeams.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name}: ${team.xGFor.toFixed(2)} xG`);
    });
    
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
  findEredivisieLeagueId,
  getTeamSeasonStats,
  processTeamStats,
  saveTeamStats
}; 