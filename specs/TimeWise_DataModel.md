# TimeWise – Data Model

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


## Storage schema

**localStorage keys:**

- `activities` – JSON object (map) keyed by Activity id.
- `sessions` – JSON object (map) keyed by Session id.
- `userConfig` – JSON object for user preferences and defaults.
- `daySnapshots`: Stores the per-day metadata required for working-window calculations. The value MUST be a JSON object where each key is a date (`YYYY-MM-DD`) and each value is a DaySnapshot.
- `weeklyAgenda` – single object representing the persisted Weekly Execution Agenda for the active week.

```ts
type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";


type UserConfig = {
  soundEnabled: boolean;

  defaultSessionMaxMinutes: number;
  defaultDailyMaxMinutes: number;

  dailyWorkTargets: Record<Weekday, number>; // hours per day (integer or float, per your spec)

  weekStart: Weekday;

  // Day structure configuration
  dayStartTimes: Record<Weekday, string>; // "HH:MM" format for each day
  lunchBreakStartTimes: Record<Weekday, string>; // "HH:MM" format for each day
  lunchBreakDurations: Record<Weekday, number>; // minutes for each day
};
```

`userConfig` MUST support at least the fields defined in UserConfig type above.
Example (valid JSON):

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
 — Each value in `dayStartTimes` MUST be a valid time string in `HH:MM` format.
 — Each value in `lunchBreakStartTimes` MUST be a valid time string in `HH:MM` format.
 — Each value in `lunchBreakDurations` MUST be a non-negative number representing minutes.
 — For each day, `lunchBreakStartTimes` MUST be ≥ `dayStartTimes` if both are set and non-zero.
 — For each day, the sum of `dailyWorkTargets` (in minutes) and `lunchBreakDurations` MUST fit within reasonable working day boundaries.


### Weekly Execution Agenda Storage (new)

**Description:**  
The Weekly Execution Agenda represents the concrete, user-adjustable plan for the **current week**.  
It MUST be persisted so that:

- agenda adjustments are retained,
- early/late starts are reflected,
- block statuses remain consistent,
- Timer and Agenda views remain aligned.

Only the **active week** MUST be stored.  
A new week MUST trigger a full agenda reset.

---

**Storage key:**  
`weeklyAgenda`

---

**Structure Example:**

```ts
type WeeklyExecutionAgenda = {
  weekId: string;           // YYYY-Www
  weekStartDate: string;    // YYYY-MM-DD (local date)
  days: Record<string, AgendaEntry[]>; // key: YYYY-MM-DD (7 days starting at weekStartDate)
};
```
**Constraints:**
 — `weekId` MUST be a valid ISO week identifier in the format `YYYY-Www` (e.g. `2025-W03`).
 — `weekStartDate` MUST be a valid local date string in the format `YYYY-MM-DD` and MUST correspond to `userConfig.weekStart` for that `weekId`.
 — `days` MUST be an object keyed by local date strings (`YYYY-MM-DD`) covering the 7-day span starting at `weekStartDate`.
 — Each `days[date]` value MUST be an array of AgendaEntry objects.
 — For any given `date`, AgendaEntry blocks MUST be ordered chronologically by `plannedStart`.
 — For any given `date`, AgendaEntry blocks MUST NOT overlap in planned time.
 — Each AgendaEntry `id` MUST be globally unique within the stored `weeklyAgenda`.
 — Each AgendaEntry `activityId` MUST reference an existing Activity at the time of persistence; if the Activity is later archived, the reference MUST remain valid for historical consistency.
 — `plannedStart` / `plannedEnd` MUST be valid local times in `HH:MM` format and MUST fall within the applicable Day Structure working window for that `date`.
 — `durationMinutes` MUST equal the difference between `plannedEnd` and `plannedStart` for each AgendaEntry.
 — All keys in `days` MUST fall within the 7-day range starting at `weekStartDate`.
---

