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
- **DM-ACT-001** — `id` MUST be globally unique.
- **DM-ACT-002** — `label` MUST be unique (case-insensitive).
- **DM-ACT-003** — `category` MUST be one of the supported category values defined by the application.
- **DM-ACT-004** — `dailyMax` MUST be a positive integer representing minutes per day.
- **DM-ACT-005** — `sessionMax` MUST be a positive integer representing minutes per session.
- **DM-ACT-006** — `priority` MUST be one of `"low"`, `"medium"`, `"high"`.
- **DM-ACT-007** — `cognitiveLoad` MUST be one of `"light"`, `"moderate"`, `"intense"`.
- **DM-ACT-008** — `description` is optional free text.
- **DM-ACT-009** — `estimatedDuration` is optional but, if present, MUST be a positive integer (minutes).
- **DM-ACT-010** — `deadline` is optional but, if present, MUST be a valid local date string (`YYYY-MM-DD`).
- **DM-ACT-011** — `scheduledDays` is optional; if present, it MUST be an array of weekday identifiers (`"monday"` … `"sunday"`).
- **DM-ACT-012** — Activities with no `scheduledDays` are considered unscheduled and MUST NOT enter feasibility calculations unless manually selected.
- **DM-ACT-013** — Archived activities MUST remain in storage for historical consistency.
- **DM-ACT-014** — An activity MAY be deleted only if no sessions are associated with it; otherwise it MUST be archived.
- **DM-ACT-015** — If both `dailyMax` and `sessionMax` are defined, `sessionMax` MUST be ≤ `dailyMax`.
- **DM-ACT-016** — `estimatedDuration` represents a target total duration; actual tracked time MAY exceed this value.


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
- **DM-SES-001** — Each session MUST reference a valid `activityId`.
- **DM-SES-002** — `sessionStart` MUST be a valid timestamp expressed in epoch milliseconds.
- **DM-SES-003** — `sessionEnd` is optional while the session is active; once the session is stopped, `sessionEnd` MUST be set and MUST be ≥ `sessionStart`.
- **DM-SES-004** — A session MUST NOT span across calendar days.
- **DM-SES-005** — A session MAY contain zero or more `intervals`.
- **DM-SES-006** — Intervals within the same session MUST NOT overlap.
- **DM-SES-007** — `totalDuration` MUST be derived from the sum of all intervals and MUST NOT be manually edited (in seconds).
- **DM-SES-008** — At most one session MAY be active at any time.
- **DM-SES-009** — Paused time MUST NOT contribute to `totalDuration`.
- **DM-SES-010** — Session “active” state is derived at runtime from the absence of `sessionEnd` and MUST NOT be persisted as a separate field.
- **DM-SES-011** — Intervals MUST represent only active tracking spans; paused periods MUST NOT be represented as intervals.


### Interval

```ts
type Interval = {
  start: number;     // epoch ms
  end: number | null; // epoch ms, null only if currently running
  duration: number;  // seconds (for completed intervals)
};
```

