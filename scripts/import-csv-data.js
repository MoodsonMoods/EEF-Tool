#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to parse CSV data
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    data.push(row);
  }
  
  return data;
}

// Function to process CSV data into our format
function processCSVData(csvData) {
  console.log('🔄 Processing CSV data...');
  
  // Define promoted teams for 2024-2025 season
  const promotedTeams2024 = [
    'Almere City',
    'Heracles Almelo',
    'Roda JC Kerkrade',
    'Willem II'
  ];
  
  const processedTeams = {};
  
  csvData.forEach((row, index) => {
    // Try to extract team name from common column names
    const teamName = row['Team'] || row['Squad'] || row['Club'] || row['Name'] || row['team'] || row['squad'];
    
    if (!teamName) {
      console.log(`⚠️ Skipping row ${index + 1}: No team name found`);
      return;
    }
    
    // Check if this is a promoted team
    const isPromoted = promotedTeams2024.some(promotedName => 
      teamName.toLowerCase().includes(promotedName.toLowerCase())
    );
    
    // Try to extract xG data from common column names
    const xGFor = parseFloat(row['xG'] || row['xGFor'] || row['xG_for'] || row['xg'] || row['xg_for'] || 0);
    const xGConceded = parseFloat(row['xGA'] || row['xGConceded'] || row['xG_conceded'] || row['xga'] || row['xg_conceded'] || 0);
    const goalsFor = parseFloat(row['GF'] || row['GoalsFor'] || row['goals_for'] || row['gf'] || 0);
    const goalsAgainst = parseFloat(row['GA'] || row['GoalsAgainst'] || row['goals_against'] || row['ga'] || 0);
    const matchesPlayed = parseFloat(row['MP'] || row['Matches'] || row['matches'] || row['games'] || 1);
    const rank = parseInt(row['Rk'] || row['Rank'] || row['rank'] || index + 1);
    const wins = parseInt(row['W'] || row['Wins'] || row['wins'] || 0);
    const draws = parseInt(row['D'] || row['Draws'] || row['draws'] || 0);
    const losses = parseInt(row['L'] || row['Losses'] || row['losses'] || 0);
    const points = parseInt(row['Pts'] || row['Points'] || row['points'] || 0);
    
    // Calculate per-game averages
    const xGForPerGame = matchesPlayed > 0 ? xGFor / matchesPlayed : 0;
    const xGConcededPerGame = matchesPlayed > 0 ? xGConceded / matchesPlayed : 0;
    const goalsForPerGame = matchesPlayed > 0 ? goalsFor / matchesPlayed : 0;
    const goalsAgainstPerGame = matchesPlayed > 0 ? goalsAgainst / matchesPlayed : 0;
    
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
      rank: rank,
      matchesPlayed: matchesPlayed,
      wins: wins,
      draws: draws,
      losses: losses,
      points: points,
      totalXG: parseFloat(xGFor.toFixed(3)),
      totalXGA: parseFloat(xGConceded.toFixed(3))
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
    dataSource: "CSV Import (2023-2024 season data)",
    teams: processedTeams,
    metadata: {
      totalTeams: teams.length,
      promotedTeams: teams.filter(team => team.promoted).length,
      relegatedTeams: 0,
      averageXGFor: parseFloat(avgXGFor.toFixed(3)),
      averageXGConceded: parseFloat(avgXGConceded.toFixed(3)),
      notes: [
        "Data imported from CSV file (2023-2024 season)",
        "xG and xGC values are per game averages calculated from total season values",
        "Promoted teams have xG=0 and xGC=2 as placeholder values",
        "Home/away advantages are estimated based on historical data",
        "Clean sheets and failed to score stats not available in this data source"
      ]
    }
  };
  
  const outputPath = path.join(__dirname, '..', 'data', 'internal', 'team-stats-2024-25-csv-import.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log(`💾 Data saved to: ${outputPath}`);
  return outputPath;
}

// Function to display summary
function displaySummary(processedTeams) {
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
}

// Main execution function
async function main() {
  console.log('🚀 CSV Data Import Tool for Eredivisie FDR');
  console.log('==========================================\n');
  
  // Check if CSV file exists in the scripts directory
  const csvFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.csv'));
  
  if (csvFiles.length === 0) {
    console.log('❌ No CSV files found in the scripts directory');
    console.log('📁 Please place your CSV file in the scripts/ directory');
    console.log('📋 Expected CSV format should include columns like: Team, xG, xGA, GF, GA, MP, etc.');
    return;
  }
  
  console.log('📁 Found CSV files:');
  csvFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
  
  // For now, use the first CSV file found
  const csvFile = csvFiles[0];
  const csvPath = path.join(__dirname, csvFile);
  
  console.log(`\n📖 Reading CSV file: ${csvFile}`);
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvData = parseCSV(csvContent);
    
    console.log(`✅ Successfully parsed ${csvData.length} rows from CSV`);
    
    // Show sample of the data structure
    if (csvData.length > 0) {
      console.log('\n📊 Sample data structure:');
      console.log('Headers:', Object.keys(csvData[0]));
      console.log('First row:', csvData[0]);
    }
    
    // Process the data
    const processedTeams = processCSVData(csvData);
    
    if (Object.keys(processedTeams).length === 0) {
      console.log('❌ No valid team data found in CSV');
      return;
    }
    
    // Save the data
    const outputPath = saveTeamStats(processedTeams, '2023-2024');
    
    // Display summary
    displaySummary(processedTeams);
    
    console.log('\n🎉 CSV import completed successfully!');
    console.log(`📄 The data has been saved to: ${outputPath}`);
    console.log('🔄 You can now use this data in your FDR system');
    
  } catch (error) {
    console.error('❌ Error processing CSV file:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  parseCSV,
  processCSVData,
  saveTeamStats,
  displaySummary
}; 