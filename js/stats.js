// Statistics aggregation for daily / weekly / monthly charts and tables
(() => {
  const { getSessions, getActivities, getUserConfig } = window.TimeWiseStorage;
  const {
    getDateKey,
    startOfWeek,
    startOfMonth,
    formatMinutesLabel
  } = window.TimeWiseUtils;

  const sumDurations = (sessions, predicate) =>
    sessions
      .filter(predicate)
      .reduce((acc, session) => acc + (session.totalDuration || 0), 0);

  const buildDailySeries = (sessions, days = 7) => {
    const labels = [];
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      const total = sumDurations(
        sessions,
        session => getDateKey(session.sessionStart) === key
      );
      data.push(Math.round(total / 60));
    }
    return { labels, data };
  };

  const buildWeeklySeries = (sessions, weekStart = 'monday', weeks = 8) => {
    const labels = [];
    const data = [];
    const now = new Date();
    const currentWeekStart = startOfWeek(now, weekStart);
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      labels.push(
        `${start.getMonth() + 1}/${start.getDate()}`
      );
      const total = sumDurations(
        sessions,
        session => {
          const ts = session.sessionStart;
          return ts >= start.getTime() && ts < end.getTime();
        }
      );
      data.push(Math.round(total / 60));
    }
    return { labels, data };
  };

  const buildMonthlySeries = (sessions, months = 6) => {
    const labels = [];
    const data = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(now);
      monthStart.setMonth(monthStart.getMonth() - i);
      const nextMonth = startOfMonth(new Date(monthStart));
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      labels.push(`${monthStart.getMonth() + 1}/${monthStart.getFullYear()}`);
      const total = sumDurations(
        sessions,
        session => {
          const ts = session.sessionStart;
          return ts >= monthStart.getTime() && ts < nextMonth.getTime();
        }
      );
      data.push(Math.round(total / 60));
    }
    return { labels, data };
  };

  const buildActivityTable = (sessions, rangeStart) => {
    const activities = getActivities();
    const now = Date.now();
    const totals = new Map();
    sessions
      .filter(s => !rangeStart || s.sessionStart >= rangeStart)
      .forEach(session => {
        totals.set(
          session.activityId,
          (totals.get(session.activityId) || 0) + (session.totalDuration || 0)
        );
      });
    return activities
      .map(act => ({
        ...act,
        totalSeconds: totals.get(act.id) || 0
      }))
      .filter(row => row.totalSeconds > 0)
      .sort((a, b) => b.totalSeconds - a.totalSeconds)
      .map(row => ({
        label: row.label,
        category: row.category,
        priority: row.priority,
        cognitiveLoad: row.cognitiveLoad,
        archived: row.archived,
        totalFormatted: formatMinutesLabel(Math.round(row.totalSeconds / 60))
      }));
  };

  const getStats = period => {
    const sessions = getSessions();
    const config = getUserConfig();
    const weekStartPref = config.weekStart || 'monday';
    if (period === 'daily') {
      const rangeStart = (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - 6);
        return d.getTime();
      })();
      return {
        ...buildDailySeries(sessions),
        table: buildActivityTable(sessions, rangeStart)
      };
    }
    if (period === 'weekly') {
      const rangeStart = (() => {
        const d = startOfWeek(new Date(), weekStartPref);
        d.setDate(d.getDate() - 7 * 7);
        return d.getTime();
      })();
      return {
        ...buildWeeklySeries(sessions, weekStartPref),
        table: buildActivityTable(sessions, rangeStart)
      };
    }
    const rangeStart = (() => {
      const d = startOfMonth(new Date());
      d.setMonth(d.getMonth() - 5);
      return d.getTime();
    })();
    return {
      ...buildMonthlySeries(sessions),
      table: buildActivityTable(sessions, rangeStart)
    };
  };

  window.TimeWiseStats = {
    getStats
  };
})();
