# Quickstart: Planning & Scheduling Features

**Date**: 2024-07-17 | **Feature**: 001-planning-scheduling

## 🚀 Getting Started

### Prerequisites

- TimeWise application installed and running
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Basic understanding of time management concepts

### Installation

No additional installation required. The planning & scheduling features are integrated into the existing TimeWise web application.

## 📋 Basic Usage

### 1. Configure Your Day Structure

```javascript
// Set up your workday structure
const dayStructureConfig = {
  dayStartTimes: {
    monday: "09:00",    // Workday starts at 9 AM
    tuesday: "09:00",
    wednesday: "09:00",
    thursday: "09:00",
    friday: "09:00",
    saturday: "10:00",  // Weekend starts later
    sunday: "00:00"     // Non-working day
  },
  lunchBreakStartTimes: {
    monday: "12:00",    // Lunch at noon
    tuesday: "12:00",
    wednesday: "12:00",
    thursday: "12:00",
    friday: "12:00",
    saturday: "12:30",  // Weekend lunch later
    sunday: "00:00"
  },
  lunchBreakDurations: {
    monday: 30,         // 30-minute lunch break
    tuesday: 30,
    wednesday: 30,
    thursday: 30,
    friday: 30,
    saturday: 30,
    sunday: 0
  }
};

// Save configuration
TimeWise.Planner.setDayStructure(dayStructureConfig);
```

### 2. Check Daily Schedule Feasibility

```javascript
// Get today's feasibility
const todayFeasibility = TimeWise.Planner.checkDailyFeasibility();

console.log(`Today's schedule is ${todayFeasibility.status}`);
// Output: "Today's schedule is feasible" (green)
//          "Today's schedule is tight" (yellow)  
//          "Today's schedule is not feasible" (red)

// Visual indicator in UI
const feasibilityIndicator = document.getElementById('feasibility-indicator');
feasibilityIndicator.style.backgroundColor = todayFeasibility.colorIndicator;
```

### 3. Generate Weekly Agenda

```javascript
// Generate agenda for current week
const weeklyAgenda = TimeWise.Planner.generateWeeklyAgenda();

// Display agenda for Monday
const mondayAgenda = weeklyAgenda.days['2024-07-17'];
mondayAgenda.forEach(entry => {
  console.log(`${entry.plannedStart}-${entry.plannedEnd}: ${entry.activityId}`);
});

// Example output:
// 09:00-10:30: ACT-001 (Intense task)
// 10:45-12:00: ACT-002 (Moderate task)
// 13:00-14:30: ACT-003 (Light task)
```

### 4. Handle Agenda Adjustments

```javascript
// Start a timer earlier than planned
TimeWise.Planner.startTimerEarly({
  agendaEntryId: 'AGE-001',
  actualStartTime: '08:45' // 15 minutes early
});

// System automatically adjusts downstream blocks
const adjustedAgenda = TimeWise.Planner.getAdjustedAgenda();
```

## 🔧 Advanced Features

### Cognitive Load Management

```javascript
// Set cognitive load for activities
TimeWise.Activities.setCognitiveLoad('ACT-001', 'intense');
TimeWise.Activities.setCognitiveLoad('ACT-002', 'moderate');
TimeWise.Activities.setCognitiveLoad('ACT-003', 'light');

// Agenda automatically orders by cognitive load
const orderedAgenda = TimeWise.Planner.generateAgenda();
// Intense tasks scheduled first, light tasks later
```

### Global Work Distribution

```javascript
// View work distribution across future days
const globalAgenda = TimeWise.Planner.generateGlobalAgenda();

// Check distribution for upcoming deadline
const deadlineDistribution = globalAgenda.dailyDistributions['2024-07-25'];
console.log(`Remaining capacity: ${deadlineDistribution.remainingCapacityMinutes} minutes`);
```

### Error Handling

```javascript
// Validate day structure configuration
try {
  TimeWise.Planner.validateDayStructure({
    dayStart: "09:00",
    lunchBreakStart: "08:00" // ❌ Invalid: lunch before day start
  });
} catch (error) {
  console.error(error.message);
  // Output: "Lunch break cannot start before day start"
  
  // Show user-friendly guidance
  TimeWise.UI.showError("Please set lunch break after day start time");
}
```

## 📊 Examples

### Complete Configuration Example

```javascript
// Full configuration setup
const completeConfig = {
  // Existing settings
  soundEnabled: true,
  defaultSessionMaxMinutes: 50,
  defaultDailyMaxMinutes: 120,
  dailyWorkTargets: {
    monday: 7,
    tuesday: 7,
    wednesday: 7,
    thursday: 7,
    friday: 7,
    saturday: 3,
    sunday: 0
  },
  weekStart: "monday",
  
  // NEW: Day structure configuration
  dayStartTimes: {
    monday: "09:00",
    tuesday: "09:00",
    wednesday: "09:00",
    thursday: "09:00",
    friday: "09:00",
    saturday: "10:00",
    sunday: "00:00"
  },
  lunchBreakStartTimes: {
    monday: "12:00",
    tuesday: "12:00",
    wednesday: "12:00",
    thursday: "12:00",
    friday: "12:00",
    saturday: "12:30",
    sunday: "00:00"
  },
  lunchBreakDurations: {
    monday: 30,
    tuesday: 30,
    wednesday: 30,
    thursday: 30,
    friday: 30,
    saturday: 30,
    sunday: 0
  }
};

