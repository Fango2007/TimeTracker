# Unused Functions in planner.js

## Overview
The `planner.js` file contains many functions for advanced time management features, but most of these functions are not currently wired into the UI. Only the `checkDailyFeasibility` function is being used in the `updateFeasibilityIndicator` function in `index.html`.

## Unused Functions

### Time Utility Functions
1. **`parseTime(timeStr)`**
   - **Purpose**: Parses time string in HH:MM format to minutes since midnight
   - **Unused**: Time parsing is done elsewhere in the application

2. **`formatTime(minutes)`**
   - **Purpose**: Formats minutes since midnight to HH:MM string
   - **Unused**: Time formatting is handled by other utility functions

3. **`addMinutes(timeStr, minutesToAdd)`**
   - **Purpose**: Adds minutes to a time string
   - **Unused**: Time arithmetic is done elsewhere

### Configuration Management
4. **`loadConfig()`**
   - **Purpose**: Loads configuration from localStorage
   - **Unused**: Configuration is loaded through other mechanisms

5. **`getDefaultConfig()`**
   - **Purpose**: Gets default configuration with all settings
   - **Unused**: Default configuration is created elsewhere

6. **`saveConfig(newConfig)`**
   - **Purpose**: Saves configuration to localStorage
   - **Unused**: Configuration saving is handled by other functions

7. **`validateDayStructure(configToValidate)`**
   - **Purpose**: Validates day structure configuration
   - **Unused**: Validation is done through other mechanisms

### Day Structure Utilities
8. **`getDayStructure(dateStr)`**
   - **Purpose**: Gets day structure for a specific date including work windows and breaks
   - **Unused**: Day structure information is not displayed in the UI

### Feasibility Calculation
9. **`calculateFeasibility(dateStr)`**
   - **Purpose**: Calculates daily schedule feasibility including cognitive load distribution
   - **Unused**: Feasibility calculation is only done through `checkDailyFeasibility`

10. **`getFeasibilityIndicator(feasibility)`**
    - **Purpose**: Gets color indicator for feasibility status
    - **Unused**: Indicator logic is implemented inline in `updateFeasibilityIndicator`

11. **`getTodayDate()`**
    - **Purpose**: Gets today's date in YYYY-MM-DD format
    - **Unused**: Date handling is done elsewhere

### Cognitive Load Management
12. **`getCognitiveLoadOrder()`**
    - **Purpose**: Gets cognitive load order (intense first)
    - **Unused**: Cognitive load ordering is not used in the current UI

### Global Agenda Generation
13. **`generateGlobalAgenda()`**
    - **Purpose**: Generates global work distribution across future days
    - **Unused**: This advanced scheduling feature is not implemented in the UI

14. **`setupRealTimeUpdates()`**
    - **Purpose**: Sets up real-time updates for feasibility calculations
    - **Unused**: Real-time updates are implemented directly in the index.html

### Configuration Management (Public API)
15. **`setDayStructure(dayStructureConfig)`**
    - **Purpose**: Sets day structure configuration
    - **Unused**: No UI for configuring day structure

16. **`getDayStructure(dateStr)`**
    - **Purpose**: Gets day structure for a specific date
    - **Unused**: No UI for displaying day structure

17. **`validateDayStructure(configToValidate)`**
    - **Purpose**: Validates day structure configuration
    - **Unused**: No UI for validating configuration

### Feasibility Calculation (Public API)
18. **`checkDailyFeasibility(dateStr)`**
    - **Purpose**: Checks daily schedule feasibility
    - **Used**: This is the only function currently used in the UI

19. **`getFeasibilityIndicator(dateStr)`**
    - **Purpose**: Gets feasibility color indicator
    - **Unused**: Indicator logic is implemented inline

### Agenda Management
20. **`getGlobalAgenda()`**
    - **Purpose**: Gets current global agenda
    - **Unused**: No UI for displaying global agenda

21. **`generateWeeklyAgenda(weekStartDate)`**
    - **Purpose**: Generates weekly execution agenda with time blocks
    - **Unused**: Weekly agenda generation is not implemented in the UI

22. **`getWeekId(date)`**
    - **Purpose**: Gets ISO week ID (YYYY-Www)
    - **Unused**: Week identification is not used in the current UI

### Agenda Block Management
23. **`adjustAgendaBlock(entryId, newStartTime)`**
    - **Purpose**: Adjusts agenda block timing
    - **Unused**: No UI for adjusting agenda blocks

24. **`swapAgendaBlocks(entryId1, entryId2)`**
    - **Purpose**: Swaps two agenda blocks
    - **Unused**: No UI for swapping agenda blocks

25. **`updateAgendaBlockStatus(entryId, newStatus)`**
    - **Purpose**: Updates agenda block status
    - **Unused**: No UI for updating agenda block status

### Flexible Schedule Adjustments
26. **`startTimerEarly(entryId, actualStartTime, currentAgenda)`**
    - **Purpose**: Handles early timer start with agenda adjustments
    - **Unused**: No UI for flexible schedule adjustments

27. **`detectEarlyStart(actualStartTime, plannedStartTime)`**
    - **Purpose**: Detects if timer was started early
    - **Unused**: Early start detection is not implemented in the UI

### Utility Functions
28. **`validateTimeFormat(timeStr)`**
    - **Purpose**: Validates time format
    - **Unused**: Time validation is done elsewhere

29. **`init()`**
    - **Purpose**: Initializes configuration
    - **Unused**: Initialization is handled through other mechanisms

## Conclusion
The `planner.js` file contains comprehensive functionality for advanced time management features, but only a small portion of it is currently being used in the UI. Most of these unused functions represent advanced features that could be implemented in future iterations of the application.

The most significant unused features include:
- Global and weekly agenda generation
- Agenda block management and adjustments
- Cognitive load management
- Flexible schedule adjustments
- Comprehensive day structure configuration

These features could be valuable additions to future versions of TimeWise.
