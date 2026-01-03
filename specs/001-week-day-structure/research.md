# Research: Week & Day Structure Management

## Summary

This research document outlines the technical approach for implementing the Week & Day Structure Management feature in TimeWise. The feature requires extending the user configuration to support weekly rhythm definitions, daily working windows, and day-specific overrides while maintaining backward compatibility with existing data.

## Technical Approach

### Data Model Extensions

Based on the feature requirements and existing data model, we need to extend the `UserConfig` structure to include:

1. **Weekly Rhythm Configuration**:
   - `weeklyRhythmConfig`: Object containing weekday and weekend profiles
   - Each profile includes working window parameters (start, end, lunch break, short break)

2. **Day Overrides**:
   - `dayOverrides`: Map of specific dates to override configurations
   - Overrides should automatically expire after the specified date

### Working Window Definition

Each daily working window needs to include:
- `workDayStart`: Start time in HH:MM format (local timezone)
- `workDayEnd`: End time in HH:MM format (local timezone)  
- `lunchBreakStart`: Lunch break start time in HH:MM format
- `lunchBreakEnd`: Lunch break end time in HH:MM format
- `shortBreakMinutes`: Duration of short break between activities (minutes)

### Validation Requirements

1. **Time Constraints**:
   - Work day start must be before work day end
   - Lunch break must be within work day hours
   - Lunch break must not overlap with work day start/end times
   - All times should be in valid HH:MM format

2. **Override Management**:
   - Overrides should only apply to the exact date specified
   - Conflicting overrides should resolve by last-saved precedence
   - Overrides should automatically expire after the specified date

### Integration Points

1. **Agenda Scheduling**:
   - Agenda entries must be constrained to valid working windows
   - Activities cannot be scheduled outside of allowed time ranges

2. **Session Validation**:
   - Session start/end times must fall within working windows
   - System should prevent scheduling during lunch breaks

3. **UI Integration**:
   - Settings menu needs new sections for weekly rhythm configuration
   - Date-specific override interface
   - Visual indicators for different day types

### Implementation Strategy

1. **Backward Compatibility**:
   - Existing user configurations should continue to work without modification
   - New fields should be optional with sensible defaults
   - Legacy code should not break with new configuration structures

2. **Data Persistence**:
   - All new configuration data should persist in the existing `userConfig` localStorage key
   - Override data should be stored with proper date-based keying
   - Data validation should be performed during save operations

3. **Performance Considerations**:
   - Configuration loading should be fast (under 100ms)
   - Date-based lookups should be efficient
   - Memory usage should remain minimal

## Decisions

### Decision: Configuration Storage Location
**Decision**: Store new configuration in existing `userConfig` localStorage key
**Rationale**: This maintains backward compatibility and leverages existing persistence mechanisms. The existing `userConfig` structure can be extended without requiring changes to the storage layer.
**Alternatives considered**: Separate localStorage keys for each configuration type - rejected due to increased complexity and potential for data inconsistencies.

### Decision: Time Format
**Decision**: Use HH:MM format for all time configurations in local timezone
**Rationale**: This matches existing application patterns and is user-friendly. It aligns with how time is displayed and handled elsewhere in the application.
**Alternatives considered**: ISO 8601 time formats - rejected due to complexity and less user-friendly nature.

### Decision: Override Expiration
**Decision**: Automatically expire day-specific overrides after the specified date
**Rationale**: This prevents accumulation of stale data and ensures users have clear expectations about when overrides apply.
**Alternatives considered**: Manual removal of overrides - rejected due to user experience concerns.

### Decision: Validation Approach
**Decision**: Implement comprehensive validation during save operations with clear user feedback
**Rationale**: This ensures data integrity and provides helpful error messages for users when they make invalid configurations.
**Alternatives considered**: Runtime validation - rejected due to performance concerns and potential for inconsistent states.

### Decision: Working Window Integration
**Decision**: Integrate working window validation into existing agenda and session logic
**Rationale**: This ensures consistent behavior across the application without requiring major architectural changes.
**Alternatives considered**: Separate validation layer - rejected due to increased complexity.

## Implementation Details

### Extended UserConfig Structure

```javascript
type ExtendedUserConfig = {
  soundEnabled: boolean;
  
  defaultSessionMaxMinutes: number;
  defaultDailyMaxMinutes: number;
  
  dailyWorkTargets: Record<Weekday, number>; // hours per day (integer or float, per your spec)
  
  weekStart: Weekday;
  
  // New fields for week & day structure management
  weeklyRhythmConfig: {
    weekdayProfile: {
      workDayStart: string;      // HH:MM format
      workDayEnd: string;        // HH:MM format
      lunchBreakStart: string;   // HH:MM format  
      lunchBreakEnd: string;     // HH:MM format
      shortBreakMinutes: number; // minutes
    },
    weekendProfile: {
      workDayStart: string;      // HH:MM format
      workDayEnd: string;        // HH:MM format
      lunchBreakStart: string;   // HH:MM format  
      lunchBreakEnd: string;     // HH:MM format
      shortBreakMinutes: number; // minutes
    }
  },
  
  dayOverrides: Record<string, {
    workDayStart: string;
    workDayEnd: string;
    lunchBreakStart: string;
    lunchBreakEnd: string;
    shortBreakMinutes: number;
  }>
};
```

### Working Window Calculation Logic

The system will determine the appropriate working window for a given date by:
1. Check if there's a day-specific override for that date
2. If not, use the appropriate weekday/weekend profile based on the day of the week
3. Validate that all times are properly formatted and don't overlap
4. Apply the working window constraints to scheduling and session creation

### Date Handling

- Date format: YYYY-MM-DD (as used throughout the existing codebase)
- Time format: HH:MM (24-hour format, local timezone)
- Override expiration: Automatically remove overrides after the specified date
- Timezone handling: All times are stored and processed in local timezone as per existing patterns

### Validation Rules

1. Time format validation: HH:MM (00:00 to 23:59)
2. Time ordering validation: workDayStart < lunchBreakStart < lunchBreakEnd < workDayEnd
3. Time range validation: All times must be within 00:00-23:59
4. Numeric validation: shortBreakMinutes must be a non-negative number
5. Override date validation: Override dates must be valid future dates

### UI Requirements

1. Settings panel with:
   - Week rhythm configuration section
   - Weekday vs weekend profile settings
   - Lunch break configuration
   - Short break configuration
   - Day-specific override management
2. Visual indicators for different day types in agenda view
3. Error messaging for invalid configurations

## Risks and Mitigation

### Risk: Backward Compatibility Issues
**Mitigation**: Implement optional fields with sensible defaults, ensure existing code paths remain functional

### Risk: Performance Impact of Date Lookups
**Mitigation**: Cache working window calculations where appropriate, use efficient date-based keying

### Risk: Data Validation Complexity
**Mitigation**: Implement comprehensive unit tests, provide clear error messages, validate at save time

### Risk: User Confusion with Overrides
**Mitigation**: Clear UI indicators, automatic expiration notifications, intuitive override management

## Next Steps

1. Create data-model.md with extended UserConfig type
2. Implement data validation and persistence logic
3. Update UI components for configuration management
4. Integrate working window constraints into agenda and session logic
5. Add unit tests for all new functionality