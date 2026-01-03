# Weekly Rhythm Configuration API Contract

## Overview
This document defines the API contract for managing weekly rhythm configurations in TimeWise. These endpoints would be used by the frontend to persist and retrieve user's weekly rhythm settings.

## Endpoints

### GET /api/user-config/weekly-rhythm
**Description**: Retrieve the current user's weekly rhythm configuration

**Response**:
```json
{
  "weekdayProfile": {
    "workDayStart": "09:00",
    "workDayEnd": "17:00",
    "lunchBreakStart": "12:30",
    "lunchBreakEnd": "13:30",
    "shortBreakMinutes": 5
  },
  "weekendProfile": {
    "workDayStart": "10:00",
    "workDayEnd": "16:00",
    "lunchBreakStart": "12:00",
    "lunchBreakEnd": "13:00",
    "shortBreakMinutes": 10
  },
  "dayOverrides": {
    "2025-01-15": {
      "workDayStart": "08:00",
      "workDayEnd": "18:00",
      "lunchBreakStart": "12:00",
      "lunchBreakEnd": "13:00",
      "shortBreakMinutes": 5
    }
  }
}
```

### PUT /api/user-config/weekly-rhythm
**Description**: Update the user's weekly rhythm configuration

**Request Body**:
```json
{
  "weekdayProfile": {
    "workDayStart": "09:00",
    "workDayEnd": "17:00",
    "lunchBreakStart": "12:30",
    "lunchBreakEnd": "13:30",
    "shortBreakMinutes": 5
  },
  "weekendProfile": {
    "workDayStart": "10:00",
    "workDayEnd": "16:00",
    "lunchBreakStart": "12:00",
    "lunchBreakEnd": "13:00",
    "shortBreakMinutes": 10
  },
  "dayOverrides": {
    "2025-01-15": {
      "workDayStart": "08:00",
      "workDayEnd": "18:00",
      "lunchBreakStart": "12:00",
      "lunchBreakEnd": "13:00",
      "shortBreakMinutes": 5
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Weekly rhythm configuration updated successfully"
}
```

### DELETE /api/user-config/weekly-rhythm/overrides/{date}
**Description**: Remove a day-specific override for the specified date

**Parameters**:
- `date` (string): Date in YYYY-MM-DD format

**Response**:
```json
{
  "success": true,
  "message": "Day override removed successfully"
}
```

## Validation Rules

### Time Format Validation
- All time fields must be in HH:MM format (24-hour)
- Valid range: 00:00 to 23:59
- Hours and minutes must be numeric

### Logical Constraint Validation
- `workDayStart` < `workDayEnd`
- `lunchBreakStart` must be between `workDayStart` and `lunchBreakEnd`
- `lunchBreakEnd` must be between `lunchBreakStart` and `workDayEnd`
- `shortBreakMinutes` must be a non-negative integer

### Date Validation
- Override dates must be valid future dates
- Override dates must be in YYYY-MM-DD format
- Override dates should not conflict with existing overrides (last saved takes precedence)

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid time format",
  "message": "Time fields must be in HH:MM format"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid constraints",
  "message": "Lunch break must be within work day hours"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid date",
  "message": "Override date must be a valid future date"
}
```

### 500 Internal Server Error
```json
{
  "error": "Storage error",
  "message": "Failed to save configuration"
}
```

## Implementation Notes

1. All time values are stored and processed in local timezone as per existing application patterns
2. Override data should automatically expire after the specified date
3. Validation should occur on the server side to ensure data integrity
4. API should return appropriate error messages for invalid inputs
5. The API should be backward compatible with existing user configurations
6. All operations should be atomic to maintain data consistency

## Version History

### v1.0 (Initial)
- Basic weekly rhythm configuration endpoints
- Support for weekday/weekend profiles
- Day-specific override management