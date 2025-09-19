#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to build FBref URL for a season
function buildSeasonUrl(season) {
  // Try different URL patterns for 2025-2026
  if (season === '2025-2026') {
    // Try the current season URL pattern
    return 'https://fbref.com/en/comps/23/2025-2026/2025-2026-Eredivisie-Stats';
  }
  return `https://fbref.com/en/comps/23/${season}/${season}-Eredivisie-Stats`;
}

// Function to scrape team stats using Puppeteer
async function scrapeTeamStats(season) {
  console.log(`🚀 Starting Puppeteer scrape for ${season}...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Listen to console messages from the page
    page.on('console', message => console.log(`Browser console: ${message.text()}`));
    
    const url = buildSeasonUrl(season);
    console.log(`🔍 Navigating to: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit for any dynamic content
    await delay(2000);
    
    // Check if page loaded correctly
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Check if we got redirected or blocked
    const currentUrl = page.url();
    console.log(`🔗 Current URL: ${currentUrl}`);
    
    console.log('📊 Extracting team stats table...');
    
    // First, let's see what's actually on the page
    const pageContent = await page.content();
    console.log(`📄 Page content length: ${pageContent.length}`);
    
    // Check if there are any tables in the HTML
    const tableCount = (pageContent.match(/<table/g) || []).length;
    console.log(`📊 Found ${tableCount} tables in HTML`);
    
    // Save HTML to file for debugging
    const debugPath = path.join(__dirname, '..', 'data', 'internal', 'fbref-debug.html');
    fs.writeFileSync(debugPath, pageContent);
    console.log(`🔍 Saved HTML to: ${debugPath}`);
    
    // Extract the stats table data
    const teamStats = await page.evaluate(() => {
      const teams = [];
      
      // Look for the Squad Standard Stats table specifically
      let table = document.querySelector('#all_stats_squads_standard table');
      
      if (!table) {
        return { error: 'No Squad Standard Stats table found', tableCount: document.querySelectorAll('table').length };
      }

      // First, get the "For" stats (xG for)
      const forRows = Array.from(table.querySelectorAll('tbody tr'));
      const forData = {};
      
      for (const row of forRows) {
        const teamCell = row.querySelector('th[data-stat="team"] a');
        if (!teamCell) continue;
        
        const teamName = teamCell.textContent.trim();
        if (!teamName || teamName.length < 2) continue;
        
        // Get values using data-stat attributes
        const getStatValue = (stat, defaultValue = 0) => {
          const cell = row.querySelector(`[data-stat="${stat}"]`);
          if (!cell) return defaultValue;
          const text = cell.textContent.trim();
          return text ? parseFloat(text) || defaultValue : defaultValue;
        };

        const matches = getStatValue('games', 0);
        const goalsFor = getStatValue('goals', 0);
        const xG = getStatValue('xg', 0);

        forData[teamName] = {
          name: teamName,
          matches,
          goalsFor,
          xG,
          xGForPerGame: matches > 0 ? xG / matches : 0,
          goalsForPerGame: matches > 0 ? goalsFor / matches : 0
        };
      }

      // Now look for the "Against" tab and get xG against data
      // The against table is hidden but the data is still in the HTML
      let againstTable = document.querySelector('#stats_squads_standard_against');
      if (!againstTable) {
        // Fallback: look for any table with "against" in the ID
        againstTable = document.querySelector('table[id*="against"]');
      }

      if (againstTable) {
        const againstRows = Array.from(againstTable.querySelectorAll('tbody tr'));
        
        for (const row of againstRows) {
          const teamCell = row.querySelector('th[data-stat="team"] a');
          if (!teamCell) continue;
          
          const teamNameWithVs = teamCell.textContent.trim();
          if (!teamNameWithVs || teamNameWithVs.length < 2) continue;
          
          // Remove "vs " prefix to match with forData keys
          const teamName = teamNameWithVs.replace(/^vs /, '');
          
          // Get values using data-stat attributes
          const getStatValue = (stat, defaultValue = 0) => {
            const cell = row.querySelector(`[data-stat="${stat}"]`);
            if (!cell) return defaultValue;
            const text = cell.textContent.trim();
            return text ? parseFloat(text) || defaultValue : defaultValue;
          };

          const goalsAgainst = getStatValue('goals', 0);
          const xGA = getStatValue('xg', 0); // In opponent stats, xG is actually xG against

          if (forData[teamName]) {
            forData[teamName].goalsAgainst = goalsAgainst;
            forData[teamName].xGA = xGA;
            forData[teamName].xGConcededPerGame = forData[teamName].matches > 0 ? xGA / forData[teamName].matches : 0;
            forData[teamName].goalsAgainstPerGame = forData[teamName].matches > 0 ? goalsAgainst / forData[teamName].matches : 0;
          }
        }
      } else {
        // No against table found
      }

      // Convert to array
      for (const teamName in forData) {
        teams.push(forData[teamName]);
      }
      
      return {
        teams: teams,
        debug: {
          againstTableFound: !!againstTable,
          againstTableId: againstTable ? againstTable.id : null,
          againstRowsCount: againstTable ? Array.from(againstTable.querySelectorAll('tbody tr')).length : 0
        }
      };
    });
    
    if (teamStats.error) {
      console.log(`❌ ${teamStats.error} (${teamStats.tableCount} tables found)`);
      if (teamStats.sampleHeaders) {
        console.log(`Sample headers from first table:`, teamStats.sampleHeaders);
      }
      return [];
    }

    // Log debug information
    if (teamStats.debug) {
      console.log(`🔍 Debug info: Against table found: ${teamStats.debug.againstTableFound}`);
      console.log(`🔍 Debug info: Against table ID: ${teamStats.debug.againstTableId}`);
      console.log(`🔍 Debug info: Against rows count: ${teamStats.debug.againstRowsCount}`);
    }

    console.log(`✅ Extracted ${teamStats.teams.length} teams`);
    return teamStats.teams;
    
  } finally {
    await browser.close();
  }
}

