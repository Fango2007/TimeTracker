# Data Model: Week & Day Structure Management

## Overview
This document defines the data structures and relationships for managing weekly and daily work patterns in the TimeWise application. The implementation extends the existing `userConfig` structure to include weekly rhythm configuration while maintaining backward compatibility.

## Key Entities

### WeeklyRhythmConfig
Represents the user's weekly work pattern configuration, including weekday and weekend profiles with specific working windows and break settings.

```typescript
type WeeklyRhythmConfig = {
  weekdayProfile: DailyWorkingWindow;
  weekendProfile: DailyWorkingWindow;
  dayOverrides: Record<string, DailyWorkingWindow>; // key: YYYY-MM-DD date string
};
```

**Constraints:**
- `weekdayProfile` and `weekendProfile` must be valid `DailyWorkingWindow` objects
- `dayOverrides` is an optional record keyed by date strings in YYYY-MM-DD format
- All date keys in `dayOverrides` must be valid dates
- Override dates should be in the future or current date (not past dates)
- Overrides should automatically expire after the specified date

### DailyWorkingWindow
Represents the working hours and break configuration for a specific day type or override.

```typescript
type DailyWorkingWindow = {
  workDayStart: string;        // HH:MM format (24-hour)
  lunchBreakStart: string;     // HH:MM format (24-hour)
  lunchBreakEnd: string;       // HH:MM format (24-hour)
  workDayEnd: string;          // HH:MM format (24-hour)
  shortBreakDuration: number;  // minutes between activities
};
```

**Constraints:**
- All time values must be in valid HH:MM format (24-hour)
- `workDayStart` must be before `lunchBreakStart`
- `lunchBreakStart` must be before `lunchBreakEnd`
- `lunchBreakEnd` must be before `workDayEnd`
- `workDayEnd` must be after `workDayStart`
- `shortBreakDuration` must be a non-negative integer (minutes)
- Lunch break must not overlap with work day start/end times
- All time constraints must be validated when configuration is saved

### DayOverride
Represents a temporary override of the standard weekly rhythm for a specific date.

```typescript
type DayOverride = {
  date: string;                // YYYY-MM-DD format
  workingWindow: DailyWorkingWindow;
  isExpired: boolean;          // Automatically set based on date comparison
};
```

**Constraints:**
- `date` must be a valid date string in YYYY-MM-DD format
- `workingWindow` must be a valid `DailyWorkingWindow` object
- `isExpired` must be calculated based on current date comparison
- Overrides should only apply to the exact date specified
- Overrides should automatically expire after the specified date

## Integration with Existing Data Model

### UserConfig Extension
The `userConfig` structure will be extended to include the new weekly rhythm configuration:

```typescript
type UserConfig = {
  soundEnabled: boolean;

  defaultSessionMaxMinutes: number;
  defaultDailyMaxMinutes: number;

  dailyWorkTargets: Record<Weekday, number>; // hours per day (integer or float, per your spec)

  weekStart: Weekday;
  
  // New properties for week/day structure management
  weeklyRhythm?: WeeklyRhythmConfig;
};
```

**Constraints:**
- The `weeklyRhythm` property is optional to maintain backward compatibility
- When `weeklyRhythm` is not present, default working windows should be used
- All existing `userConfig` fields must remain unchanged
- New configuration should integrate seamlessly with existing agenda display and scheduling logic

## Relationships

### Entity Relationships

1. **WeeklyRhythmConfig** contains:
   - `weekdayProfile` (DailyWorkingWindow)
   - `weekendProfile` (DailyWorkingWindow)
   - `dayOverrides` (Record of DayOverride objects)

2. **DailyWorkingWindow** is referenced by:
   - `weekdayProfile` in WeeklyRhythmConfig
   - `weekendProfile` in WeeklyRhythmConfig
   - `workingWindow` in DayOverride

3. **DayOverride** is referenced by:
   - `dayOverrides` in WeeklyRhythmConfig

## Data Validation Rules

### Time Validation
- All time values must be in HH:MM format (24-hour clock)
- Start times must be chronologically before end times
- Lunch break must not overlap with work day hours
- Work day end time must be after work day start time

### Configuration Validation
- `shortBreakDuration` must be a non-negative integer
- All date strings must be valid in YYYY-MM-DD format
- Override dates must be in the future or current date
- No overlapping time periods in working windows

## Storage Considerations

### localStorage Persistence
All weekly rhythm configuration data will be stored in the existing `userConfig` localStorage key:

```json
{
  "soundEnabled": true,
  "defaultSessionMaxMinutes": 50,
  "defaultDailyMaxMinutes": 120,
  "dailyWorkTargets": {
    "monday": 7,
    "tuesday": 7,
    "wednesday": 7,
    "thursday": 7,
    "friday": 7,
    "saturday": 3,
    "sunday": 0
  },
  "weekStart": "monday",
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

### Backward Compatibility
- Old versions of the application will ignore the new `weeklyRhythm` property
- Existing functionality will continue to work without changes
- New configuration data will be properly handled when loaded by updated applications

## Usage Patterns

### Agenda Display
When displaying the agenda, the system should:
1. Determine if the current day is a weekday or weekend
2. Retrieve the appropriate working window (weekdayProfile or weekendProfile)
3. Apply any applicable day overrides if they exist for the current date
4. Use the working window to constrain the visible time range and scheduling options

### Scheduling
When scheduling activities:
1. Validate that the scheduled time falls within the applicable working window
2. Enforce lunch break constraints during scheduling
3. Apply short break duration between consecutive activities
4. Show clear error messages when scheduling conflicts occur

### Override Management
When managing day-specific overrides:
1. Allow users to create overrides for specific dates
2. Automatically mark overrides as expired after the specified date
3. Apply the most recently saved override for any given date
4. Provide clear feedback when overrides are applied or expired