// Statistics aggregation with inactivity and selection-based detail panel
(() => {
  const { getSessions, getActivities, getUserConfig } = window.TimeWiseStorage;
  const {
    getDateKey,
    startOfWeek,
    startOfMonth,
    formatMinutesLabel,
    getWeekdayKey
  } = window.TimeWiseUtils;

  const minutes = seconds => Math.round((seconds || 0) / 60);

  const buildActivityMap = () => new Map(getActivities().map(act => [act.id, act]));

  const startOfDay = date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const groupSessionsByDay = sessions => {
    const map = new Map();
    sessions.forEach(session => {
      const key = getDateKey(session.sessionStart);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(session);
    });
    return map;
  };

  const buildDaySummaries = (sessions, startDate, endDate, config, activityMap) => {
    const sessionsByDay = groupSessionsByDay(sessions);
    const days = [];
    const cursor = startOfDay(startDate);
    const end = startOfDay(endDate);
    while (cursor.getTime() <= end.getTime()) {
      const key = getDateKey(cursor);
      const daySessions = (sessionsByDay.get(key) || []).slice().sort(
        (a, b) => a.sessionStart - b.sessionStart
      );

      const targetHours = config.dailyWorkTargets[getWeekdayKey(cursor)] || 0;
      const targetSeconds = Math.max(0, targetHours * 3600);
      const perActivity = new Map();

      const totalTracked = daySessions.reduce(
        (acc, s) => acc + Math.max(0, s.totalDuration || 0),
        0
      );

      if (targetSeconds === 0) {
        // No target: only show tracked time, no inactivity
        daySessions.forEach(session => {
          const duration = Math.max(0, session.totalDuration || 0);
          if (duration > 0) {
            perActivity.set(
              session.activityId,
              (perActivity.get(session.activityId) || 0) + duration
            );
          }
        });
        days.push({
          key,
          label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
          date: new Date(cursor),
          totalTrackedSeconds: totalTracked,
          inactivitySeconds: 0,
          perActivity
        });
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      if (daySessions.length === 0) {
        // No work logged: full target is inactivity
        days.push({
          key,
          label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
          date: new Date(cursor),
          totalTrackedSeconds: 0,
          inactivitySeconds: targetSeconds,
          perActivity
        });
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      // Inactivity only changes when a session is saved; cap tracked to target and fill remainder as inactivity.
      let remaining = targetSeconds;
      daySessions.forEach(session => {
        if (remaining <= 0) return;
        const duration = Math.max(0, session.totalDuration || 0);
        const add = Math.min(duration, remaining);
        if (add > 0) {
          perActivity.set(
            session.activityId,
            (perActivity.get(session.activityId) || 0) + add
          );
          remaining -= add;
        }
      });
      const trackedSeconds = Math.min(totalTracked, targetSeconds);
      const inactivitySeconds = Math.max(0, targetSeconds - trackedSeconds);

      days.push({
        key,
        label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
        date: new Date(cursor),
        totalTrackedSeconds: trackedSeconds,
        inactivitySeconds,
        perActivity
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  };

  const rowsFromMap = (perActivity, totalTrackedSeconds, activityMap) => {
    const rows = [];
    perActivity.forEach((seconds, activityId) => {
      const act = activityMap.get(activityId) || {
        label: 'Unknown',
        category: 'personal',
        priority: 'medium',
        cognitiveLoad: 'moderate',
        archived: false
      };
      const percent = totalTrackedSeconds
        ? Math.round((seconds / totalTrackedSeconds) * 100)
        : 0;
      rows.push({
        label: act.label,
        category: act.category,
        priority: act.priority,
        cognitiveLoad: act.cognitiveLoad,
        archived: act.archived,
        totalFormatted: formatMinutesLabel(minutes(seconds)),
        percent
      });
    });
    return rows.sort((a, b) => b.percent - a.percent);
  };

  const takeLast = (list, count) => list.slice(Math.max(list.length - count, 0));

  const aggregateByWeek = (days, weekStart) => {
    const buckets = new Map();
    days.forEach(day => {
      const bucketKey = startOfWeek(day.date, weekStart).getTime();
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          label: `${day.date.getMonth() + 1}/${day.date.getDate()}`,
          perActivity: new Map(),
          trackedSeconds: 0,
          inactivitySeconds: 0
        });
      }
      const bucket = buckets.get(bucketKey);
      bucket.trackedSeconds += day.totalTrackedSeconds;
      bucket.inactivitySeconds += day.inactivitySeconds;
      day.perActivity.forEach((seconds, actId) => {
        bucket.perActivity.set(actId, (bucket.perActivity.get(actId) || 0) + seconds);
      });
    });
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(entry => entry[1]);
  };

  const aggregateByMonth = days => {
    const buckets = new Map();
    days.forEach(day => {
      const monthStart = startOfMonth(day.date).getTime();
      const label = `${day.date.getMonth() + 1}/${day.date.getFullYear()}`;
      if (!buckets.has(monthStart)) {
        buckets.set(monthStart, {
          label,
          perActivity: new Map(),
          trackedSeconds: 0,
          inactivitySeconds: 0
        });
      }
      const bucket = buckets.get(monthStart);
      bucket.trackedSeconds += day.totalTrackedSeconds;
      bucket.inactivitySeconds += day.inactivitySeconds;
      day.perActivity.forEach((seconds, actId) => {
        bucket.perActivity.set(actId, (bucket.perActivity.get(actId) || 0) + seconds);
      });
    });
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(entry => entry[1]);
  };

  const formatUnits = (units, activityMap) =>
    units.map(unit => ({
      label: unit.label,
      trackedMinutes: minutes(unit.trackedSeconds),
      inactivityMinutes: minutes(unit.inactivitySeconds),
      rows: rowsFromMap(unit.perActivity, unit.trackedSeconds, activityMap)
    }));

  const getStats = period => {
    const sessions = getSessions();
    const config = getUserConfig();
    const activityMap = buildActivityMap();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === 'daily') {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      const days = buildDaySummaries(sessions, start, today, config, activityMap);
      const series = takeLast(days, 7);
      return {
        labels: series.map(d => d.label),
        tracked: series.map(d => minutes(d.totalTrackedSeconds)),
        inactivity: series.map(d => minutes(d.inactivitySeconds)),
        units: formatUnits(series, activityMap)
      };
    }

    if (period === 'weekly') {
      const endWeekStart = startOfWeek(today, config.weekStart || 'monday');
      const start = new Date(endWeekStart);
      start.setDate(start.getDate() - 7 * 7);
      const days = buildDaySummaries(sessions, start, today, config, activityMap);
      const weeks = aggregateByWeek(days, config.weekStart || 'monday');
      const series = takeLast(weeks, 8);
      return {
        labels: series.map(w => w.label),
        tracked: series.map(w => minutes(w.trackedSeconds)),
        inactivity: series.map(w => minutes(w.inactivitySeconds)),
        units: formatUnits(series, activityMap)
      };
    }

    const monthStart = startOfMonth(today);
    monthStart.setMonth(monthStart.getMonth() - 5);
    const days = buildDaySummaries(sessions, monthStart, today, config, activityMap);
    const months = aggregateByMonth(days);
    const series = takeLast(months, 6);
    return {
      labels: series.map(m => m.label),
      tracked: series.map(m => minutes(m.trackedSeconds)),
      inactivity: series.map(m => minutes(m.inactivitySeconds)),
      units: formatUnits(series, activityMap)
    };
  };

  window.TimeWiseStats = {
    getStats
  };
})();
