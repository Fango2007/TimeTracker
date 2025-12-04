# TimeWise

TimeWise is a local-only, browser-based SPA for tracking time and staying productive. It uses HTML, CSS, and JavaScript with Bootstrap 4.5.2, jQuery/jQuery UI Sortable, Chart.js, Font Awesome, and Montserrat. All data lives in `localStorage`; there is no backend or network traffic.

## Core Features
- **Activities**: Create, edit, archive, and delete activities with label uniqueness; categories (professional/personal), priorities (low/medium/high), cognitive loads (light/moderate/intense), optional daily/session limits, and drag-to-reorder support.
- **Timer Engine**: Single active session with start/pause/resume/stop/reset, timestamp-based elapsed tracking, interval recording, drift-safe updates, auto-stop on session max (with alert), and daily max warnings.
- **History**: Reverse-chronological sessions list with activity badges and per-interval details.
- **Statistics**: Daily/weekly/monthly charts (Chart.js) plus tables summarizing activity totals; archived activities stay visible.
- **Import/Export**: JSON import/export with schema validation (replaces data only when valid) and CSV export of sessions.

## Data Model
- **Activities**: `id`, `label` (unique), `category`, `priority`, `cognitiveLoad`, optional `dailyMax`/`sessionMax` minutes, `archived` flag.
- **Sessions**: `id`, `activityId`, `sessionStart`/`sessionEnd` timestamps, `intervals` array, and `totalDuration` (seconds).
- **Intervals**: `start`, `end`, `duration` (seconds).

## Usage
1) Open `index.html` in a browser (no server required).
2) Add activities in the Activities view, then start the timer from the Timer view.
3) Pause/resume/stop or reset; auto-stop triggers when the session max is reached.
4) Review History and Statistics; export/import data as needed.

## File Structure
- `index.html`
- `css/styles.css`
- `js/utils.js`, `storage.js`, `activities.js`, `timer.js`, `stats.js`, `history.js`, `ui.js`
- `assets/` (placeholder for icons/fonts)

## Notes
- Data is stored only in `localStorage` under `activities`, `logs`, and `userConfig` keys.
- There are no accounts, analytics, or network calls in v1.