**Behaviour:**
 — On application load, if `weekId` does NOT match the current week (per `userConfig.weekStart`), the stored `weeklyAgenda` MUST be discarded and a fresh one MUST be generated from the Global Agenda.
 — On AgendaEntry changes (executed, skipped, swapped, adjusted), the persisted agenda MUST be updated immediately.
 — On Close Day, all blocks for that date MUST commit their final status; blocks for future days MAY be reshaped, but past-day blocks MUST remain immutable.
 — On Activity metadata changes (deadline, estimatedDuration, scheduledDays), only future days of the current week MAY be altered.

---

**Rules:**
 — Only one week MUST be stored at a time; past weeks MAY be discarded.
 — Persisted blocks MUST NOT silently change identity, order, or duration unless a valid user adjustment occurs or early-start rules require a structural change.
 — The persisted Weekly Execution Agenda MUST be the authoritative data for the Timer Screen Weekly Extract, the Agenda View, and agenda-related status transitions.

---

**Priority:** MUST.

### AgendaEntry (extracted from Weekly Execution Agenda)

Each entry within `weeklyAgenda.days[date]` MUST follow this structure:


```ts
type AgendaEntry = {
  id: string;              // uuid-string
  activityId: string;      // references Activity.id
  plannedStart: string;    // HH:MM (local time)
  plannedEnd: string;      // HH:MM (local time)
  durationMinutes: number;   // Positive number
  status: AgendaEntryStatus;
};
```

**Constraints:**
 — Each AgendaEntry MUST have a globally unique `id`.
 — `activityId` MUST reference an existing Activity.
 — `plannedStart` and `plannedEnd` MUST be valid local times in `HH:MM` format.
 — `plannedEnd` MUST be strictly later than `plannedStart`.
 — `durationMinutes` MUST equal the difference between `plannedEnd` and `plannedStart`.
 — `status` MUST be one of: `"planned"`, `"executed"`, `"executedEarlier"`, `"skipped"`, `"postponed"`, `"adjusted"`.
 — AgendaEntries within the same day MUST NOT overlap in planned time.
 — AgendaEntries MUST lie within the applicable Day Structure working window for that date.



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
  "userConfig": { ... }
}
```
**Constraints:**
 — JSON export MUST be the canonical backup format and MUST include: `activities`, `sessions`, `userConfig`, `daySnapshots`, and `weeklyAgenda`.
 — `version` MUST be present and MUST be used to drive backward-compatible import behaviour.
 — `exportedAt` MUST be present and MUST be an epoch-milliseconds timestamp.
 — Export MUST be deterministic and MUST NOT omit persisted state that affects user experience (settings, agenda, day snapshots).
 — Import MUST ignore unknown fields (forward compatibility) and MUST apply safe defaults for missing optional fields (backward compatibility).
 — Export MUST NOT include any telemetry/analytics identifiers (privacy).

**Rules:**
 — If `weeklyAgenda` is missing or invalid, the implementation MUST treat it as absent and regenerate it from the Global Agenda on next load (do not block import solely for this reason).
 — If `daySnapshots` is missing, it MUST be treated as empty; inactivity MAY be recomputed later from sessions.


### JSON import validation

**Constraints:**
 — Root MUST be a JSON object.
 — `activities` MUST be present and MUST contain valid Activity objects (see Activity constraints).
 — `sessions` MUST be present and MUST contain valid Session objects (see Session constraints).
 — All `sessions[].activityId` references MUST exist in `activities`.
 — IDs MUST be unique within their entity set (no duplicate Activity IDs, no duplicate Session IDs, etc.).
 — If present, `daySnapshots` MUST be an object keyed by `YYYY-MM-DD` with valid DaySnapshot objects.
 — If present, `weeklyAgenda` MUST conform to the Weekly Execution Agenda structure; if invalid, it MUST be discarded (see DM-IE-007).
 — If present, `userConfig` MUST be an object; missing fields MUST be defaulted safely.
 — Imports with an unsupported `version` MUST be rejected with a clear error message.
 — Any validation failure for `activities` or `sessions` MUST block import.

---
### Appendix A – Enumerations

- Priority: `"low" | "medium" | "high"`
- CognitiveLoad: `"light" | "moderate" | "intense"`
- BlockStatus: `"planned" | "executed" | "executedEarlier" | "skipped" | "postponed" | "adjusted"`
- Weekday identifiers: "monday" … "sunday"