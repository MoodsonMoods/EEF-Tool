# FDR Start Gameweek Selection Feature

## Overview

The FDR (Fixture Difficulty Rating) analysis now supports flexible start gameweek selection, allowing managers to analyze fixtures from any chosen gameweek instead of always starting from the current gameweek.

## Features

### User Interface
- **Start Gameweek Dropdown**: Select any gameweek from 1-38 as the starting point for analysis
- **Horizon Control**: Choose how many gameweeks to analyze (3, 5, 8, or 10)
- **Visual Range Indicator**: Shows the exact gameweek range being analyzed
- **Validation**: Prevents selection of ranges that exceed gameweek 38

### Data Persistence
- **localStorage**: User's start gameweek preference is automatically saved
- **Default Behavior**: If no preference is saved, defaults to the current gameweek
- **Cross-session**: Preferences persist across browser sessions

### API Changes

#### FDR API (`/api/fdr`)
- **New Parameter**: `startGameweek` (integer, 1-38)
- **Default**: 1 (if not provided)
- **Example**: `/api/fdr?horizon=5&startGameweek=12`

#### Schedules API (`/api/schedules`)
- **New Parameter**: `startGameweek` (integer, 1-38)
- **Default**: 1 (if not provided)
- **Response**: Now includes `startGameweek` in the response data
- **Example**: `/api/schedules?horizon=5&startGameweek=12`

## Implementation Details

### Frontend Changes
- Added `selectedStartGameweek` state to FDR page
- Added UI controls for start gameweek selection
- Added validation to prevent invalid gameweek ranges
- Added localStorage persistence
- Updated API calls to include startGameweek parameter

### Backend Changes
- Updated FDR API to accept `startGameweek` parameter
- Updated Schedules API to filter fixtures based on start gameweek
- Added validation to ensure start gameweek is within valid range (1-38)

### Constraints
- `selectedStartGameweek >= 1`
- `selectedStartGameweek <= 38`
- `selectedStartGameweek + lookaheadLength - 1 <= 38`

## Usage Examples

### Example 1: Analyze GW 12-16
```
Start Gameweek: 12
Horizon: 5
Range: GW 12-16
```

### Example 2: Late Season Planning
```
Start Gameweek: 30
Horizon: 8
Range: GW 30-37
```

### Example 3: Early Season Analysis
```
Start Gameweek: 1
Horizon: 10
Range: GW 1-10
```

## Testing

A test script is available at `scripts/test-fdr-start-gameweek.js` that verifies:
- Default parameter behavior
- Start gameweek parameter functionality
- Edge cases (late gameweeks)
- Invalid parameter handling

Run with:
```bash
node scripts/test-fdr-start-gameweek.js
```

## Migration Notes

- **Backward Compatibility**: Existing API calls without `startGameweek` parameter continue to work
- **Default Behavior**: Defaults to gameweek 1 if no parameter is provided
- **User Experience**: Existing users will see their preferences reset to current gameweek on first visit

## Future Enhancements

Potential improvements for future versions:
- Multiple range selection (e.g., GW 1-5 and GW 20-25)
- Custom horizon values (not just 3, 5, 8, 10)
- Export functionality for specific gameweek ranges
- Integration with squad planner for transfer planning 