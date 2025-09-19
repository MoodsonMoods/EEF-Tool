const fs = require('fs');
const path = require('path');

// Load the 2025-26 team stats
const teamStatsPath = path.join(__dirname, '..', 'data', 'internal', 'team-stats-2025-26-fbref.json');
const teamStats = JSON.parse(fs.readFileSync(teamStatsPath, 'utf8'));

// Load the current FDR calculator
const fdrCalculatorPath = path.join(__dirname, '..', 'src', 'lib', 'fdr-calculator.ts');
let fdrCalculatorContent = fs.readFileSync(fdrCalculatorPath, 'utf8');

console.log('🔄 Updating FDR Calculator with 2025-26 data...\n');

// Generate the new FDR mapping based on our analysis
const fdrMapping = {
  "NEC Nijmegen": { offensive: 5, defensive: 3 },
  "AZ Alkmaar": { offensive: 5, defensive: 5 },
  "Feyenoord": { offensive: 5, defensive: 5 },
  "PSV Eindhoven": { offensive: 5, defensive: 4 },
  "Ajax": { offensive: 4, defensive: 5 },
  "Heerenveen": { offensive: 4, defensive: 5 },
  "Twente": { offensive: 4, defensive: 4 },
  "Utrecht": { offensive: 3, defensive: 4 },
  "Go Ahead Eag": { offensive: 3, defensive: 1 },
  "Groningen": { offensive: 3, defensive: 2 },
  "Telstar": { offensive: 3, defensive: 3 },
  "Sparta R'dam": { offensive: 2, defensive: 1 },
  "Zwolle": { offensive: 2, defensive: 3 },
  "Fortuna Sittard": { offensive: 1, defensive: 2 },
  "Excelsior": { offensive: 1, defensive: 1 },
  "NAC Breda": { offensive: 1, defensive: 1 },
  "Volendam": { offensive: 1, defensive: 2 }
};

// Convert to the format expected by the FDR calculator
const attackMapping = { 5: [], 4: [], 3: [], 2: [], 1: [] };
const defenceMapping = { 5: [], 4: [], 3: [], 2: [], 1: [] };

Object.entries(fdrMapping).forEach(([teamName, fdr]) => {
  // Map team names to the format used in the FDR calculator
  let mappedName = teamName;
  
  // Handle specific name mappings
  switch (teamName) {
    case 'NEC Nijmegen':
      mappedName = 'N.E.C.';
      break;
    case 'AZ Alkmaar':
      mappedName = 'AZ';
      break;
    case 'PSV Eindhoven':
      mappedName = 'PSV';
      break;
    case 'Go Ahead Eag':
      mappedName = 'Go Ahead Eagles';
      break;
    case 'Sparta R\'dam':
      mappedName = 'Sparta Rotterdam';
      break;
    case 'Fortuna Sittard':
      mappedName = 'Fortuna Sittard';
      break;
    case 'NAC Breda':
      mappedName = 'NAC Breda';
      break;
    case 'Volendam':
      mappedName = 'FC Volendam';
      break;
    case 'Zwolle':
      mappedName = 'PEC Zwolle';
      break;
    case 'Heerenveen':
      mappedName = 'sc Heerenveen';
      break;
    case 'Groningen':
      mappedName = 'FC Groningen';
      break;
    case 'Utrecht':
      mappedName = 'FC Utrecht';
      break;
    case 'Twente':
      mappedName = 'FC Twente';
      break;
    case 'Excelsior':
      mappedName = 'Excelsior';
      break;
    case 'Telstar':
      mappedName = 'Telstar';
      break;
    // Keep original names for Ajax and Feyenoord
  }
  
  attackMapping[fdr.offensive].push(mappedName);
  defenceMapping[fdr.defensive].push(mappedName);
});

// Generate the new TEAM_FDR_MAPPING object
const newTeamFdrMapping = `  private static readonly TEAM_FDR_MAPPING = {
    // Attack FDR mapping based on 2025-2026 season performance (xG For)
    attack: {
      5: [${attackMapping[5].map(name => `'${name}'`).join(', ')}],           // Very Hard (≥2.04 xG/game)
      4: [${attackMapping[4].map(name => `'${name}'`).join(', ')}],                 // Hard (≥1.64 xG/game)
      3: [${attackMapping[3].map(name => `'${name}'`).join(', ')}], // Medium (≥1.40 xG/game)
      2: [${attackMapping[2].map(name => `'${name}'`).join(', ')}], // Easy (≥1.18 xG/game)
      1: [${attackMapping[1].map(name => `'${name}'`).join(', ')}] // Very Easy (<1.18 xG/game)
    },
    // Defence FDR mapping based on 2025-2026 season performance (xG Conceded)
    defence: {
      5: [${defenceMapping[5].map(name => `'${name}'`).join(', ')}],                        // Very Hard (≤1.15 xG/game)
      4: [${defenceMapping[4].map(name => `'${name}'`).join(', ')}],    // Hard (≤1.36 xG/game)
      3: [${defenceMapping[3].map(name => `'${name}'`).join(', ')}], // Medium (≤1.44 xG/game)
      2: [${defenceMapping[2].map(name => `'${name}'`).join(', ')}], // Easy (≤1.76 xG/game)
      1: [${defenceMapping[1].map(name => `'${name}'`).join(', ')}] // Very Easy (>1.76 xG/game)
    }
  };`;

// Replace the old TEAM_FDR_MAPPING with the new one
const oldMappingRegex = /private static readonly TEAM_FDR_MAPPING = \{[\s\S]*?\};/;
fdrCalculatorContent = fdrCalculatorContent.replace(oldMappingRegex, newTeamFdrMapping);

// Write the updated content back to the file
fs.writeFileSync(fdrCalculatorPath, fdrCalculatorContent);

console.log('✅ FDR Calculator updated successfully!');
console.log('\n📊 New FDR Classifications:');
console.log('\n🎯 OFFENSIVE FDR (Attack Difficulty):');
console.log('5 (Very Hard):', attackMapping[5].join(', '));
console.log('4 (Hard):', attackMapping[4].join(', '));
console.log('3 (Medium):', attackMapping[3].join(', '));
console.log('2 (Easy):', attackMapping[2].join(', '));
console.log('1 (Very Easy):', attackMapping[1].join(', '));

console.log('\n🛡️  DEFENSIVE FDR (Defence Difficulty):');
console.log('5 (Very Hard):', defenceMapping[5].join(', '));
console.log('4 (Hard):', defenceMapping[4].join(', '));
console.log('3 (Medium):', defenceMapping[3].join(', '));
console.log('2 (Easy):', defenceMapping[2].join(', '));
console.log('1 (Very Easy):', defenceMapping[1].join(', '));

console.log('\n📈 Key Changes from 2023-24 to 2025-26:');
console.log('- NEC Nijmegen: Now Very Hard offensively (2.68 xG/game)');
console.log('- AZ Alkmaar: Now Very Hard both offensively and defensively');
console.log('- Ajax: Moved from Hard to Medium offensively, remains Very Hard defensively');
console.log('- Feyenoord: Now Very Hard both offensively and defensively');
console.log('- PSV: Now Very Hard offensively, Hard defensively');

console.log('\n🎉 FDR Calculator is now updated with 2025-26 Eredivisie data!');
