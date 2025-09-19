#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// FBref URLs for Eredivisie 2025-2026
const EREDIVISIE_URLS = {
  '2025-2026': 'https://fbref.com/en/comps/23/2025-2026/stats/2025-2026-Eredivisie-Stats',
  '2024-2025': 'https://fbref.com/en/comps/23/2024-2025/stats/2024-2025-Eredivisie-Stats'
};

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch HTML content
async function fetchHTML(url) {
  try {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

// Function to parse player stats table
function parsePlayerStatsTable(html) {
  if (!html) return null;
  
  try {
    // First, let's see what tables are available
    const tableMatches = html.match(/<table[^>]*id="([^"]*)"[^>]*>/g);
    if (tableMatches) {
      console.log('Available tables:');
      tableMatches.forEach(match => {
        const idMatch = match.match(/id="([^"]*)"/);
        if (idMatch) {
          console.log(`- ${idMatch[1]}`);
        }
      });
    }
    
    // Look for the player stats table - try different possible IDs
    const possibleTableIds = [
      'stats_standard_squads',
      'stats_standard',
      'stats_player_standard',
      'stats_player_standard_for_squads',
      'stats_standard_players',
      'stats_player_standard_for_squads',
      'stats_standard_squads_for'
    ];
    
    let tableMatch = null;
    let tableId = null;
    
    for (const id of possibleTableIds) {
      const match = html.match(new RegExp(`<table[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/table>`));
      if (match) {
        tableMatch = match;
        tableId = id;
        console.log(`✅ Found table with ID: ${id}`);
        break;
      }
    }
    
    if (!tableMatch) {
      console.log('❌ No player stats table found');
      return null;
    }
    
    const tableHTML = tableMatch[1];
    
    // Extract rows
    const rowMatches = tableHTML.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
    if (!rowMatches) {
      console.log('❌ No rows found in table');
      return null;
    }
    
    // Find header row to understand column structure
    let headerRow = null;
    for (const rowHTML of rowMatches) {
      if (rowHTML.includes('<th>') || rowHTML.includes('Player')) {
        const headerMatches = rowHTML.match(/<(th|td)[^>]*>([\s\S]*?)<\/(th|td)>/g);
        if (headerMatches) {
          const headers = headerMatches.map(cell => {
            const content = cell.replace(/<[^>]*>/g, '').trim();
            return content;
          });
          headerRow = headers;
          break;
        }
      }
    }
    
    const players = [];
    
    for (const rowHTML of rowMatches) {
      // Skip header rows - be more specific about what constitutes a header
      if (rowHTML.includes('<thead>') || rowHTML.includes('class="thead"')) {
        continue;
      }
      
      // Extract cells
      const cellMatches = rowHTML.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (!cellMatches || cellMatches.length < 10) {
        continue;
      }
      
      // Parse cell content
      const cells = cellMatches.map(cell => {
        const content = cell.replace(/<[^>]*>/g, '').trim();
        return content;
      });
      
      // Skip if first cell looks like a header
      if (cells[0] === 'Player' || cells[0] === 'Rk' || cells[0] === 'Rank') {
        continue;
      }
      
      // Extract player data (adjust indices based on actual table structure)
      const playerData = {
        rank: 0, // Not in this table
        player: cells[0], // Player name is first
        nationality: cells[1] || '',
        position: cells[2] || '',
        teamName: cells[3] || '', // Team name is in position 3
        age: 0, // Age is in position 4
        matches: parseInt(cells[7]) || 0, // Games in position 7
        starts: parseInt(cells[6]) || 0, // Starts in position 6
        minutes: parseInt(cells[5].replace(/,/g, '')) || 0, // Minutes in position 5 (remove commas)
        ninetyMinutes: parseFloat(cells[8]) || 0, // 90s in position 8
        goals: parseInt(cells[9]) || 0, // Goals in position 9
        assists: parseInt(cells[10]) || 0, // Assists in position 10
        goalsPlusAssists: parseInt(cells[11]) || 0, // Goals + Assists in position 11
        nonPenaltyGoals: parseInt(cells[12]) || 0, // Non-penalty goals in position 12
        penalties: parseInt(cells[13]) || 0, // Penalties in position 13
        penaltyAttempts: parseInt(cells[14]) || 0, // Penalty attempts in position 14
        yellowCards: parseInt(cells[15]) || 0, // Yellow cards in position 15
        redCards: parseInt(cells[16]) || 0, // Red cards in position 16
        xG: parseFloat(cells[17]) || 0, // xG in position 17
        npxG: parseFloat(cells[18]) || 0, // npxG in position 18
        xA: parseFloat(cells[19]) || 0, // xA in position 19
        npxGPlusxAG: parseFloat(cells[20]) || 0, // npxG + xAG in position 20
        progressiveCarries: parseInt(cells[21]) || 0,
        progressivePasses: parseInt(cells[22]) || 0,
        progressivePassesReceived: parseInt(cells[23]) || 0
      };
      
      // Parse age from position 4
      if (cells[4]) {
        const ageMatch = cells[4].match(/(\d+)/);
        if (ageMatch) {
          playerData.age = parseInt(ageMatch[1]);
        }
      }
      
      // Clean up team name - remove quotes and extra spaces
      if (playerData.teamName) {
        playerData.teamName = playerData.teamName.replace(/['"]/g, '').trim();
      }
      
      if (playerData.player && playerData.player !== 'Player' && playerData.player.length > 0) {
        players.push(playerData);
      }
    }
    
    console.log(`✅ Parsed ${players.length} players from table`);
    return players;
    
  } catch (error) {
    console.error('Error parsing HTML:', error.message);
    return null;
  }
}

// Function to process player data into our format
function processPlayerData(players, season) {
  console.log('🔄 Processing player data...');
  
  const processedPlayers = [];
  
  players.forEach(player => {
    // Use the team name from the parsed data
    const teamName = player.teamName || 'Unknown Team';
    
    const playerData = {
      fbrefId: null, // We don't have this from the table
      name: player.player,
      teamId: null, // We'll need to match this
      teamName: teamName,
      position: player.position,
      age: player.age,
      
      // Minutes and games
      minutes: player.minutes,
      starts: player.starts,
      ninetyMinutes: player.ninetyMinutes,
      games: player.matches,
      
      // Expected goals and assists (raw totals)
      xG: player.xG,
      npxG: player.npxG,
      xA: player.xA,
      npxGPlusxAG: player.npxGPlusxAG,
      
      // Actual output (raw totals)
      goals: player.goals,
      assists: player.assists,
      goalsPlusAssists: player.goalsPlusAssists,
      
      // Shooting (raw totals) - not available in this table
      shots: 0,
      shotsOnTarget: 0,
      
      // Chance creation (raw totals) - not available in this table
      keyPasses: 0,
      sca: 0,
      gca: 0,
      
      // Touches and positioning - not available in this table
      touchesAttPen: 0,
      touchesAtt3rd: 0,
      
      // Passing (raw totals)
      progressivePasses: player.progressivePasses,
      passesIntoFinalThird: 0, // Not available
      
      // Defensive (raw totals) - not available in this table
      tacklesWon: 0,
      interceptions: 0,
      aerialsWon: 0,
      aerialsWonPct: 0,
      
      // Goalkeeper specific (raw totals) - not available in this table
      psxgFaced: 0,
      ga: 0,
      psxgMinusGA: 0,
      savePct: 0,
      
      // Per-90 metrics (will be calculated)
      xGPer90: 0,
      npxGPer90: 0,
      xAPer90: 0,
      npxGPlusxAGPer90: 0,
      goalsPer90: 0,
      assistsPer90: 0,
      goalsPlusAssistsPer90: 0,
      shotsPer90: 0,
      shotsOnTargetPer90: 0,
      keyPassesPer90: 0,
      scaPer90: 0,
      gcaPer90: 0,
      progressivePassesPer90: 0,
      passesIntoFinalThirdPer90: 0,
      tacklesWonPer90: 0,
      interceptionsPer90: 0,
      aerialsWonPer90: 0,
      psxgFacedPer90: 0,
      gaPer90: 0,
      psxgMinusGAPer90: 0,
      
      // Efficiency metrics
      xGPerShot: 0,
      goalsPerShot: 0,
      xGPerShotOnTarget: 0,
      goalsPerShotOnTarget: 0
    };
    
    // Calculate per-90 metrics
    if (playerData.ninetyMinutes > 0) {
      const minutes90 = playerData.ninetyMinutes;
      
      playerData.xGPer90 = playerData.xG / minutes90 * 90;
      playerData.npxGPer90 = playerData.npxG / minutes90 * 90;
      playerData.xAPer90 = playerData.xA / minutes90 * 90;
      playerData.npxGPlusxAGPer90 = playerData.npxGPlusxAG / minutes90 * 90;
      playerData.goalsPer90 = playerData.goals / minutes90 * 90;
      playerData.assistsPer90 = playerData.assists / minutes90 * 90;
      playerData.goalsPlusAssistsPer90 = playerData.goalsPlusAssists / minutes90 * 90;
      playerData.progressivePassesPer90 = playerData.progressivePasses / minutes90 * 90;
    }
    
    processedPlayers.push(playerData);
  });
  
  console.log(`✅ Processed ${processedPlayers.length} players`);
  return processedPlayers;
}

// Function to create player name matcher for ESPN integration
function createPlayerMatcher(processedPlayers) {
  console.log('🔗 Creating player name matcher...');
  
  const matcher = {};
  
  processedPlayers.forEach(player => {
    // Create normalized name (lowercase, no accents, no extra spaces)
    const normalizedName = player.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Create variations for matching
    const nameVariations = [
      normalizedName,
      normalizedName.replace(/\s+/g, ''), // No spaces
      normalizedName.split(' ').slice(-1)[0], // Last name only
      normalizedName.split(' ').slice(0, 2).join(' ') // First two names
    ];
    
    nameVariations.forEach(variation => {
      if (variation && variation.length > 1) {
        matcher[variation] = player;
      }
    });
  });
  
  console.log(`✅ Created matcher with ${Object.keys(matcher).length} variations`);
  return matcher;
}

// Function to save data to file
function savePlayerStats(processedPlayers, matcher, season) {
  const outputPath = path.join(__dirname, '..', 'data', 'internal', `fbref-players-${season.replace('-', '-')}.json`);
  
  const outputData = {
    season: season,
    lastUpdated: new Date().toISOString(),
    dataSource: "FBref (Direct scraping)",
    players: processedPlayers,
    matcher: matcher,
    metadata: {
      totalPlayers: processedPlayers.length,
      teams: [...new Set(processedPlayers.map(p => p.teamName))],
      positions: [...new Set(processedPlayers.map(p => p.position))],
      averageMinutes: processedPlayers.reduce((sum, p) => sum + p.minutes, 0) / processedPlayers.length,
      notes: [
        "Data sourced from FBref via direct web scraping",
        "Raw totals are the primary metrics, per-90 values are computed",
        "Focus on attacking metrics (xG, xA, goals, assists, etc.)",
        "Player matcher included for ESPN integration",
        `All metrics are season-to-date totals for ${season}`,
        "Note: Some advanced metrics (shots, SCA, GCA) not available in standard stats table"
      ]
    }
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`✅ Player stats saved to: ${outputPath}`);
  
  return outputPath;
}

// Main execution function
async function main() {
  console.log('🚀 Starting FBref player stats fetch for Eredivisie...\n');
  
  // Try seasons in order (2025-2026 first as it's the current season)
  const seasons = ['2025-2026', '2024-2025'];
  
  for (const season of seasons) {
    console.log(`📅 Trying season: ${season}`);
    
    const url = EREDIVISIE_URLS[season];
    if (!url) {
      console.log(`❌ No URL found for season ${season}`);
      continue;
    }
    
    // Fetch HTML
    const html = await fetchHTML(url);
    if (!html) {
      console.log(`❌ Failed to fetch HTML for ${season}`);
      continue;
    }
    
    // Parse player data
    const players = parsePlayerStatsTable(html);
    if (!players || players.length === 0) {
      console.log(`❌ No player data found for ${season}`);
      continue;
    }
    
    console.log(`✅ Found ${players.length} players for ${season}`);
    
    // Check if we have meaningful data
    const hasXGData = players.some(player => player.xG > 0 || player.xA > 0);
    
    if (hasXGData) {
      console.log(`📊 Found meaningful xG/xA data for ${season}`);
      
      // Process and save data
      const processedPlayers = processPlayerData(players, season);
      const matcher = createPlayerMatcher(processedPlayers);
      const outputPath = savePlayerStats(processedPlayers, matcher, season);
      
      // Display summary
      console.log('\n📋 Summary:');
      console.log(`- Total players: ${processedPlayers.length}`);
      console.log(`- Average minutes: ${(processedPlayers.reduce((sum, p) => sum + p.minutes, 0) / processedPlayers.length).toFixed(0)}`);
      
      // Show top performers by xG
      const topXG = processedPlayers
        .filter(p => p.xG > 0)
        .sort((a, b) => b.xG - a.xG)
        .slice(0, 5);
      
      console.log('\n🏆 Top 5 players by xG:');
      topXG.forEach((player, index) => {
        console.log(`${index + 1}. ${player.name}: ${player.xG.toFixed(2)} xG, ${player.goals} goals`);
      });
      
      // Show top performers by xA
      const topXA = processedPlayers
        .filter(p => p.xA > 0)
        .sort((a, b) => b.xA - a.xA)
        .slice(0, 5);
      
      console.log('\n🎯 Top 5 players by xA:');
      topXA.forEach((player, index) => {
        console.log(`${index + 1}. ${player.name}: ${player.xA.toFixed(2)} xA, ${player.assists} assists`);
      });
      
      console.log(`\n✅ Successfully fetched real data for ${season}`);
      console.log(`📁 Data saved to: ${outputPath}`);
      break;
    } else {
      console.log(`⚠️ No meaningful xG/xA data found for ${season}`);
    }
    
    // Wait between requests
    if (season !== seasons[seasons.length - 1]) {
      console.log('🔄 Trying next season...\n');
      await delay(3000);
    }
  }
  
  console.log('\n🎉 Data fetch completed!');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  fetchHTML,
  parsePlayerStatsTable,
  processPlayerData,
  createPlayerMatcher,
  savePlayerStats
}; 