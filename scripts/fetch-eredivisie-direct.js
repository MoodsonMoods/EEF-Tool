#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// FBref URLs for Eredivisie (from worldfootballR data)
function buildSeasonUrl(season) {
  // FBref convention uses season twice in path and title
  return `https://fbref.com/en/comps/23/${season}/${season}-Eredivisie-Stats`;
}

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to fetch HTML content
async function fetchHTML(url) {
  try {
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

// Function to parse HTML and extract table data
function parseLeagueTable(html) {
  if (!html) return null;
  
  try {
    // Look for the main stats table
    // FBref often comments out tables; capture commented or visible table
    let tableHTMLBlock = html;
    const commentedMatch = html.match(/<!--\s*<table[^>]*id=\"stats_standard_squads\"[\s\S]*?<\/table>\s*-->/);
    if (commentedMatch) {
      tableHTMLBlock = commentedMatch[0].replace(/^<!--\s*/, '').replace(/\s*-->$/, '');
    }
    const tableMatch = tableHTMLBlock.match(/<table[^>]*id=\"stats_standard_squads\"[^>]*>([\s\S]*?)<\/table>/);
    if (!tableMatch) {
      console.log('❌ Stats table not found in HTML');
      return null;
    }
    
    const tableHTML = tableMatch[1];
    
    // Extract rows
    const rowMatches = tableHTML.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
    if (!rowMatches) {
      console.log('❌ No rows found in table');
      return null;
    }
    
    const teams = [];
    
    for (const rowHTML of rowMatches) {
      // Skip header rows
      if (rowHTML.includes('thead')) {
        continue;
      }
      
      // Extract cells
      const cellMatches = rowHTML.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g);
      if (!cellMatches || cellMatches.length < 10) {
        continue;
      }
      
      // Parse cell content
      const cells = cellMatches.map(cell => {
        const content = cell.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
        return content;
      });
      
      // Extract team data
      const teamData = {
        rank: parseInt(cells[0]) || 0,
        squad: cells[1],
        matches: parseInt(cells[2]) || 0,
        wins: parseInt(cells[3]) || 0,
        draws: parseInt(cells[4]) || 0,
        losses: parseInt(cells[5]) || 0,
        goalsFor: parseInt(cells[6]) || 0,
        goalsAgainst: parseInt(cells[7]) || 0,
        goalDiff: cells[8],
        points: parseInt(cells[9]) || 0,
        xG: parseFloat(cells[10]) || 0,
        xGA: parseFloat(cells[11]) || 0,
        xGD: cells[12],
        xGD90: cells[13]
      };
      
      if (teamData.squad && teamData.squad !== 'Squad' && !isNaN(teamData.rank)) {
        teams.push(teamData);
      }
    }
    
    return teams;
    
  } catch (error) {
    console.error('Error parsing HTML:', error.message);
    return null;
  }
}

// Function to process team data into our format
function processTeamData(teams, season) {
  console.log('🔄 Processing team data...');
  
  // Define promoted teams for 2024-2025 season
  const promotedTeams2024 = [
    'Almere City',
    'Heracles Almelo',
    'Roda JC Kerkrade',
    'Willem II'
  ];
  
  const processedTeams = {};
  
  teams.forEach((team, index) => {
    const teamName = team.squad;
    
    // Check if this is a promoted team
    const isPromoted = promotedTeams2024.some(promotedName => 
      teamName.toLowerCase().includes(promotedName.toLowerCase())
    );
    
    // Calculate per-game averages
    const matchesPlayed = team.matches || 1; // Avoid division by zero
    const xGForPerGame = team.xG / matchesPlayed;
    const xGConcededPerGame = team.xGA / matchesPlayed;
    const goalsForPerGame = team.goalsFor / matchesPlayed;
    const goalsAgainstPerGame = team.goalsAgainst / matchesPlayed;
    
    processedTeams[teamName] = {
      id: (index + 1).toString(),
      name: teamName,
      shortName: teamName.split(' ').map(word => word[0]).join('').toUpperCase(),
      xGFor: isPromoted ? 0 : parseFloat(xGForPerGame.toFixed(3)),
      xGConceded: isPromoted ? 2.0 : parseFloat(xGConcededPerGame.toFixed(3)),
      goalsFor: isPromoted ? 0 : parseFloat(goalsForPerGame.toFixed(3)),
      goalsConceded: isPromoted ? 0 : parseFloat(goalsAgainstPerGame.toFixed(3)),
      cleanSheets: 0, // Not available in this data
      failedToScore: 0, // Not available in this data
      homeAdvantage: 0.15,
      awayDisadvantage: -0.10,
      promoted: isPromoted,
      rank: team.rank,
      matchesPlayed: matchesPlayed,
      wins: team.wins,
      draws: team.draws,
      losses: team.losses,
      points: team.points,
      totalXG: parseFloat(team.xG.toFixed(3)),
      totalXGA: parseFloat(team.xGA.toFixed(3))
    };
  });
  
  console.log(`✅ Processed ${Object.keys(processedTeams).length} teams`);
  return processedTeams;
}

// Function to save data as JSON
function saveTeamStats(processedTeams, season) {
  // Calculate metadata
  const teams = Object.values(processedTeams);
  const nonPromotedTeams = teams.filter(team => !team.promoted);
  
  const avgXGFor = nonPromotedTeams.length > 0 
    ? nonPromotedTeams.reduce((sum, team) => sum + team.xGFor, 0) / nonPromotedTeams.length 
    : 0;
  
  const avgXGConceded = nonPromotedTeams.length > 0 
    ? nonPromotedTeams.reduce((sum, team) => sum + team.xGConceded, 0) / nonPromotedTeams.length 
    : 0;
  
  const outputData = {
    season: season,
    lastUpdated: new Date().toISOString(),
    dataSource: "FBref (Direct scraping)",
    teams: processedTeams,
    metadata: {
      totalTeams: teams.length,
      promotedTeams: teams.filter(team => team.promoted).length,
      relegatedTeams: 0,
      averageXGFor: parseFloat(avgXGFor.toFixed(3)),
      averageXGConceded: parseFloat(avgXGConceded.toFixed(3)),
      notes: [
        "Data sourced from FBref via direct web scraping",
        "xG and xGC values are per game averages calculated from total season values",
        "Promoted teams have xG=0 and xGC=2 as placeholder values",
        "Home/away advantages are estimated based on historical data",
        "Clean sheets and failed to score stats not available in this data source"
      ]
    }
  };
  
  const seasonForFile = season.replace('2024-2025', '2024-25').replace('2025-2026', '2025-26');
  const outputPath = path.join(__dirname, '..', 'data', 'internal', `team-stats-${seasonForFile}-direct.json`);
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log(`💾 Data saved to: ${outputPath}`);
  return outputPath;
}

// Main execution function
async function main() {
  console.log('🚀 Starting Eredivisie data fetch via direct FBref scraping...\n');
  
  // Parse season flag
  const seasonArg = process.argv.find(arg => arg.startsWith('--season='));
  const requestedSeason = seasonArg ? seasonArg.split('=')[1] : '2024-2025';
  
  // Try requested season first, then fallback
  const seasons = [requestedSeason, '2024-2025', '2023-2024'];
  
  for (const season of seasons) {
    console.log(`📅 Trying season: ${season}`);
    
    const url = buildSeasonUrl(season);
    
    console.log(`🔍 Fetching: ${url}`);
    
    // Fetch HTML
    const html = await fetchHTML(url);
    if (!html) {
      console.log(`❌ Failed to fetch HTML for ${season}`);
      continue;
    }
    
    // Parse table data
    const teams = parseLeagueTable(html);
    if (!teams || teams.length === 0) {
      console.log(`❌ No team data found for ${season}`);
      continue;
    }
    
    console.log(`✅ Found ${teams.length} teams for ${season}`);
    
    // Check if we have meaningful xG data
    const hasXGData = teams.some(team => team.xG > 0 || team.xGA > 0);
    
    if (hasXGData) {
      console.log(`📊 Found meaningful xG data for ${season}`);
      
      // Process and save data
      const processedTeams = processTeamData(teams, season);
      const outputPath = saveTeamStats(processedTeams, season);
      
      // Display summary
      console.log('\n📋 Summary:');
      console.log(`- Total teams: ${Object.keys(processedTeams).length}`);
      console.log(`- Promoted teams: ${Object.values(processedTeams).filter(team => team.promoted).length}`);
      console.log(`- Average xG For: ${(Object.values(processedTeams).reduce((sum, team) => sum + team.xGFor, 0) / Object.keys(processedTeams).length).toFixed(3)}`);
      console.log(`- Average xG Conceded: ${(Object.values(processedTeams).reduce((sum, team) => sum + team.xGConceded, 0) / Object.keys(processedTeams).length).toFixed(3)}`);
      
      // Show top 3 teams by xG For (excluding promoted)
      const nonPromotedTeams = Object.values(processedTeams).filter(team => !team.promoted);
      const topScoringTeams = nonPromotedTeams
        .sort((a, b) => b.xGFor - a.xGFor)
        .slice(0, 3);
      
      console.log('\n🏆 Top 3 teams by xG For (excluding promoted):');
      topScoringTeams.forEach((team, index) => {
        console.log(`${index + 1}. ${team.name}: ${team.xGFor} xG (Rank: ${team.rank})`);
      });
      
      // Show promoted teams
      const promotedTeams = Object.values(processedTeams).filter(team => team.promoted);
      if (promotedTeams.length > 0) {
        console.log('\n⬆️ Promoted teams (xG=0, xGC=2):');
        promotedTeams.forEach(team => {
          console.log(`- ${team.name}`);
        });
      }
      
      break;
    } else {
      console.log(`⚠️ No meaningful xG data found for ${season}`);
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
  parseLeagueTable,
  processTeamData,
  saveTeamStats
}; 