**Constraints:**
- **DM-INT-001** — `start` MUST be a valid timestamp expressed in epoch milliseconds.
- **DM-INT-002** — `end` MAY be null only for a currently running interval; otherwise `end` MUST be a valid timestamp expressed in epoch milliseconds and MUST be ≥ `start`.
- **DM-INT-003** — For completed intervals (`end` not null), `duration` MUST equal `(end - start) / 1000`.
- **DM-INT-004** — `intervals` within a session MUST be chronological (sorted by `start`) and MUST be non-overlapping.
- **DM-INT-005** — `duration` MUST be expressed in seconds, while `start` and `end` are expressed in epoch milliseconds.


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
- **DM-DAY-001** — `date` MUST be a valid local date string in the format `YYYY-MM-DD`.
- **DM-DAY-002** — `firstTimerAt` MUST be set when the first timer of the day is started and MUST be a valid timestamp expressed in epoch milliseconds.
- **DM-DAY-003** — `dayEndAt` SHOULD be set when the user clicks **Close day**; if `dayEndAt` is null, statistics computations MUST fallback to the latest `sessionEnd` for that date.
- **DM-DAY-004** — `dayEndAt`, when set, MUST be a valid timestamp expressed in epoch milliseconds and MUST be ≥ `firstTimerAt` when `firstTimerAt` is not null.
- **DM-DAY-005** — `inactivityDurationMs` MAY be cached once the day is closed; when present, it MUST be ≥ 0.
- **DM-DAY-006** — The implementation MAY recompute inactivity from sessions instead of using `inactivityDurationMs` to avoid inconsistencies.
- **DM-DAY-007** — If a day has no sessions, `firstTimerAt`, `dayEndAt`, and `inactivityDurationMs` MUST remain null or absent, and no inactivity MUST be computed for that date.
- **DM-DAY-008** — `firstTimerAt` MUST NOT be set unless at least one Session exists for that date.
- **DM-DAY-009** — `dayEndAt` MUST NOT be set earlier than the latest `sessionEnd` for that date.


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
  "weekStart": "monday"
}
```

**Constraints:**
- **DM-STO-001** — Application state MUST be persisted exclusively under the following top-level keys: `activities`, `sessions`, `daySnapshots`, `weeklyAgenda`, `userConfig`.
- **DM-STO-002** — Each storage key MUST contain a JSON-serialisable value; circular references are not permitted.
- **DM-STO-003** — `activities` MUST be a map keyed by Activity `id`; values MUST conform to the Activity data model.
- **DM-STO-004** — `sessions` MUST be a map keyed by Session `id`; values MUST conform to the Session data model.
- **DM-STO-005** — `daySnapshots` MUST be a map keyed by local date strings (`YYYY-MM-DD`); values MUST conform to the DaySnapshot data model.
- **DM-STO-006** — `weeklyAgenda` MUST be either null/absent or a single object conforming to the Weekly Execution Agenda data model.
- **DM-STO-007** — `userConfig` MUST be a single object containing all user-defined settings; partial duplication of settings across keys is not permitted.
- **DM-STO-008** — Persisted data MUST be forward-compatible: unknown fields MUST be ignored rather than causing load failure.
- **DM-STO-009** — Persisted data MUST be backward-compatible where possible; missing optional fields MUST assume safe defaults.
- **DM-STO-010** — Corrupted or non-parseable storage entries MUST be handled gracefully without crashing the application.

- **DM-CFG-001** — `defaultSessionMaxMinutes` MUST be a positive number.
- **DM-CFG-002** — `defaultDailyMaxMinutes` MUST be a positive number and MUST be ≥ `defaultSessionMaxMinutes`.
- **DM-CFG-003** — Each value in `dailyWorkTargets` MUST be a number ≥ 0.
- **DM-CFG-004** — Values in `dailyWorkTargets` MUST be expressed in hours (not minutes).


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
- **DM-WAG-010** — `weekId` MUST be a valid ISO week identifier in the format `YYYY-Www` (e.g. `2025-W03`).
- **DM-WAG-011** — `weekStartDate` MUST be a valid local date string in the format `YYYY-MM-DD` and MUST correspond to `userConfig.weekStart` for that `weekId`.
- **DM-WAG-012** — `days` MUST be an object keyed by local date strings (`YYYY-MM-DD`) covering the 7-day span starting at `weekStartDate`.
- **DM-WAG-013** — Each `days[date]` value MUST be an array of AgendaEntry objects.
- **DM-WAG-014** — For any given `date`, AgendaEntry blocks MUST be ordered chronologically by `plannedStart`.
- **DM-WAG-015** — For any given `date`, AgendaEntry blocks MUST NOT overlap in planned time.
- **DM-WAG-016** — Each AgendaEntry `id` MUST be globally unique within the stored `weeklyAgenda`.
- **DM-WAG-017** — Each AgendaEntry `activityId` MUST reference an existing Activity at the time of persistence; if the Activity is later archived, the reference MUST remain valid for historical consistency.
- **DM-WAG-018** — `plannedStart` / `plannedEnd` MUST be valid local times in `HH:MM` format and MUST fall within the applicable Day Structure working window for that `date`.
- **DM-WAG-019** — `durationMinutes` MUST equal the difference between `plannedEnd` and `plannedStart` for each AgendaEntry.
- **DM-WAG-020** — All keys in `days` MUST fall within the 7-day range starting at `weekStartDate`.
---

**Behaviour:**
- **DM-WAG-001** — On application load, if `weekId` does NOT match the current week (per `userConfig.weekStart`), the stored `weeklyAgenda` MUST be discarded and a fresh one MUST be generated from the Global Agenda.
- **DM-WAG-002** — On AgendaEntry changes (executed, skipped, swapped, adjusted), the persisted agenda MUST be updated immediately.
- **DM-WAG-003** — On Close Day, all blocks for that date MUST commit their final status; blocks for future days MAY be reshaped, but past-day blocks MUST remain immutable.
- **DM-WAG-004** — On Activity metadata changes (deadline, estimatedDuration, scheduledDays), only future days of the current week MAY be altered.

---

**Rules:**
- **DM-WAG-005** — Only one week MUST be stored at a time; past weeks MAY be discarded.
- **DM-WAG-006** — Persisted blocks MUST NOT silently change identity, order, or duration unless a valid user adjustment occurs or early-start rules require a structural change.
- **DM-WAG-007** — The persisted Weekly Execution Agenda MUST be the authoritative data for the Timer Screen Weekly Extract, the Agenda View, and agenda-related status transitions.

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
- **DM-AGE-001** — Each AgendaEntry MUST have a globally unique `id`.
- **DM-AGE-002** — `activityId` MUST reference an existing Activity.
- **DM-AGE-003** — `plannedStart` and `plannedEnd` MUST be valid local times in `HH:MM` format.
- **DM-AGE-004** — `plannedEnd` MUST be strictly later than `plannedStart`.
- **DM-AGE-005** — `durationMinutes` MUST equal the difference between `plannedEnd` and `plannedStart`.
- **DM-AGE-006** — `status` MUST be one of: `"planned"`, `"executed"`, `"executedEarlier"`, `"skipped"`, `"postponed"`, `"adjusted"`.
- **DM-AGE-007** — AgendaEntries within the same day MUST NOT overlap in planned time.
- **DM-AGE-008** — AgendaEntries MUST lie within the applicable Day Structure working window for that date.



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
- **DM-IE-001** — JSON export MUST be the canonical backup format and MUST include: `activities`, `sessions`, `userConfig`, `daySnapshots`, and `weeklyAgenda`.
- **DM-IE-002** — `version` MUST be present and MUST be used to drive backward-compatible import behaviour.
- **DM-IE-003** — `exportedAt` MUST be present and MUST be an epoch-milliseconds timestamp.
- **DM-IE-004** — Export MUST be deterministic and MUST NOT omit persisted state that affects user experience (settings, agenda, day snapshots).
- **DM-IE-005** — Import MUST ignore unknown fields (forward compatibility) and MUST apply safe defaults for missing optional fields (backward compatibility).
- **DM-IE-006** — Export MUST NOT include any telemetry/analytics identifiers (privacy).

**Rules:**
- **DM-IE-007** — If `weeklyAgenda` is missing or invalid, the implementation MUST treat it as absent and regenerate it from the Global Agenda on next load (do not block import solely for this reason).
- **DM-IE-008** — If `daySnapshots` is missing, it MUST be treated as empty; inactivity MAY be recomputed later from sessions.


### JSON import validation

**Constraints:**
- **DM-IE-010** — Root MUST be a JSON object.
- **DM-IE-011** — `activities` MUST be present and MUST contain valid Activity objects (see Activity constraints).
- **DM-IE-012** — `sessions` MUST be present and MUST contain valid Session objects (see Session constraints).
- **DM-IE-013** — All `sessions[].activityId` references MUST exist in `activities`.
- **DM-IE-014** — IDs MUST be unique within their entity set (no duplicate Activity IDs, no duplicate Session IDs, etc.).
- **DM-IE-015** — If present, `daySnapshots` MUST be an object keyed by `YYYY-MM-DD` with valid DaySnapshot objects.
- **DM-IE-016** — If present, `weeklyAgenda` MUST conform to the Weekly Execution Agenda structure; if invalid, it MUST be discarded (see DM-IE-007).
- **DM-IE-017** — If present, `userConfig` MUST be an object; missing fields MUST be defaulted safely.
- **DM-IE-018** — Imports with an unsupported `version` MUST be rejected with a clear error message.
- **DM-IE-019** — Any validation failure for `activities` or `sessions` MUST block import.


---
### Appendix A – Enumerations

- Priority: `"low" | "medium" | "high"`
- CognitiveLoad: `"light" | "moderate" | "intense"`
- BlockStatus: `"planned" | "executed" | "executedEarlier" | "skipped" | "postponed" | "adjusted"`
- Weekday identifiers: "monday" … "sunday"