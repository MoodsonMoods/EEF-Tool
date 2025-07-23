#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load existing data
const teamStatsPath = path.join(__dirname, '..', 'data', 'internal', 'team-stats-2024-25-fbref.json');

function loadTeamStats() {
  try {
    const data = fs.readFileSync(teamStatsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading team stats:', error.message);
    return null;
  }
}

function saveTeamStats(data) {
  try {
    fs.writeFileSync(teamStatsPath, JSON.stringify(data, null, 2));
    console.log('✅ Data saved successfully!');
  } catch (error) {
    console.error('Error saving data:', error.message);
  }
}

function displayCurrentTeams(data) {
  console.log('\n📋 Current Teams:');
  console.log('==================');
  
  const teams = Object.values(data.teams);
  const nonPromotedTeams = teams.filter(team => !team.promoted);
  const promotedTeams = teams.filter(team => team.promoted);
  
  console.log('\n🏆 Non-Promoted Teams:');
  nonPromotedTeams.forEach(team => {
    console.log(`${team.name}: xG For = ${team.xGFor}, xG Conceded = ${team.xGConceded}`);
  });
  
  console.log('\n⬆️ Promoted Teams (placeholder values):');
  promotedTeams.forEach(team => {
    console.log(`${team.name}: xG For = ${team.xGFor}, xG Conceded = ${team.xGConceded}`);
  });
}

function updateTeamXG(data, teamName, xGFor, xGConceded) {
  const team = data.teams[teamName];
  if (team) {
    team.xGFor = parseFloat(xGFor);
    team.xGConceded = parseFloat(xGConceded);
    console.log(`✅ Updated ${teamName}: xG For = ${xGFor}, xG Conceded = ${xGConceded}`);
  } else {
    console.log(`❌ Team "${teamName}" not found`);
  }
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔄 Eredivisie xG Values Manual Update Tool');
  console.log('==========================================\n');

  const data = loadTeamStats();
  if (!data) {
    console.log('❌ Could not load team stats data');
    rl.close();
    return;
  }

  displayCurrentTeams(data);

  console.log('\n💡 Instructions:');
  console.log('1. Look at the current teams above');
  console.log('2. Provide the correct xG For and xG Conceded values for the 2024-2025 season');
  console.log('3. Use the format: "Team Name" xGFor xGConceded');
  console.log('4. Type "save" when done to save changes');
  console.log('5. Type "exit" to quit without saving');
  console.log('6. Type "show" to display current teams again');
  console.log('\n📝 Example:');
  console.log('Ajax 1.85 0.95');
  console.log('PSV Eindhoven 1.92 0.88');
  console.log('save');

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

  // Interactive mode
  console.log('\n🎯 Interactive Mode:');
  console.log('Enter team updates one by one:');

  while (true) {
    const input = await question('\nEnter command (team xG xGC, save, exit, show): ');
    const parts = input.trim().split(' ');

    if (parts[0].toLowerCase() === 'exit') {
      console.log('👋 Exiting without saving...');
      break;
    } else if (parts[0].toLowerCase() === 'save') {
      saveTeamStats(data);
      break;
    } else if (parts[0].toLowerCase() === 'show') {
      displayCurrentTeams(data);
    } else if (parts.length === 3) {
      const [teamName, xGFor, xGConceded] = parts;
      updateTeamXG(data, teamName, xGFor, xGConceded);
    } else {
      console.log('❌ Invalid input. Use format: "Team Name" xG xGC');
    }
  }

  rl.close();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  loadTeamStats,
  saveTeamStats,
  updateTeamXG,
  displayCurrentTeams
}; 