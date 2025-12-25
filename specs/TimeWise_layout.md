# TimeWise Application Layout and Functionality

## Overview
TimeWise is a time management application designed to help users track their activities, manage their time effectively, and analyze their productivity. The application is organized into several modules, each with its own layout and functionality.

## Navigation
The application features a navigation bar at the top with links to the following modules:
- **Timer**: The main dashboard for tracking time.
- **Activities**: Manage and view activities.
- **Statistics**: View statistics and charts.
- **History**: View past sessions.
- **Settings**: Configure application settings.

## Modules

### Timer Module
#### Layout
The Timer module is the main dashboard of the application. It consists of the following sections:

1. **Dashboard Overview**:
   - Displays the first timer of the day.
   - Shows high-priority activities and their time spent.
   - Displays today's target progress.
   - Shows inactivity time.
   - Indicates schedule feasibility.

2. **Timer Controls**:
   - Displays the current activity and its details.
   - Shows the timer display.
   - Includes progress bars for session and daily max limits.
   - Provides buttons for starting, pausing, resuming, stopping, and resetting the timer.

3. **Priority Lists**:
   - Three columns for high, medium, and low priority activities.
   - Each activity can be dragged and dropped to reorder or change priority.

#### Functions Called in Timer Module
- **`startSession(activityId)`**: Starts a new timer session for the specified activity.
- **`pause()`**: Pauses the current timer session.
- **`resume()`**: Resumes a paused timer session.
- **`stop()`**: Stops the current timer session and saves it.
- **`reset()`**: Resets the current timer session without saving.
- **`getState()`**: Returns the current state of the timer.
- **`getDailyTotalSeconds(activityId)`**: Returns the total time spent on an activity today.
- **`getElapsedSeconds()`**: Returns the elapsed time of the current session.
- **`updateFeasibilityIndicator()`**: Updates the schedule feasibility indicator.

### Activities Module
#### Layout
The Activities module allows users to create, update, and manage their activities. It consists of the following sections:

1. **Activity Form**:
   - Fields for description, label, category, priority, cognitive load, daily max, session max, estimated duration, deadline, and scheduled days.
   - Buttons for submitting or canceling the form.

2. **Activities Table**:
   - Displays a list of all activities with their details.
   - Includes columns for label, description, estimate/deadline, scheduled days, category, priority, cognitive load, daily max, session max, status, and actions.
   - Buttons for editing, archiving, and deleting activities.

#### Functions Called in Activities Module
- **`createActivity(payload)`**: Creates a new activity with the provided details.
- **`updateActivity(id, updates)`**: Updates an existing activity with the provided details.
- **`archiveActivity(id)`**: Archives an activity.
- **`deleteActivity(id)`**: Deletes an activity.
- **`reorderActivities(orderedIds)`**: Reorders activities based on the provided list of IDs.
- **`reorderAndReprioritize(priorityBuckets)`**: Reorders and reprioritizes activities based on the provided priority buckets.
- **`getActiveActivities()`**: Returns a list of active (non-archived) activities.
- **`totalTrackedMinutes(activityId)`**: Returns the total time tracked for an activity.
- **`completionPercentage(activity)`**: Returns the completion percentage of an activity based on its estimated duration.

### Statistics Module
#### Layout
The Statistics module provides visualizations and summaries of tracked time. It consists of the following sections:

1. **Statistics Chart**:
   - Displays a bar chart showing tracked time and inactivity.
   - Allows users to switch between daily, weekly, and monthly views.
   - Provides navigation buttons to view older or newer data.

2. **Statistics Table**:
   - Displays detailed information about tracked time for each activity.
   - Includes columns for activity, category, priority, cognitive load, status, and total time.

#### Functions Called in Statistics Module
- **`getStats(period, offset)`**: Retrieves statistics data for the specified period and offset.
- **`renderStats(period, resetOffset)`**: Renders the statistics chart and table for the specified period.
- **`renderStatsTable()`**: Renders the statistics table.
- **`updateStatsChartSelection()`**: Updates the selection in the statistics chart.

### History Module
#### Layout
The History module displays a list of past sessions. It consists of the following sections:

1. **History List**:
   - Displays a list of past sessions with their details.
   - Each session includes the activity label, start time, badges for category, priority, and cognitive load, and the total duration.
   - Provides a details section for viewing intervals within each session.

#### Functions Called in History Module
- **`getHistory()`**: Retrieves the history of past sessions.
- **`renderHistory()`**: Renders the history list.

### Settings Module
#### Layout
The Settings module allows users to configure application settings. It consists of the following sections:

1. **Settings Form**:
   - Fields for default session max, default daily max, daily work targets, and week start preference.
   - Buttons for saving settings.

2. **Import/Export**:
   - Buttons for exporting data as JSON or CSV.
   - A textarea for importing JSON data.
   - Buttons for importing data.

#### Functions Called in Settings Module
- **`saveUserConfig(config)`**: Saves the user configuration.
- **`exportAll()`**: Exports all data as JSON.
- **`importAll(data)`**: Imports data from JSON.
- **`renderSettingsForm()`**: Renders the settings form.
- **`bindSettingsForm()`**: Binds event handlers to the settings form.
- **`bindImportExport()`**: Binds event handlers to the import/export buttons.

## Conclusion
The TimeWise application is a comprehensive time management tool with a well-organized layout and a wide range of functionalities. Each module is designed to provide specific features and insights, helping users manage their time effectively and analyze their productivity.
