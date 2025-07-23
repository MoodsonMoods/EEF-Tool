const fs = require('fs');
const path = require('path');

// Read the CSV data
const csvData = fs.readFileSync(path.join(__dirname, '..', 'eredivisie_2024_25_data.csv'), 'utf-8');
const lines = csvData.split('\n').slice(1); // Skip header

// Parse CSV data
const teamData = {};
lines.forEach(line => {
  if (line.trim()) {
    const [rk, squad, mp, w, d, l, gf, ga, gd, pts, ptsMp, xg, xga, xgd, xgd90] = line.split(',');
    teamData[squad] = {
      rank: parseInt(rk),
      matchesPlayed: parseInt(mp),
      wins: parseInt(w),
      draws: parseInt(d),
      losses: parseInt(l),
      goalsFor: parseInt(gf),
      goalsConceded: parseInt(ga),
      xG: parseFloat(xg),
      xGA: parseFloat(xga),
      xGPer90: parseFloat(xg) / parseInt(mp),
      xGAPer90: parseFloat(xga) / parseInt(mp)
    };
  }
});

// Read current team stats
const teamStatsPath = path.join(__dirname, '..', 'data', 'internal', 'team-stats-2024-25.json');
const teamStats = JSON.parse(fs.readFileSync(teamStatsPath, 'utf-8'));

// Team name mapping from CSV to team stats
const teamNameMapping = {
  'PSV Eindhoven': 'PSV',
  'Ajax': 'Ajax',
  'Feyenoord': 'Feyenoord',
  'Utrecht': 'FC Utrecht',
  'AZ Alkmaar': 'AZ',
  'Twente': 'FC Twente',
  'Go Ahead Eagles': 'Go Ahead Eagles',
  'NEC Nijmegen': 'N.E.C.',
  'Heerenveen': 'sc Heerenveen',
  'Zwolle': 'PEC Zwolle',
  'Fortuna Sittard': 'Fortuna Sittard',
  'Sparta R\'dam': 'Sparta Rotterdam',
  'Groningen': 'FC Groningen',
  'Heracles Almelo': 'Heracles Almelo',
  'NAC Breda': 'NAC Breda'
};

// Update team stats with real data
Object.entries(teamNameMapping).forEach(([csvName, statsName]) => {
  if (teamStats.teams[statsName] && teamData[csvName]) {
    const data = teamData[csvName];
    teamStats.teams[statsName] = {
      ...teamStats.teams[statsName],
      xGFor: data.xGPer90,
      xGConceded: data.xGAPer90,
      goalsFor: data.goalsFor,
      goalsConceded: data.goalsConceded,
      cleanSheets: 0, // Keep existing or calculate if needed
      failedToScore: 0, // Keep existing or calculate if needed
      homeAdvantage: teamStats.teams[statsName].homeAdvantage || 0.15,
      awayDisadvantage: teamStats.teams[statsName].awayDisadvantage || -0.10,
      matchesPlayed: data.matchesPlayed,
      wins: data.wins,
      draws: data.draws,
      losses: data.losses,
      points: data.pts,
      totalXG: data.xG,
      totalXGA: data.xGA
    };
  }
});

// Keep promoted teams with their current values
const promotedTeams = ['Telstar', 'FC Volendam', 'Heracles Almelo'];
promotedTeams.forEach(teamName => {
  if (teamStats.teams[teamName]) {
    teamStats.teams[teamName].promoted = true;
    // Keep their current xG values (0.5 xG, 2.0 xGC)
  }
});

// Update metadata
teamStats.dataSource = "Real xG data from 2023-2024 season + estimated for promoted teams";
teamStats.lastUpdated = new Date().toISOString();
teamStats.metadata.notes = [
  "xG values are based on 2023-2024 season performance (per 90 minutes)",
  "Promoted teams (Telstar, FC Volendam, Heracles Almelo) are assigned worst category FDR",
  "Home/away advantages are estimated based on historical data",
  "Data source: eredivisie_2024_25_data.csv"
];

// Write updated team stats
fs.writeFileSync(teamStatsPath, JSON.stringify(teamStats, null, 2));

console.log('✅ Team stats updated with real xG data from CSV');
console.log('📊 Updated teams:', Object.keys(teamNameMapping).join(', '));
console.log('🏆 Promoted teams kept with FDR values:', promotedTeams.join(', ')); 