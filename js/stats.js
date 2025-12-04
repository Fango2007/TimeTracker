// Statistics aggregation for daily / weekly / monthly charts and tables
(() => {
  const { getSessions, getActivities, getUserConfig } = window.TimeWiseStorage;
  const { getDateKey, startOfWeek, startOfMonth, formatMinutesLabel } =
    window.TimeWiseUtils;

  const toMinutes = seconds => Math.round((seconds || 0) / 60);

  const buildActivityMap = () =>
    new Map(getActivities().map(act => [act.id, act]));

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
    const priorityRank = { high: 0, medium: 1, low: 2 };
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
        const rankA = priorityRank[a.priority] ?? 3;
        const rankB = priorityRank[b.priority] ?? 3;
        if (rankA !== rankB) return rankA - rankB;
        return b.totalSeconds - a.totalSeconds;
      });
    return { label, totalSeconds, rows };
  };

  const buildDailySeries = (sessions, activityMap, offset = 0, days = 7) => {
    const labels = [];
    const data = [];
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
      data.push(toMinutes(unit.totalSeconds));
      units.push(unit);
    }
    return { labels, data, units };
  };

  const buildWeeklySeries = (sessions, activityMap, weekStart = 'monday', offset = 0, weeks = 8) => {
    const labels = [];
    const data = [];
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
      data.push(toMinutes(unit.totalSeconds));
      units.push(unit);
    }
    return { labels, data, units };
  };

  const buildMonthlySeries = (sessions, activityMap, offset = 0, months = 6) => {
    const labels = [];
    const data = [];
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
      data.push(toMinutes(unit.totalSeconds));
      units.push(unit);
    }
    return { labels, data, units };
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

    let windowStart = 0;
    let result;

    if (period === 'daily') {
      result = buildDailySeries(sessions, activityMap, offset);
      const endDay = new Date();
      endDay.setHours(0, 0, 0, 0);
      endDay.setDate(endDay.getDate() - offset);
      const startDay = new Date(endDay);
      startDay.setDate(startDay.getDate() - (result.units.length - 1));
      windowStart = startDay.getTime();
    } else if (period === 'weekly') {
      result = buildWeeklySeries(sessions, activityMap, weekStartPref, offset);
      const endWeek = startOfWeek(new Date(), weekStartPref);
      endWeek.setDate(endWeek.getDate() - offset * 7);
      const startWeek = new Date(endWeek);
      startWeek.setDate(startWeek.getDate() - (result.units.length - 1) * 7);
      windowStart = startWeek.getTime();
    } else {
      result = buildMonthlySeries(sessions, activityMap, offset);
      const endMonth = startOfMonth(new Date());
      endMonth.setMonth(endMonth.getMonth() - offset);
      const startMonth = startOfMonth(new Date(endMonth));
      startMonth.setMonth(startMonth.getMonth() - (result.units.length - 1));
      windowStart = startMonth.getTime();
    }

    const hasPrev = minSessionStart !== null && windowStart > minSessionStart;
    const hasNext = offset > 0;

    return {
      ...result,
      hasPrev,
      hasNext
    };
  };

  window.TimeWiseStats = {
    getStats
  };
})();