// Apply configuration
TimeWise.Config.update(completeConfig);
```

### Feasibility Check Example

```javascript
// Check feasibility with different scenarios
const scenarios = [
  {
    name: "Normal workload",
    activities: [
      {duration: 120, cognitiveLoad: "moderate"},
      {duration: 180, cognitiveLoad: "light"}
    ]
  },
  {
    name: "Heavy workload",
    activities: [
      {duration: 300, cognitiveLoad: "intense"},
      {duration: 240, cognitiveLoad: "moderate"}
    ]
  },
  {
    name: "Overloaded",
    activities: [
      {duration: 480, cognitiveLoad: "intense"},
      {duration: 120, cognitiveLoad: "moderate"}
    ]
  }
];

scenarios.forEach(scenario => {
  TimeWise.Activities.setTestActivities(scenario.activities);
  const feasibility = TimeWise.Planner.checkDailyFeasibility();
  console.log(`${scenario.name}: ${feasibility.status} (${feasibility.colorIndicator})`);
});

// Expected output:
// Normal workload: feasible (green)
// Heavy workload: tight (yellow)
// Overloaded: not feasible (red)
```

## 🛠️ Troubleshooting

### Common Issues

**Issue: "Invalid time format" error**
```javascript
// ❌ Wrong format
TimeWise.Planner.setDayStartTime("monday", "9 AM");

// ✅ Correct format (HH:MM)
TimeWise.Planner.setDayStartTime("monday", "09:00");
```

**Issue: Agenda generation takes too long**
```javascript
// Check activity count
const activityCount = TimeWise.Activities.getCount();
if (activityCount > 100) {
  console.warn("Too many activities may slow down agenda generation");
  // Consider archiving completed activities
}
```

**Issue: Lunch break conflicts with day start**
```javascript
// Validate before setting
const isValid = TimeWise.Planner.validateDayStructure({
  dayStart: "10:00",
  lunchBreakStart: "12:00", // ✅ Valid: lunch after day start
  lunchBreakDuration: 30
});
```

## 📚 API Reference

### Main Functions

```javascript
// Configuration
TimeWise.Planner.setDayStructure(config: DayStructureConfig): void
TimeWise.Planner.getDayStructure(): DayStructureConfig
TimeWise.Planner.resetToDefaults(): void

// Feasibility
TimeWise.Planner.checkDailyFeasibility(date?: string): DailyFeasibility
TimeWise.Planner.getFeasibilityIndicator(date?: string): string // "green"|"yellow"|"red"

// Agenda Generation
TimeWise.Planner.generateWeeklyAgenda(): WeeklyExecutionAgenda
TimeWise.Planner.generateDailyAgenda(date: string): AgendaEntry[]
TimeWise.Planner.getCurrentAgenda(): WeeklyExecutionAgenda

// Agenda Adjustments
TimeWise.Planner.startTimerEarly(entryId: string, actualStart: string): void
TimeWise.Planner.adjustAgendaBlock(entryId: string, newTime: string): void
TimeWise.Planner.swapAgendaBlocks(entryId1: string, entryId2: string): void

// Validation
TimeWise.Planner.validateDayStructure(config: Partial<DayStructureConfig>): boolean
TimeWise.Planner.validateTimeFormat(timeString: string): boolean
```

### Types

```typescript
interface DayStructureConfig {
  dayStartTimes: Record<Weekday, string>;      // "HH:MM" format
  lunchBreakStartTimes: Record<Weekday, string>; // "HH:MM" format
  lunchBreakDurations: Record<Weekday, number>;  // minutes
}

interface DailyFeasibility {
  date: string;
  totalDurationMinutes: number;
  dailyWorkTargetMinutes: number;
  feasibilityStatus: "feasible" | "tight" | "not-feasible";
  colorIndicator: "green" | "yellow" | "red";
  activitiesCount: number;
}

interface WeeklyExecutionAgenda {
  weekId: string;
  weekStartDate: string;
  days: Record<string, AgendaEntry[]>;
  dayStructureConstraints: Record<string, DayStructure>;
}
```

## 🎯 Best Practices

### Configuration Management

1. **Set realistic day structures** that match your actual work habits
2. **Start with defaults** and adjust as you understand your patterns
3. **Review weekly** and update as needed
4. **Use different settings** for weekdays vs weekends

### Performance Optimization

1. **Limit active activities** to <100 for best performance
2. **Archive completed activities** regularly
3. **Avoid frequent recomputation** - use cached results when possible
4. **Batch updates** when making multiple configuration changes

### Error Prevention

1. **Validate before saving** configuration changes
2. **Check feasibility indicators** before committing to schedules
3. **Review agenda conflicts** highlighted by the system
4. **Use the undo feature** if you make mistakes

## 📖 Next Steps

1. **Explore the UI**: Try the visual agenda planner interface
2. **Set up your profile**: Configure your personal day structure
3. **Add some activities**: Create test activities with different durations
4. **Check feasibility**: See how your schedule looks
5. **Adjust as needed**: Fine-tune your configuration

## 🔗 Related Documentation

- [Full Specification](./spec.md)
- [Data Model](./data-model.md)
- [Implementation Plan](./plan.md)
- [Research Findings](./research.md)

**Status**: Ready for implementation and testing