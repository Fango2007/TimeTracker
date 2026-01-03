# TimeWise – Extended Data Model: Week & Day Structure Management

## Core Entities

### Activity

```ts
type Category = "professional" | "personal";

type Priority = "low" | "medium" | "high";

type CognitiveLoad = "light" | "moderate" | "intense";

type AgendaEntryStatus =
  | "planned"
  | "executed"
  | "executedEarlier"
  | "skipped"
  | "postponed"
  | "adjusted";

type Activity = {
  id: string;                // uuid-string
  label: string;
  description?: string;      // optional free text
  category: Category;
  dailyMax: number;          // minutes/day
  sessionMax: number;        // minutes/session
  priority: Priority;
  cognitiveLoad: CognitiveLoad;
  estimatedDuration?: number; // minutes (optional)
  deadline?: string;          // YYYY-MM-DD (optional)
  scheduledDays?: Weekday[];
  archived: boolean;
};
```

**Constraints:**
  — `id` MUST be globally unique.
  — `label` MUST be unique (case-insensitive).
  — `category` MUST be one of the supported category values defined by the application.
  — `dailyMax` MUST be a positive integer representing minutes per day.
  — `sessionMax` MUST be a positive integer representing minutes per session.
  — `priority` MUST be one of `"low"`, `"medium"`, `"high"`.
  — `cognitiveLoad` MUST be one of `"light"`, `"moderate"`, `"intense"`.
  — `description` is optional free text.
  — `estimatedDuration` is optional but, if present, MUST be a positive integer (minutes).
  — `deadline` is optional but, if present, MUST be a valid local date string (`YYYY-MM-DD`).
  — `scheduledDays` is optional; if present, it MUST be an array of weekday identifiers (`"monday"` … `"sunday"`).
  — Activities with no `scheduledDays` are considered unscheduled and MUST NOT enter feasibility calculations unless manually selected.
  — Archived activities MUST remain in storage for historical consistency.
  — An activity MAY be deleted only if no sessions are associated with it; otherwise it MUST be archived.
  — If both `dailyMax` and `sessionMax` are defined, `sessionMax` MUST be ≤ `dailyMax`.
  — `estimatedDuration` represents a target total duration; actual tracked time MAY exceed this value.


### Session

```ts
type Session = {
  id: string;                 // uuid-string
  activityId: string;         // references Activity.id
  sessionStart: number;       // seconds
  sessionEnd: number | null; // epoch milliseconds, null while active
  intervals: Interval[];
  totalDuration: number;      // seconds (derived from intervals)
};
```

**Constraints:**
  — Each session MUST reference a valid `activityId`.
  — `sessionStart` MUST be a valid timestamp expressed in epoch milliseconds.
  — `sessionEnd` is optional while the session is active; once the session is stopped, `sessionEnd` MUST be set and MUST be ≥ `sessionStart`.
  — A session MUST NOT span across calendar days.
  — A session MAY contain zero or more `intervals`.
  — Intervals within the same session MUST NOT overlap.
  — `totalDuration` MUST be derived from the sum of all intervals and MUST NOT be manually edited (in seconds).
  — At most one session MAY be active at any time.
  — Paused time MUST NOT contribute to `totalDuration`.
  — Session “active” state is derived at runtime from the absence of `sessionEnd` and MUST NOT be persisted as a separate field.
  — Intervals MUST represent only active tracking spans; paused periods MUST NOT be represented as intervals.


### Interval

```ts
type Interval = {
  start: number;     // epoch ms
  end: number | null; // epoch ms, null only if currently running
  duration: number;  // seconds (for completed intervals)
};
```

**Constraints:**
  — `start` MUST be a valid timestamp expressed in epoch milliseconds.
  — `end` MAY be null only for a currently running interval; otherwise `end` MUST be a valid timestamp expressed in epoch milliseconds and MUST be ≥ `start`.
  — For completed intervals (`end` not null), `duration` MUST equal `(end - start) / 1000`.
  — `intervals` within a session MUST be chronological (sorted by `start`) and MUST be non-overlapping.
  — `duration` MUST be expressed in seconds, while `start` and `end` are expressed in epoch milliseconds.


### DaySnapshot (per calendar day)

Represents per-day metadata used for statistics and inactivity computation.

