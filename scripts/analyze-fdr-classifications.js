const fs = require('fs');
const path = require('path');

// Load the 2025-26 team stats
const teamStatsPath = path.join(__dirname, '..', 'data', 'internal', 'team-stats-2025-26-fbref.json');
const teamStats = JSON.parse(fs.readFileSync(teamStatsPath, 'utf8'));

console.log('🔍 Analyzing 2025-2026 Eredivisie FDR Classifications\n');

// Extract teams and sort by xG For (offensive strength)
const teams = Object.values(teamStats.teams).filter(team => !team.promoted);
const sortedByXGFor = [...teams].sort((a, b) => b.xGFor - a.xGFor);
const sortedByXGConceded = [...teams].sort((a, b) => a.xGConceded - b.xGConceded);

console.log('📊 OFFENSIVE FDR (xG For - Higher is Harder to Defend Against)');
console.log('=' .repeat(60));
sortedByXGFor.forEach((team, index) => {
  const rank = index + 1;
  console.log(`${rank.toString().padStart(2)}. ${team.name.padEnd(20)} ${team.xGFor.toFixed(2)} xG/game`);
});

console.log('\n🛡️  DEFENSIVE FDR (xG Conceded - Lower is Harder to Score Against)');
console.log('=' .repeat(60));
sortedByXGConceded.forEach((team, index) => {
  const rank = index + 1;
  console.log(`${rank.toString().padStart(2)}. ${team.name.padEnd(20)} ${team.xGConceded.toFixed(2)} xG/game`);
});

// Calculate percentiles for classification
const xGForValues = teams.map(t => t.xGFor).sort((a, b) => b - a);
const xGConcededValues = teams.map(t => t.xGConceded).sort((a, b) => a - b);

const getPercentile = (arr, p) => {
  const index = Math.floor((p / 100) * (arr.length - 1));
  return arr[index];
};

// Define FDR categories (5 levels: 1=Very Easy, 2=Easy, 3=Medium, 4=Hard, 5=Very Hard)
const offensiveThresholds = {
  veryHard: getPercentile(xGForValues, 20), // Top 20% - hardest to defend against
  hard: getPercentile(xGForValues, 40),     // Top 40%
  medium: getPercentile(xGForValues, 60),   // Top 60%
  easy: getPercentile(xGForValues, 80)      // Top 80%
};

const defensiveThresholds = {
  veryHard: getPercentile(xGConcededValues, 20), // Bottom 20% - hardest to score against
  hard: getPercentile(xGConcededValues, 40),     // Bottom 40%
  medium: getPercentile(xGConcededValues, 60),   // Bottom 60%
  easy: getPercentile(xGConcededValues, 80)      // Bottom 80%
};

console.log('\n🎯 SUGGESTED FDR CLASSIFICATIONS');
console.log('=' .repeat(60));

console.log('\n📈 OFFENSIVE FDR (How hard is it to defend against this team?)');
console.log('5 = Very Hard (Top 20%) | 4 = Hard (20-40%) | 3 = Medium (40-60%) | 2 = Easy (60-80%) | 1 = Very Easy (Bottom 20%)');
console.log('-' .repeat(80));

const offensiveClassifications = {};
sortedByXGFor.forEach((team, index) => {
  let fdr = 1;
  if (team.xGFor >= offensiveThresholds.veryHard) fdr = 5;
  else if (team.xGFor >= offensiveThresholds.hard) fdr = 4;
  else if (team.xGFor >= offensiveThresholds.medium) fdr = 3;
  else if (team.xGFor >= offensiveThresholds.easy) fdr = 2;
  
  offensiveClassifications[team.name] = fdr;
  console.log(`${fdr} | ${team.name.padEnd(20)} ${team.xGFor.toFixed(2)} xG/game`);
});

console.log('\n🛡️  DEFENSIVE FDR (How hard is it to score against this team?)');
console.log('5 = Very Hard (Bottom 20%) | 4 = Hard (20-40%) | 3 = Medium (40-60%) | 2 = Easy (60-80%) | 1 = Very Easy (Top 20%)');
console.log('-' .repeat(80));

const defensiveClassifications = {};
sortedByXGConceded.forEach((team, index) => {
  let fdr = 1;
  if (team.xGConceded <= defensiveThresholds.veryHard) fdr = 5;
  else if (team.xGConceded <= defensiveThresholds.hard) fdr = 4;
  else if (team.xGConceded <= defensiveThresholds.medium) fdr = 3;
  else if (team.xGConceded <= defensiveThresholds.easy) fdr = 2;
  
  defensiveClassifications[team.name] = fdr;
  console.log(`${fdr} | ${team.name.padEnd(20)} ${team.xGConceded.toFixed(2)} xG/game`);
});

console.log('\n📊 THRESHOLD VALUES');
console.log('=' .repeat(40));
console.log('Offensive FDR Thresholds:');
console.log(`  Very Hard (5): ≥ ${offensiveThresholds.veryHard.toFixed(2)} xG/game`);
console.log(`  Hard (4):     ≥ ${offensiveThresholds.hard.toFixed(2)} xG/game`);
console.log(`  Medium (3):   ≥ ${offensiveThresholds.medium.toFixed(2)} xG/game`);
console.log(`  Easy (2):     ≥ ${offensiveThresholds.easy.toFixed(2)} xG/game`);
console.log(`  Very Easy (1): < ${offensiveThresholds.easy.toFixed(2)} xG/game`);

console.log('\nDefensive FDR Thresholds:');
console.log(`  Very Hard (5): ≤ ${defensiveThresholds.veryHard.toFixed(2)} xG/game`);
console.log(`  Hard (4):     ≤ ${defensiveThresholds.hard.toFixed(2)} xG/game`);
console.log(`  Medium (3):   ≤ ${defensiveThresholds.medium.toFixed(2)} xG/game`);
console.log(`  Easy (2):     ≤ ${defensiveThresholds.easy.toFixed(2)} xG/game`);
console.log(`  Very Easy (1): > ${defensiveThresholds.easy.toFixed(2)} xG/game`);

// Generate the FDR mapping object
const fdrMapping = {};
Object.keys(offensiveClassifications).forEach(teamName => {
  fdrMapping[teamName] = {
    offensive: offensiveClassifications[teamName],
    defensive: defensiveClassifications[teamName]
  };
});

console.log('\n🔧 FDR MAPPING OBJECT (for code implementation):');
console.log('=' .repeat(50));
console.log(JSON.stringify(fdrMapping, null, 2));

// Summary statistics
const avgOffensiveFDR = Object.values(offensiveClassifications).reduce((sum, fdr) => sum + fdr, 0) / Object.keys(offensiveClassifications).length;
const avgDefensiveFDR = Object.values(defensiveClassifications).reduce((sum, fdr) => sum + fdr, 0) / Object.keys(defensiveClassifications).length;

console.log('\n📈 SUMMARY STATISTICS');
console.log('=' .repeat(30));
console.log(`Average Offensive FDR: ${avgOffensiveFDR.toFixed(2)}`);
console.log(`Average Defensive FDR: ${avgDefensiveFDR.toFixed(2)}`);
console.log(`Total teams classified: ${Object.keys(fdrMapping).length}`);
