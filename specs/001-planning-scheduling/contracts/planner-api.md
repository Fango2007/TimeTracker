# Planner API Contracts

**Date**: 2024-07-17 | **Feature**: 001-planning-scheduling

## API Endpoints

### Configuration Management

#### `POST /api/planner/config/day-structure`
**Description**: Set day structure configuration
**Request Body**:
```json
{
  "dayStartTimes": {
    "monday": "09:00",
    "tuesday": "09:00",
    "wednesday": "09:00",
    "thursday": "09:00",
    "friday": "09:00",
    "saturday": "10:00",
    "sunday": "00:00"
  },
  "lunchBreakStartTimes": {
    "monday": "12:00",
    "tuesday": "12:00",
    "wednesday": "12:00",
    "thursday": "12:00",
    "friday": "12:00",
    "saturday": "12:30",
    "sunday": "00:00"
  },
  "lunchBreakDurations": {
    "monday": 30,
    "tuesday": 30,
    "wednesday": 30,
    "thursday": 30,
    "friday": 30,
    "saturday": 30,
    "sunday": 0
  }
}
```
**Response**: `200 OK` or `400 Bad Request` with validation errors
**Success Response**:
```json
{
  "success": true,
  "message": "Day structure configuration saved successfully"
}
```
**Error Response**:
```json
{
  "success": false,
  "errors": [
    {
      "field": "lunchBreakStartTimes.monday",
      "message": "Lunch break cannot start before day start"
    }
  ]
}
```

#### `GET /api/planner/config/day-structure`
**Description**: Get current day structure configuration
**Response**: `200 OK`
```json
{
  "dayStartTimes": {
    "monday": "09:00",
    "tuesday": "09:00",
    "wednesday": "09:00",
    "thursday": "09:00",
    "friday": "09:00",
    "saturday": "10:00",
    "sunday": "00:00"
  },
  "lunchBreakStartTimes": {
    "monday": "12:00",
    "tuesday": "12:00",
    "wednesday": "12:00",
    "thursday": "12:00",
    "friday": "12:00",
    "saturday": "12:30",
    "sunday": "00:00"
  },
  "lunchBreakDurations": {
    "monday": 30,
    "tuesday": 30,
    "wednesday": 30,
    "thursday": 30,
    "friday": 30,
    "saturday": 30,
    "sunday": 0
  }
}
```

### Feasibility Assessment

#### `GET /api/planner/feasibility`
**Description**: Get daily schedule feasibility
**Query Parameters**:
- `date` (optional): "YYYY-MM-DD" (defaults to today)
**Response**: `200 OK`
```json
{
  "date": "2024-07-17",
  "totalDurationMinutes": 360,
  "dailyWorkTargetMinutes": 420,
  "feasibilityStatus": "feasible",
  "colorIndicator": "green",
  "activitiesCount": 4,
  "cognitiveLoadDistribution": {
    "intense": 120,
    "moderate": 180,
    "light": 60
  }
}
```

#### `GET /api/planner/feasibility/indicator`
**Description**: Get feasibility color indicator only
**Query Parameters**:
- `date` (optional): "YYYY-MM-DD" (defaults to today)
**Response**: `200 OK`
```json
{
  "date": "2024-07-17",
  "indicator": "green"
}
```

### Agenda Generation

#### `POST /api/planner/agenda/generate`
**Description**: Generate weekly agenda
**Request Body**:
```json
{
  "weekId": "2024-W29",
  "weekStartDate": "2024-07-15"
}
```
**Response**: `200 OK`
```json
{
  "weekId": "2024-W29",
  "weekStartDate": "2024-07-15",
  "days": {
    "2024-07-15": [
      {
        "id": "AGE-001",
        "activityId": "ACT-001",
        "plannedStart": "09:00",
        "plannedEnd": "10:30",
        "durationMinutes": 90,
        "status": "planned",
        "cognitiveLoad": "intense",
        "isDuringLunchBreak": false
      }
    ],
    "2024-07-16": [
      {
        "id": "AGE-002",
        "activityId": "ACT-002",
        "plannedStart": "09:00",
        "plannedEnd": "11:00",
        "durationMinutes": 120,
        "status": "planned",
        "cognitiveLoad": "moderate",
        "isDuringLunchBreak": false
      }
    ]
  },
  "dayStructureConstraints": {
    "2024-07-15": {
      "date": "2024-07-15",
      "dayStartTime": "09:00",
      "lunchBreakStart": "12:00",
      "lunchBreakEnd": "12:30",
      "workWindowEnd": "17:30",
      "totalAvailableMinutes": 450,
      "isWorkingDay": true
    }
  }
}
```

#### `GET /api/planner/agenda/current`
**Description**: Get current weekly agenda
**Response**: `200 OK` (same format as generate response)

### Agenda Adjustments

#### `POST /api/planner/agenda/adjust`
**Description**: Adjust agenda block timing
**Request Body**:
```json
{
  "agendaEntryId": "AGE-001",
  "newStartTime": "08:45",
  "adjustmentType": "early-start"
}
```
**Response**: `200 OK`
```json
{
  "success": true,
  "adjustedEntries": ["AGE-001", "AGE-002", "AGE-003"],
  "message": "Agenda adjusted successfully"
}
```

#### `POST /api/planner/agenda/swap`
**Description**: Swap two agenda blocks
**Request Body**:
```json
{
  "entryId1": "AGE-001",
  "entryId2": "AGE-002"
}
```
**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Agenda blocks swapped successfully"
}
```

### Validation

#### `POST /api/planner/validate/day-structure`
**Description**: Validate day structure configuration
**Request Body**:
```json
{
  "dayStartTime": "09:00",
  "lunchBreakStartTime": "12:00",
  "lunchBreakDuration": 30
}
```
**Response**: `200 OK`
```json
{
  "isValid": true,
  "message": "Configuration is valid"
}
```
**Error Response**: `400 Bad Request`
```json
{
  "isValid": false,
  "errors": [
    "Lunch break cannot start before day start",
    "Invalid time format. Use HH:MM"
  ]
}
```

#### `GET /api/planner/validate/time-format`
**Description**: Validate time format
**Query Parameters**:
- `time`: Time string to validate
**Response**: `200 OK`
```json
{
  "time": "09:00",
  "isValid": true,
  "message": "Valid time format"
}
```
**Error Response**: `400 Bad Request`
```json
{
  "time": "9 AM",
  "isValid": false,
  "message": "Invalid time format. Use HH:MM"
}
```

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| 400 | Bad Request | Check request format and parameters |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Validation failed, see error details |
| 500 | Internal Server Error | System error, check logs |

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... }, // Response data
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "lunchBreakStartTime",
        "message": "Lunch break cannot start before day start"
      }
    ]
  }
}
```

## API Contract Completion

✅ All endpoints defined with request/response formats
✅ Error handling specified
✅ Validation rules documented
✅ Response formats standardized

**Status**: Ready for implementation