```ts
type DaySnapshot = {
  date: string;               // 'YYYY-MM-DD' in local timezone
  firstTimerAt: number | null; // Unix ms timestamp of the very first timer start of the day
  dayEndAt: number | null;     // Unix ms timestamp used as end of working window (Close day or last session end)
  inactivityDurationMs?: number; // cached inactivity value for the day (>= 0), optional optimisation
};
```

**Constraints:**
  — `date` MUST be a valid local date string in the format `YYYY-MM-DD`.
  — `firstTimerAt` MUST be set when the first timer of the day is started and MUST be a valid timestamp expressed in epoch milliseconds.
  — `dayEndAt` SHOULD be set when the user clicks **Close day**; if `dayEndAt` is null, statistics computations MUST fallback to the latest `sessionEnd` for that date.
  — `dayEndAt`, when set, MUST be a valid timestamp expressed in epoch milliseconds and MUST be ≥ `firstTimerAt` when `firstTimerAt` is not null.
  — `inactivityDurationMs` MAY be cached once the day is closed; when present, it MUST be ≥ 0.
  — The implementation MAY recompute inactivity from sessions instead of using `inactivityDurationMs` to avoid inconsistencies.
  — If a day has no sessions, `firstTimerAt`, `dayEndAt`, and `inactivityDurationMs` MUST remain null or absent, and no inactivity MUST be computed for that date.
  — `firstTimerAt` MUST NOT be set unless at least one Session exists for that date.
  — `dayEndAt` MUST NOT be set earlier than the latest `sessionEnd` for that date.


## Extended User Configuration

The `userConfig` structure is extended to support week and day structure management.

```ts
type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type WorkingWindow = {
  workDayStart: string;      // HH:MM format (local timezone)
  workDayEnd: string;        // HH:MM format (local timezone)
  lunchBreakStart: string;   // HH:MM format (local timezone)
  lunchBreakEnd: string;     // HH:MM format (local timezone)
  shortBreakMinutes: number; // minutes between activities
};

type WeeklyRhythmConfig = {
  weekdayProfile: WorkingWindow;
  weekendProfile: WorkingWindow;
};

type ExtendedUserConfig = {
  soundEnabled: boolean;

  defaultSessionMaxMinutes: number;
  defaultDailyMaxMinutes: number;

  dailyWorkTargets: Record<Weekday, number>; // hours per day (integer or float, per your spec)

  weekStart: Weekday;

  // Extended fields for week & day structure management
  weeklyRhythmConfig: WeeklyRhythmConfig;
  
  dayOverrides: Record<string, WorkingWindow>; // key: YYYY-MM-DD, value: WorkingWindow
};
```

**Extended UserConfig Constraints:**
  — All existing `userConfig` fields must be preserved and functional.
  — `weeklyRhythmConfig` MUST contain valid `weekdayProfile` and `weekendProfile` objects.
  — Each `WorkingWindow` object MUST contain valid time values in HH:MM format.
  — `workDayStart` MUST be before `workDayEnd`.
  — `lunchBreakStart` MUST be between `workDayStart` and `lunchBreakEnd`.
  — `lunchBreakEnd` MUST be before `workDayEnd`.
  — `shortBreakMinutes` MUST be a non-negative number.
  — `dayOverrides` MUST be a map keyed by local date strings (`YYYY-MM-DD`) with valid `WorkingWindow` objects.
  — Override dates MUST be valid and in the future (relative to current date).
  — All time values MUST be in valid HH:MM format (00:00 to 23:59).

## Storage schema

**localStorage keys:**

- `activities` – JSON object (map) keyed by Activity id.
- `sessions` – JSON object (map) keyed by Session id.
- `userConfig` – JSON object for user preferences and defaults.
- `daySnapshots`: Stores the per-day metadata required for working-window calculations. The value MUST be a JSON object where each key is a date (`YYYY-MM-DD`) and each value is a DaySnapshot.
- `weeklyAgenda` – single object representing the persisted Weekly Execution Agenda for the active week.

