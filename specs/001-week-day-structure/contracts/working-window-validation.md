# Working Window Validation Schema

## Overview
This document defines the validation rules and constraints for working windows in TimeWise's weekly rhythm configuration system.

## Validation Rules

### Time Format Validation
- All time fields must be in HH:MM format (24-hour)
- Hours must be between 00-23
- Minutes must be between 00-59
- Format must match regex: `^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$`

### Logical Constraint Validation

#### Work Day Constraints
- `workDayStart` < `workDayEnd`
- Both times must be valid (00:00 to 23:59)

#### Lunch Break Constraints
- `lunchBreakStart` must be between `workDayStart` and `lunchBreakEnd`
- `lunchBreakEnd` must be between `lunchBreakStart` and `workDayEnd`
- Lunch break must not overlap with work day start/end times
- Lunch break must be within working day hours

#### Break Duration Constraints
- `shortBreakMinutes` must be a non-negative integer
- Must be >= 0

### Date Validation
- Override dates must be valid dates in YYYY-MM-DD format
- Override dates must be future dates (relative to current date)
- Override dates must not be in the past
- Date format must match regex: `^\d{4}-\d{2}-\d{2}$`

## Validation Functions

### validateTimeFormat(time)
**Parameters**: `time` (string) - time in HH:MM format
**Returns**: boolean - true if valid, false otherwise

### validateWorkingWindow(window)
**Parameters**: `window` (WorkingWindow object)
**Returns**: { valid: boolean, errors: string[] }

### validateOverrideDate(date)
**Parameters**: `date` (string) - date in YYYY-MM-DD format
**Returns**: boolean - true if valid, false otherwise

### validateTimeConstraints(workDayStart, lunchBreakStart, lunchBreakEnd, workDayEnd)
**Parameters**: All time values in HH:MM format
**Returns**: boolean - true if valid, false otherwise

## Example Valid Configurations

### Weekday Profile
```json
{
  "workDayStart": "09:00",
  "workDayEnd": "17:00",
  "lunchBreakStart": "12:30",
  "lunchBreakEnd": "13:30",
  "shortBreakMinutes": 5
}
```

### Weekend Profile
```json
{
  "workDayStart": "10:00",
  "workDayEnd": "16:00",
  "lunchBreakStart": "12:00",
  "lunchBreakEnd": "13:00",
  "shortBreakMinutes": 10
}
```

## Example Invalid Configurations

### Invalid Time Format
```json
{
  "workDayStart": "25:00",  // Invalid hour
  "workDayEnd": "17:00",
  "lunchBreakStart": "12:30",
  "lunchBreakEnd": "13:30",
  "shortBreakMinutes": 5
}
```

### Invalid Constraint
```json
{
  "workDayStart": "09:00",
  "workDayEnd": "17:00",
  "lunchBreakStart": "16:00",  // Lunch break after work day ends
  "lunchBreakEnd": "18:00",
  "shortBreakMinutes": 5
}
```

## Integration Points

### Agenda Entry Validation
When creating or modifying agenda entries:
1. Determine the working window for the entry's date
2. Validate that planned start/end times fall within the working window
3. Ensure lunch break times are not scheduled
4. Apply short break duration between consecutive activities

### Session Validation
When starting a new session:
1. Determine the working window for the session's date
2. Validate that session start time falls within working window
3. Prevent sessions from starting during lunch breaks
4. Apply break duration constraints between activities

## Error Messages

### Time Format Errors
- "Invalid time format. Please use HH:MM format (e.g., 09:30)"
- "Hours must be between 00-23"
- "Minutes must be between 00-59"

### Constraint Errors
- "Work day start time must be before work day end time"
- "Lunch break must be within work day hours"
- "Lunch break start time must be before lunch break end time"
- "Short break duration must be non-negative"

### Date Errors
- "Override date must be a valid future date"
- "Date format must be YYYY-MM-DD"