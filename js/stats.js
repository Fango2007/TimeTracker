// Statistics aggregation with selectable unit and time navigation (no inactivity)
(() => {
  const { getSessions, getActivities, getUserConfig } = window.TimeWiseStorage;
  const { startOfWeek, startOfMonth, formatMinutesLabel } = window.TimeWiseUtils;

  const DAILY_WINDOW = 7;
  const WEEKLY_WINDOW = 8;
  const MONTHLY_WINDOW = 6;

  const toMinutes = seconds => Math.round((seconds || 0) / 60);

  const buildActivityMap = () =>
    new Map(getActivities().map(act => [act.id, act]));

  const buildRows = (totals, totalSeconds, activityMap) =>
    Array.from(totals.entries())
      .map(([activityId, seconds]) => {
        const act = activityMap.get(activityId) || {
          label: 'Unknown',
          category: 'personal',
          priority: 'medium',
          cognitiveLoad: 'moderate',
          archived: false
        };
        const percent = totalSeconds ? Math.round((seconds / totalSeconds) * 100) : 0;
        return {
          label: act.label,
          category: act.category,
          priority: act.priority,
          cognitiveLoad: act.cognitiveLoad,
          archived: act.archived,
          totalFormatted: formatMinutesLabel(toMinutes(seconds)),
          percent
        };
      })
      .sort((a, b) => b.percent - a.percent);

  const buildUnit = (label, startTs, endTs, sessions, activityMap) => {
    const totals = new Map();
    let totalSeconds = 0;
    sessions.forEach(session => {
      const ts = session.sessionStart;
      if (ts >= startTs && ts < endTs) {
        const duration = Math.max(0, session.totalDuration || 0);
        totalSeconds += duration;
        totals.set(session.activityId, (totals.get(session.activityId) || 0) + duration);
      }
    });
    return {
      label,
      totalSeconds,
      rows: buildRows(totals, totalSeconds, activityMap)
    };
  };

  const buildDaily = (sessions, activityMap, offset) => {
    const endDay = new Date();
    endDay.setHours(0, 0, 0, 0);
    endDay.setDate(endDay.getDate() - offset * DAILY_WINDOW);
    const startDay = new Date(endDay);
    startDay.setDate(startDay.getDate() - (DAILY_WINDOW - 1));

    const units = [];
    for (let i = 0; i < DAILY_WINDOW; i++) {
      const dayStart = new Date(startDay);
      dayStart.setDate(startDay.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const label = `${dayStart.getMonth() + 1}/${dayStart.getDate()}`;
      units.push(buildUnit(label, dayStart.getTime(), dayEnd.getTime(), sessions, activityMap));
    }
    return { units, windowStart: startDay.getTime() };
  };

  const buildWeekly = (sessions, activityMap, offset, weekStartPref) => {
    const startWeek = startOfWeek(new Date(), weekStartPref);
    startWeek.setDate(startWeek.getDate() - (WEEKLY_WINDOW - 1 + offset * WEEKLY_WINDOW) * 7);
    const units = [];
    for (let i = 0; i < WEEKLY_WINDOW; i++) {
      const weekStart = new Date(startWeek);
      weekStart.setDate(startWeek.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      units.push(buildUnit(label, weekStart.getTime(), weekEnd.getTime(), sessions, activityMap));
    }
    return { units, windowStart: startWeek.getTime() };
  };

  const buildMonthly = (sessions, activityMap, offset) => {
    const startMonth = startOfMonth(new Date());
    startMonth.setMonth(startMonth.getMonth() - (MONTHLY_WINDOW - 1 + offset * MONTHLY_WINDOW));
    const units = [];
    for (let i = 0; i < MONTHLY_WINDOW; i++) {
      const monthStart = startOfMonth(new Date(startMonth));
      monthStart.setMonth(startMonth.getMonth() + i);
      const nextMonth = startOfMonth(new Date(monthStart));
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const label = `${monthStart.getMonth() + 1}/${monthStart.getFullYear()}`;
      units.push(buildUnit(label, monthStart.getTime(), nextMonth.getTime(), sessions, activityMap));
    }
    return { units, windowStart: startMonth.getTime() };
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

    let units = [];
    let windowStart = 0;

    if (period === 'weekly') {
      ({ units, windowStart } = buildWeekly(sessions, activityMap, offset, weekStartPref));
    } else if (period === 'monthly') {
      ({ units, windowStart } = buildMonthly(sessions, activityMap, offset));
    } else {
      ({ units, windowStart } = buildDaily(sessions, activityMap, offset));
    }

    const labels = units.map(u => u.label);
    const data = units.map(u => toMinutes(u.totalSeconds));

    const hasPrev = minSessionStart !== null && windowStart > minSessionStart;
    const hasNext = offset > 0;

    return {
      labels,
      data,
      units,
      hasPrev,
      hasNext
    };
  };

  window.TimeWiseStats = { getStats };
})();
