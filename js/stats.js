// Statistics aggregation with selectable unit and navigation (no inactivity)
(() => {
  const {
    getSessions,
    getActivities,
    getUserConfig,
    getDaySnapshot
  } = window.TimeWiseStorage;
  const { getDateKey, startOfWeek, startOfMonth, formatMinutesLabel } =
    window.TimeWiseUtils;

  const toMinutes = seconds => Math.round((seconds || 0) / 60);
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

  const buildActivityMap = () =>
    new Map(getActivities().map(act => [act.id, act]));

  const sumInactivityForRange = (sessions, startTs, endTs) => {
    const dayKeys = new Set();
    sessions.forEach(session => {
      const ts = session.sessionStart;
      if (ts >= startTs && ts < endTs) {
        dayKeys.add(getDateKey(ts));
      }
    });
    let totalMs = 0;
    dayKeys.forEach(key => {
      const snapshot = getDaySnapshot(key);
      if (snapshot && Number.isFinite(snapshot.inactivityDurationMs)) {
        totalMs += Math.max(0, snapshot.inactivityDurationMs);
      }
    });
    return totalMs;
  };

  const buildUnit = (label, startTs, endTs, sessions, activityMap) => {
    const totals = new Map();
    let totalSeconds = 0;
    const unitSessions = [];
    sessions.forEach(session => {
      const ts = session.sessionStart;
      if (ts >= startTs && ts < endTs) {
        unitSessions.push(session);
        const duration = Math.max(0, session.totalDuration || 0);
        totalSeconds += duration;
        totals.set(session.activityId, (totals.get(session.activityId) || 0) + duration);
      }
    });
    const rows = Array.from(totals.entries())
      .map(([activityId, seconds]) => {
        const act = activityMap.get(activityId) || {
          label: 'Unknown',
          category: 'personal',
          priority: 'medium',
          cognitiveLoad: 'moderate',
          archived: false
        };
        return {
          label: act.label,
          category: act.category,
          priority: act.priority,
          cognitiveLoad: act.cognitiveLoad,
          archived: act.archived,
          totalSeconds: seconds,
          totalFormatted: formatMinutesLabel(toMinutes(seconds))
        };
      })
      .sort((a, b) => {
        const rankA = PRIORITY_RANK[a.priority] ?? 3;
        const rankB = PRIORITY_RANK[b.priority] ?? 3;
        if (rankA !== rankB) return rankA - rankB;
        return b.totalSeconds - a.totalSeconds;
      });
    const inactivityMs = sumInactivityForRange(unitSessions, startTs, endTs);
    return { label, totalSeconds, inactivityMs, rows };
  };

  const buildDailySeries = (sessions, activityMap, offset = 0, days = 7) => {
    const labels = [];
    const dataTracked = [];
    const dataInactivity = [];
    const units = [];
    const endDay = new Date();
    endDay.setHours(0, 0, 0, 0);
    endDay.setDate(endDay.getDate() - offset);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDay);
      d.setDate(endDay.getDate() - i);
      const start = d.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const unit = buildUnit(label, start, end, sessions, activityMap);
      labels.push(label);
      dataTracked.push(toMinutes(unit.totalSeconds));
      dataInactivity.push(Math.round((unit.inactivityMs || 0) / 60000));
      units.push(unit);
    }
    const startWindow = new Date(endDay);
    startWindow.setDate(endDay.getDate() - (days - 1));
    return { labels, dataTracked, dataInactivity, units, windowStart: startWindow.getTime() };
  };

  const buildWeeklySeries = (sessions, activityMap, weekStart = 'monday', offset = 0, weeks = 8) => {
    const labels = [];
    const dataTracked = [];
    const dataInactivity = [];
    const units = [];
    const now = new Date();
    const currentWeekStart = startOfWeek(now, weekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() - offset * 7);
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const label = `${start.getMonth() + 1}/${start.getDate()}`;
      const unit = buildUnit(label, start.getTime(), end.getTime(), sessions, activityMap);
      labels.push(label);
      dataTracked.push(toMinutes(unit.totalSeconds));
      dataInactivity.push(Math.round((unit.inactivityMs || 0) / 60000));
      units.push(unit);
    }
    const startWindow = new Date(currentWeekStart);
    startWindow.setDate(currentWeekStart.getDate() - (weeks - 1) * 7);
    return { labels, dataTracked, dataInactivity, units, windowStart: startWindow.getTime() };
  };

  const buildMonthlySeries = (sessions, activityMap, offset = 0, months = 6) => {
    const labels = [];
    const dataTracked = [];
    const dataInactivity = [];
    const units = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(now);
      monthStart.setMonth(monthStart.getMonth() - (i + offset));
      const nextMonth = startOfMonth(new Date(monthStart));
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const label = `${monthStart.getMonth() + 1}/${monthStart.getFullYear()}`;
      const unit = buildUnit(
        label,
        monthStart.getTime(),
        nextMonth.getTime(),
        sessions,
        activityMap
      );
      labels.push(label);
      dataTracked.push(toMinutes(unit.totalSeconds));
      dataInactivity.push(Math.round((unit.inactivityMs || 0) / 60000));
      units.push(unit);
    }
    const startWindow = startOfMonth(now);
    startWindow.setMonth(startWindow.getMonth() - (months - 1 + offset));
    return { labels, dataTracked, dataInactivity, units, windowStart: startWindow.getTime() };
  };

  const getStats = (period, offset = 0) => {
    const sessions = getSessions();
    const activityMap = buildActivityMap();
    const config = getUserConfig();
    const weekStartPref = config.weekStart || 'monday';
    const minSessionStart =
      sessions.length > 0
        ? Math.min(...sessions.map(s => s.sessionStart || Infinity))
        : null;

    let result;
    if (period === 'daily') {
      result = buildDailySeries(sessions, activityMap, offset);
    } else if (period === 'weekly') {
      result = buildWeeklySeries(sessions, activityMap, weekStartPref, offset);
    } else {
      result = buildMonthlySeries(sessions, activityMap, offset);
    }

    const hasPrev = minSessionStart !== null && result.windowStart > minSessionStart;
    const hasNext = offset > 0;

    return {
      labels: result.labels,
      dataTracked: result.dataTracked,
      dataInactivity: result.dataInactivity,
      units: result.units,
      hasPrev,
      hasNext
    };
  };

  window.TimeWiseStats = { getStats };
})();
