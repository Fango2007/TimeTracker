# Quickstart: Week & Day Structure Management

## Overview
This feature enables users to configure their weekly work rhythm and daily working windows, including weekday vs weekend profiles and day-specific overrides.

## Setup Instructions

### Prerequisites
- TimeWise application running in a browser
- Existing user configuration already initialized
- Browser with localStorage support

### Configuration Steps
1. Navigate to Settings menu
2. Select "Week Structure" tab
3. Configure weekday profile settings:
   - Work day start time
   - Lunch break start time
   - Lunch break end time
   - Work day end time
   - Short break duration between activities
4. Configure weekend profile settings (similar to weekday profile)
5. Optionally create day-specific overrides for specific dates
6. Save configuration

## Data Model Integration

### User Configuration Extension
The new configuration is stored in the existing `userConfig` localStorage key under a new `weeklyRhythm` property:

```json
{
  "weeklyRhythm": {
    "weekdayProfile": {
      "workDayStart": "09:00",
      "lunchBreakStart": "12:30",
      "lunchBreakEnd": "13:30",
      "workDayEnd": "18:00",
      "shortBreakDuration": 5
    },
    "weekendProfile": {
      "workDayStart": "10:00",
      "lunchBreakStart": "13:00",
      "lunchBreakEnd": "14:00",
      "workDayEnd": "17:00",
      "shortBreakDuration": 10
    },
    "dayOverrides": {
      "2025-01-15": {
        "workDayStart": "08:00",
        "lunchBreakStart": "12:00",
        "lunchBreakEnd": "13:00",
        "workDayEnd": "16:00",
        "shortBreakDuration": 3
      }
    }
  }
}
```

## Usage Patterns

### Agenda Display
- The agenda will automatically use the configured working windows
- Different profiles for weekdays vs weekends
- Day-specific overrides applied when applicable

### Scheduling
- Activities can only be scheduled within working windows
- Lunch break constraints are enforced
- Short break durations are automatically applied between consecutive activities

### Override Management
- Overrides are automatically applied for the specified date
- Overrides automatically expire after the specified date
- Most recently saved override takes precedence for any given date

## Testing
Unit tests should cover:
- Configuration validation
- Working window calculation
- Override application logic
- Backward compatibility with existing userConfig
- Error handling for invalid inputs

Integration tests should cover:
- Full configuration workflow
- Agenda display with different profiles
- Scheduling constraints enforcement
- Override handling in various scenarios

## Development Notes
- All functionality is client-side using localStorage
- No new API endpoints required
- Extends existing `userConfig` structure
- Maintains full backward compatibility
- Follows existing TimeWise patterns and conventions
```
