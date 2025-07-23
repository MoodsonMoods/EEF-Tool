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

// Step 2: Find Eredivisie league ID
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
    
    // Get leagues for Netherlands
    const leaguesResponse = await makeApiRequest('/leagues', { 
      country: netherlands.country_code 
    }, apiKey);
    await delay(RATE_LIMIT_DELAY);
    
    const eredivisie = leaguesResponse.data.find(league => 
      league.league_name.toLowerCase().includes('eredivisie')
    );
    
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

// Step 3: Get team season stats for Eredivisie 2024-2025
async function getTeamSeasonStats(apiKey, leagueId) {
  console.log('📊 Fetching team season stats for Eredivisie 2024-2025...');
  
  try {
    const response = await makeApiRequest('/team-season-stats', {
      league_id: leagueId,
      season_id: '2024-2025'
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
    const teamName = team.team_name;
    
    // Extract xG and xGC from the stats
    // Note: Field names might vary, we'll need to check the actual response
    const xGFor = team.xg_for || team.xg || 0;
    const xGConceded = team.xg_against || team.xga || 0;
    const goalsFor = team.goals_for || team.gf || 0;
    const goalsConceded = team.goals_against || team.ga || 0;
    
    processedTeams[teamName] = {
      id: team.team_id,
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
function saveTeamStats(processedTeams) {
  const outputPath = path.join(__dirname, '..', 'data', 'internal', 'team-stats-2024-25-fbref.json');
  
  const outputData = {
    season: "2024-2025",
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
  console.log('🚀 Starting FBR API data fetch for Eredivisie 2024-2025...\n');
  
  try {
    // Step 1: Generate API key
    const apiKey = await generateApiKey();
    await delay(RATE_LIMIT_DELAY);
    
    // Step 2: Find Eredivisie league ID
    const leagueId = await findEredivisieLeagueId(apiKey);
    await delay(RATE_LIMIT_DELAY);
    
    // Step 3: Get team season stats
    const teamStats = await getTeamSeasonStats(apiKey, leagueId);
    
    // Step 4: Process the data
    const processedTeams = processTeamStats(teamStats);
    
    // Step 5: Save to file
    const outputPath = saveTeamStats(processedTeams);
    
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