// Function to process team data into our format
function processTeamData(teams, season) {
  console.log('🔄 Processing team data...');
  
  // Define promoted teams for 2025-2026 season (adjust as needed)
  const promotedTeams2025 = [
    'Almere City',
    'Heracles Almelo', 
    'Roda JC Kerkrade',
    'Willem II'
  ];
  
  const processedTeams = {};
  
  teams.forEach((team, index) => {
    const teamName = team.name;
    
    // Check if this is a promoted team
    const isPromoted = promotedTeams2025.some(promotedName => 
      teamName.toLowerCase().includes(promotedName.toLowerCase())
    );
    
    processedTeams[teamName] = {
      id: (index + 1).toString(),
      name: teamName,
      shortName: teamName.split(' ').map(word => word[0]).join('').toUpperCase(),
      xGFor: isPromoted ? 0 : parseFloat((team.xGForPerGame || 0).toFixed(3)),
      xGConceded: isPromoted ? 2.0 : parseFloat((team.xGConcededPerGame || 0).toFixed(3)),
      goalsFor: isPromoted ? 0 : parseFloat((team.goalsForPerGame || 0).toFixed(3)),
      goalsConceded: isPromoted ? 0 : parseFloat((team.goalsAgainstPerGame || 0).toFixed(3)),
      cleanSheets: 0, // Not available in this data
      failedToScore: 0, // Not available in this data
      homeAdvantage: 0.15,
      awayDisadvantage: -0.10,
      promoted: isPromoted,
      rank: index + 1,
      matchesPlayed: team.matches || 0,
      wins: 0, // Not available in this data
      draws: 0, // Not available in this data
      losses: 0, // Not available in this data
      points: 0, // Not available in this data
      totalXG: parseFloat((team.xG || 0).toFixed(3)),
      totalXGA: parseFloat((team.xGA || 0).toFixed(3))
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
    dataSource: "FBref (Puppeteer scraping)",
    teams: processedTeams,
    metadata: {
      totalTeams: teams.length,
      promotedTeams: teams.filter(team => team.promoted).length,
      relegatedTeams: 0,
      averageXGFor: parseFloat(avgXGFor.toFixed(3)),
      averageXGConceded: parseFloat(avgXGConceded.toFixed(3)),
      notes: [
        "Data sourced from FBref via Puppeteer web scraping",
        "xG and xGC values are per game averages calculated from total season values",
        "Promoted teams have xG=0 and xGC=2 as placeholder values",
        "Home/away advantages are estimated based on historical data",
        "Clean sheets and failed to score stats not available in this data source"
      ]
    }
  };
  
  const seasonForFile = season.replace('2024-2025', '2024-25').replace('2025-2026', '2025-26');
  const outputPath = path.join(__dirname, '..', 'data', 'internal', `team-stats-${seasonForFile}-fbref.json`);
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log(`💾 Data saved to: ${outputPath}`);
  return outputPath;
}

// Main execution function
async function main() {
  console.log('🚀 Starting FBref Puppeteer scraper...\n');
  
  // Parse season flag
  const seasonArg = process.argv.find(arg => arg.startsWith('--season='));
  const requestedSeason = seasonArg ? seasonArg.split('=')[1] : '2025-2026';
  
  try {
    // Scrape team stats
    const teamStats = await scrapeTeamStats(requestedSeason);
    
    if (!teamStats || (Array.isArray(teamStats) && teamStats.length === 0) || (teamStats.teams && teamStats.teams.length === 0)) {
      console.log('❌ No team data found');
      return;
    }
    
    // Check if we have meaningful xG data
    const list = Array.isArray(teamStats) ? teamStats : teamStats.teams;
    const hasXGData = list.some(team => team.xG > 0 || team.xGA > 0);
    
    if (!hasXGData) {
      console.log('⚠️ No meaningful xG data found');
      return;
    }
    
    console.log(`📊 Found meaningful xG data for ${requestedSeason}`);
    
    // Process and save data
    const processedTeams = processTeamData(list, requestedSeason);
    const outputPath = saveTeamStats(processedTeams, requestedSeason);
    
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
    
    console.log('\n🎉 Scraping completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Scraping failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  scrapeTeamStats,
  processTeamData,
  saveTeamStats
};
