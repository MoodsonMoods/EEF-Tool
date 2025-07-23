#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the team stats file
const teamStatsPath = path.join(__dirname, '..', 'data', 'internal', 'team-stats-2024-25-fbref.json');

// Load current data
function loadTeamStats() {
  try {
    const data = JSON.parse(fs.readFileSync(teamStatsPath, 'utf-8'));
    return data;
  } catch (error) {
    console.error('Error loading team stats:', error.message);
    process.exit(1);
  }
}

// Save updated data
function saveTeamStats(data) {
  try {
    // Update metadata
    data.lastUpdated = new Date().toISOString();
    data.dataSource = "FBref via FBR API (Manually updated with 2024-2025 season data)";
    
    // Recalculate averages
    const teams = Object.values(data.teams);
    const nonPromotedTeams = teams.filter(team => !team.promoted);
    
    if (nonPromotedTeams.length > 0) {
      data.metadata.averageXGFor = nonPromotedTeams.reduce((sum, team) => sum + team.xGFor, 0) / nonPromotedTeams.length;
      data.metadata.averageXGConceded = nonPromotedTeams.reduce((sum, team) => sum + team.xGConceded, 0) / nonPromotedTeams.length;
    }
    
    // Update notes
    data.metadata.notes = [
      "Data sourced from FBref via FBR API (Manually updated with 2024-2025 season data)",
      "xG and xGC values are per game averages",
      "Promoted teams have xG=0 and xGC=2 as placeholder values",
      "Home/away advantages are estimated based on historical data",
      "Clean sheets and failed to score stats not available in standings data"
    ];
    
    fs.writeFileSync(teamStatsPath, JSON.stringify(data, null, 2));
    console.log('✅ Team stats updated successfully!');
  } catch (error) {
    console.error('Error saving team stats:', error.message);
    process.exit(1);
  }
}

// Display current teams and their xG values
function displayCurrentTeams(data) {
  console.log('\n📊 Current Teams and xG Values:');
  console.log('================================');
  
  const teams = Object.values(data.teams);
  const nonPromotedTeams = teams.filter(team => !team.promoted);
  const promotedTeams = teams.filter(team => team.promoted);
  
  console.log('\n🏆 Regular Teams (Non-Promoted):');
  nonPromotedTeams.forEach(team => {
    console.log(`${team.name.padEnd(20)} | xG For: ${team.xGFor.toFixed(2).padStart(5)} | xG Conceded: ${team.xGConceded.toFixed(2).padStart(5)}`);
  });
  
  console.log('\n⬆️ Promoted Teams:');
  promotedTeams.forEach(team => {
    console.log(`${team.name.padEnd(20)} | xG For: ${team.xGFor.toFixed(2).padStart(5)} | xG Conceded: ${team.xGConceded.toFixed(2).padStart(5)} (placeholder)`);
  });
  
  console.log('\n📈 Current Averages (Non-Promoted Teams):');
  if (nonPromotedTeams.length > 0) {
    const avgXGFor = nonPromotedTeams.reduce((sum, team) => sum + team.xGFor, 0) / nonPromotedTeams.length;
    const avgXGConceded = nonPromotedTeams.reduce((sum, team) => sum + team.xGConceded, 0) / nonPromotedTeams.length;
    console.log(`Average xG For: ${avgXGFor.toFixed(2)}`);
    console.log(`Average xG Conceded: ${avgXGConceded.toFixed(2)}`);
  }
}

// Update xG values for a specific team
function updateTeamXG(data, teamName, xGFor, xGConceded) {
  if (data.teams[teamName]) {
    data.teams[teamName].xGFor = parseFloat(xGFor);
    data.teams[teamName].xGConceded = parseFloat(xGConceded);
    console.log(`✅ Updated ${teamName}: xG For = ${xGFor}, xG Conceded = ${xGConceded}`);
  } else {
    console.log(`❌ Team "${teamName}" not found`);
  }
}

// Main function
function main() {
  console.log('🔄 Eredivisie xG Values Update Tool');
  console.log('===================================\n');
  
  const data = loadTeamStats();
  
  // Display current state
  displayCurrentTeams(data);
  
  console.log('\n💡 Instructions:');
  console.log('1. Look at the current teams above');
  console.log('2. Provide the correct xG For and xG Conceded values for the 2024-2025 season');
  console.log('3. Use the format: "Team Name" xGFor xGConceded');
  console.log('4. Type "save" when done to save changes');
  console.log('5. Type "exit" to quit without saving');
  console.log('\n📝 Example:');
  console.log('Ajax 1.85 0.95');
  console.log('PSV Eindhoven 1.92 0.88');
  console.log('save');
  
  // For now, let's provide a template for manual updates
  console.log('\n🔧 Template for Manual Updates:');
  console.log('Copy and modify these lines with the correct values:');
  console.log('----------------------------------------');
  
  const nonPromotedTeams = Object.values(data.teams).filter(team => !team.promoted);
  nonPromotedTeams.forEach(team => {
    console.log(`// ${team.name}: xG For = ?, xG Conceded = ?`);
    console.log(`updateTeamXG(data, "${team.name}", 0, 0);`);
  });
  
  console.log('\n📋 Promoted Teams (already set correctly):');
  const promotedTeams = Object.values(data.teams).filter(team => team.promoted);
  promotedTeams.forEach(team => {
    console.log(`${team.name}: xG For = 0, xG Conceded = 2.0 (placeholder)`);
  });
  
  console.log('\n💾 To save changes, uncomment and update the lines above, then run:');
  console.log('saveTeamStats(data);');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  loadTeamStats,
  saveTeamStats,
  displayCurrentTeams,
  updateTeamXG
}; 