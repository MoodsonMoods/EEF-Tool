# FDR Classifications for 2025-2026 Eredivisie Season

## Overview
This document outlines the Fixture Difficulty Rating (FDR) classifications for the 2025-2026 Eredivisie season, based on actual xG data scraped from FBref.

## Data Source
- **Source**: FBref via Puppeteer web scraping
- **Date**: September 19, 2025
- **Games Played**: 5 games per team (early season data)
- **Teams**: 17 teams (excluding promoted team Heracles Almelo)

## FDR Scale
- **5**: Very Hard (Top/Bottom 20%)
- **4**: Hard (20-40%)
- **3**: Medium (40-60%)
- **2**: Easy (60-80%)
- **1**: Very Easy (Bottom/Top 20%)

## Offensive FDR (How hard is it to defend against this team?)

### Thresholds
- **Very Hard (5)**: ≥ 2.04 xG/game
- **Hard (4)**: ≥ 1.64 xG/game
- **Medium (3)**: ≥ 1.40 xG/game
- **Easy (2)**: ≥ 1.18 xG/game
- **Very Easy (1)**: < 1.18 xG/game

### Classifications
| FDR | Teams | xG/game |
|-----|-------|---------|
| 5 | N.E.C., AZ, Feyenoord, PSV | 2.68, 2.20, 2.04, 2.04 |
| 4 | Ajax, sc Heerenveen, FC Twente | 1.98, 1.88, 1.64 |
| 3 | FC Utrecht, Go Ahead Eagles, FC Groningen, Telstar | 1.58, 1.54, 1.40, 1.40 |
| 2 | Sparta Rotterdam, PEC Zwolle | 1.30, 1.18 |
| 1 | Fortuna Sittard, Excelsior, NAC Breda, FC Volendam | 1.16, 1.06, 1.06, 0.68 |

## Defensive FDR (How hard is it to score against this team?)

### Thresholds
- **Very Hard (5)**: ≤ 1.15 xG/game
- **Hard (4)**: ≤ 1.36 xG/game
- **Medium (3)**: ≤ 1.44 xG/game
- **Easy (2)**: ≤ 1.76 xG/game
- **Very Easy (1)**: > 1.76 xG/game

### Classifications
| FDR | Teams | xG Conceded/game |
|-----|-------|------------------|
| 5 | AZ, Feyenoord, Ajax, sc Heerenveen | 1.15, 0.68, 0.66, 1.04 |
| 4 | PSV, FC Twente, FC Utrecht | 1.36, 1.16, 1.26 |
| 3 | N.E.C., Telstar, PEC Zwolle | 1.40, 1.44, 1.43 |
| 2 | FC Groningen, Fortuna Sittard, FC Volendam | 1.56, 1.76, 1.56 |
| 1 | Go Ahead Eagles, Sparta Rotterdam, Excelsior, NAC Breda | 1.92, 1.90, 2.14, 2.42 |

## Key Insights

### Top Performers
- **NEC Nijmegen**: Highest xG For (2.68/game) - Very Hard offensively
- **Ajax**: Best defensive record (0.66 xG Conceded/game) - Very Hard defensively
- **AZ Alkmaar**: Balanced excellence (2.20 xG For, 1.15 xG Conceded) - Very Hard both ways

### Biggest Changes from 2023-24
1. **NEC Nijmegen**: Emerged as offensive powerhouse (2.68 xG/game)
2. **AZ Alkmaar**: Improved significantly in both attack and defense
3. **Feyenoord**: Now Very Hard both offensively and defensively
4. **PSV**: Upgraded to Very Hard offensively

### Teams to Target
- **Easy Defenses**: Go Ahead Eagles, Sparta Rotterdam, Excelsior, NAC Breda
- **Weak Attacks**: Fortuna Sittard, Excelsior, NAC Breda, FC Volendam

## Implementation
The FDR classifications have been automatically updated in the `FDRCalculator` class in `src/lib/fdr-calculator.ts` and are ready for use in the application.

## Data Quality Notes
- Based on 5 games per team (early season)
- Promoted team Heracles Almelo excluded (insufficient data)
- xG values are per-game averages calculated from total season values
- Data sourced from FBref via Puppeteer web scraping
