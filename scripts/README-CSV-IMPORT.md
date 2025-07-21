# CSV Data Import for Eredivisie FDR

## How to Import Your CSV Data

### Step 1: Prepare Your CSV File
1. Make sure your CSV file contains the following columns (the script will try to match common variations):
   - **Team Name**: `Team`, `Squad`, `Club`, `Name`, `team`, `squad`
   - **Expected Goals For**: `xG`, `xGFor`, `xG_for`, `xg`, `xg_for`
   - **Expected Goals Against**: `xGA`, `xGConceded`, `xG_conceded`, `xga`, `xg_conceded`
   - **Goals For**: `GF`, `GoalsFor`, `goals_for`, `gf`
   - **Goals Against**: `GA`, `GoalsAgainst`, `goals_against`, `ga`
   - **Matches Played**: `MP`, `Matches`, `matches`, `games`
   - **Rank**: `Rk`, `Rank`, `rank`
   - **Wins**: `W`, `Wins`, `wins`
   - **Draws**: `D`, `Draws`, `draws`
   - **Losses**: `L`, `Losses`, `losses`
   - **Points**: `Pts`, `Points`, `points`

### Step 2: Place CSV File
1. Copy your CSV file to the `scripts/` directory
2. The script will automatically detect and use the first CSV file it finds

### Step 3: Run the Import Script
```bash
node scripts/import-csv-data.js
```

### Step 4: Update FDR API (if needed)
After importing, you may need to update the FDR API to use the new data file:

1. Open `src/app/api/fdr/route.ts`
2. Change the file path from:
   ```typescript
   const teamStatsPath = join(process.cwd(), 'data', 'internal', 'team-stats-2024-25-fbref.json');
   ```
   to:
   ```typescript
   const teamStatsPath = join(process.cwd(), 'data', 'internal', 'team-stats-2024-25-csv-import.json');
   ```

### Example CSV Format
```csv
Team,xG,xGA,GF,GA,MP,Rk,W,D,L,Pts
Ajax,75.2,45.1,89,42,34,1,25,6,3,81
PSV Eindhoven,78.9,38.7,91,35,34,2,24,7,3,79
Feyenoord,72.1,42.3,85,40,34,3,22,8,4,74
```

### What the Script Does
1. **Parses CSV**: Reads your CSV file and extracts team data
2. **Calculates Averages**: Converts total season values to per-game averages
3. **Handles Promoted Teams**: Sets xG=0 and xGC=2 for newly promoted teams
4. **Creates JSON**: Saves data in the format expected by the FDR system
5. **Provides Summary**: Shows top teams and statistics

### Output
The script will create a file at:
`data/internal/team-stats-2024-25-csv-import.json`

This file will be automatically used by the FDR system once you update the API route.

### Troubleshooting
- **No CSV files found**: Make sure your CSV file is in the `scripts/` directory
- **No team names found**: Check that your CSV has a column with team names
- **Missing xG data**: Ensure your CSV has xG and xGA columns
- **Wrong data format**: The script will show you the detected column names - adjust your CSV if needed 