**Constraints:**
  — Application state MUST be persisted exclusively under the following top-level keys: `activities`, `sessions`, `daySnapshots`, `weeklyAgenda`, `userConfig`.
  — Each storage key MUST contain a JSON-serialisable value; circular references are not permitted.
  — `activities` MUST be a map keyed by Activity `id`; values MUST conform to the Activity data model.
  — `sessions` MUST be a map keyed by Session `id`; values MUST conform to the Session data model.
  — `daySnapshots` MUST be a map keyed by local date strings (`YYYY-MM-DD`); values MUST conform to the DaySnapshot data model.
  — `weeklyAgenda` MUST be either null/absent or a single object conforming to the Weekly Execution Agenda data model.
  — `userConfig` MUST be a single object containing all user-defined settings; partial duplication of settings across keys is not permitted.
  — Persisted data MUST be forward-compatible: unknown fields MUST be ignored rather than causing load failure.
  — Persisted data MUST be backward-compatible where possible; missing optional fields MUST assume safe defaults.
  — Corrupted or non-parseable storage entries MUST be handled gracefully without crashing the application.
  — `defaultSessionMaxMinutes` MUST be a positive number.
  — `defaultDailyMaxMinutes` MUST be a positive number and MUST be ≥ `defaultSessionMaxMinutes`.
  — Each value in `dailyWorkTargets` MUST be a number ≥ 0.
  — Values in `dailyWorkTargets` MUST be expressed in hours (not minutes).
  — `weeklyRhythmConfig` and `dayOverrides` fields MUST be properly validated and sanitized.
  — If `weeklyRhythmConfig` is missing, the system MUST provide default values to maintain backward compatibility.

## Working Window Determination

The system determines the working window for a specific date by:

1. **Check for Day Override**: If a `dayOverrides` entry exists for the date, use that configuration.
2. **Apply Weekday/Weekend Profile**: If no override exists, determine if the date is a weekday or weekend and apply the appropriate profile.
3. **Validation**: Ensure all times are valid and don't overlap.
4. **Integration**: Apply the working window constraints to scheduling and session creation.

## Import / Export schema

### JSON export format (canonical)

```json
{
  "version": "2.0",
  "exportedAt": 1712140000000,
  "activities": { "activityId": { } },
  "sessions": { "sessionId": { } },
  "daySnapshots": { "YYYY-MM-DD": { ... } },
  "weeklyAgenda": { ... },
  "userConfig": { 
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
    "weeklyRhythmConfig": {
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
      }
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
}
```

**Constraints:**
  — JSON export MUST be the canonical backup format and MUST include: `activities`, `sessions`, `userConfig`, `daySnapshots`, and `weeklyAgenda`.
  — `version` MUST be present and MUST be used to drive backward-compatible import behaviour.
  — `exportedAt` MUST be present and MUST be an epoch-milliseconds timestamp.
  — Export MUST be deterministic and MUST NOT omit persisted state that affects user experience (settings, agenda, day snapshots).
  — Import MUST ignore unknown fields (forward compatibility) and MUST apply safe defaults for missing optional fields (backward compatibility).
  — Export MUST NOT include any telemetry/analytics identifiers (privacy).
  — `weeklyRhythmConfig` and `dayOverrides` MUST be included in export if they exist.
  — If `weeklyRhythmConfig` is missing or invalid, the system MUST treat it as absent and provide defaults on import.
  — If `dayOverrides` is missing or invalid, the system MUST treat it as empty.
  — Import validation MUST include checking for valid time formats and logical constraints (e.g., lunch break within work day hours).

### JSON import validation

**Constraints:**
  — Root MUST be a JSON object.
  — `activities` MUST be present and MUST contain valid Activity objects (see Activity constraints).
  — `sessions` MUST be present and MUST contain valid Session objects (see Session constraints).
  — All `sessions[].activityId` references MUST exist in `activities`.
  — IDs MUST be unique within their entity set (no duplicate Activity IDs, no duplicate Session IDs, etc.).
  — If present, `daySnapshots` MUST be an object keyed by `YYYY-MM-DD` with valid DaySnapshot objects.
  — If present, `weeklyAgenda` MUST conform to the Weekly Execution Agenda structure; if invalid, it MUST be discarded.
  — If present, `userConfig` MUST be an object; missing fields MUST be defaulted safely.
  — If `userConfig` contains `weeklyRhythmConfig`, it MUST be validated for correct structure and time constraints.
  — If `userConfig` contains `dayOverrides`, they MUST be validated for valid date formats and time constraints.
  — Imports with an unsupported `version` MUST be rejected with a clear error message.
  — Any validation failure for `activities` or `sessions` MUST block import.
  — Any validation failure for `weeklyRhythmConfig` or `dayOverrides` MUST be handled gracefully.