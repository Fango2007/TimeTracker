// Activity management: CRUD, validation, ordering, archive/delete rules
(() => {
  const {
    generateId,
    isValidPriority,
    isValidCognitiveLoad,
    isValidCategory,
    WEEKDAYS
  } = window.TimeWiseUtils;
  const { getActivities, saveActivities, getSessions, getUserConfig } = window.TimeWiseStorage;

  const normalizeLabel = label => label.trim();

  const labelExists = (activities, label, ignoreId = null) =>
    activities.some(
      act =>
        act.id !== ignoreId &&
      act.label.toLowerCase() === label.trim().toLowerCase()
    );

  const isValidDescription = value =>
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim().length <= 300);

  const isValidEstimatedDuration = value => {
    if (value === null || value === undefined || value === '') return true;
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
  };

  const isValidDeadline = value => {
    if (value === null || value === undefined || value === '') return true;
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
    const date = new Date(trimmed);
    return !Number.isNaN(date.getTime());
  };

  const isValidScheduledDays = value => {
    if (value === null || value === undefined || value === '') return true;
    if (!Array.isArray(value)) return false;
    return value.every(day => WEEKDAYS.includes(String(day).toLowerCase()));
  };

  const normalizeScheduledDays = value => {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    value.forEach(day => {
      const key = String(day).toLowerCase();
      if (WEEKDAYS.includes(key)) {
        seen.add(key);
      }
    });
    return Array.from(seen);
  };

  const normalizeDescription = value => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed.slice(0, 300) : null;
  };

  const normalizeEstimatedDuration = value => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isInteger(num) && num > 0 ? num : null;
  };

  const normalizeDeadline = value => {
    if (value === null || value === undefined || value === '') return null;
    const trimmed = String(value).trim();
    return trimmed || null;
  };

  const validateActivity = ({
    label,
    category,
    priority,
    cognitiveLoad,
    description,
    estimatedDuration,
    deadline,
    scheduledDays
  }) => {
    if (!label || !label.trim()) return 'Label is required';
    if (label.trim().length > 120) return 'Label is too long';
    if (!isValidCategory(category)) return 'Invalid category';
    if (!isValidPriority(priority)) return 'Invalid priority';
    if (!isValidCognitiveLoad(cognitiveLoad)) return 'Invalid cognitive load';
    if (!isValidDescription(description)) return 'Invalid description';
    if (!isValidEstimatedDuration(estimatedDuration)) return 'Invalid estimated duration';
    if (!isValidDeadline(deadline)) return 'Invalid deadline';
    if (!isValidScheduledDays(scheduledDays)) return 'Invalid scheduled days';
    return null;
  };

  const hasSessions = activityId => {
    const sessions = getSessions();
    return sessions.some(session => session.activityId === activityId);
  };

  const createActivity = payload => {
    const activities = getActivities();
    const config = getUserConfig();
    const withDefaults = {
      ...payload,
      priority: payload.priority || 'medium',
      cognitiveLoad: payload.cognitiveLoad || 'moderate',
      dailyMax:
        payload.dailyMax === null || payload.dailyMax === ''
          ? config.defaultDailyMaxMinutes
          : payload.dailyMax,
      sessionMax:
        payload.sessionMax === null || payload.sessionMax === ''
          ? config.defaultSessionMaxMinutes
          : payload.sessionMax
    };
    const error = validateActivity(withDefaults);
    if (error) return { error };

    const label = normalizeLabel(withDefaults.label);
    if (labelExists(activities, label)) {
      return { error: 'Activity label must be unique' };
    }

    const newActivity = {
      id: generateId(),
      label,
      category: withDefaults.category,
      priority: withDefaults.priority,
      cognitiveLoad: withDefaults.cognitiveLoad,
      dailyMax:
        withDefaults.dailyMax === null || withDefaults.dailyMax === ''
          ? null
          : Number(withDefaults.dailyMax),
      sessionMax:
        withDefaults.sessionMax === null || withDefaults.sessionMax === ''
          ? null
          : Number(withDefaults.sessionMax),
      description: normalizeDescription(withDefaults.description),
      estimatedDuration: normalizeEstimatedDuration(withDefaults.estimatedDuration),
      deadline: normalizeDeadline(withDefaults.deadline),
      scheduledDays: normalizeScheduledDays(withDefaults.scheduledDays),
      archived: false
    };
    activities.push(newActivity);
    saveActivities(activities);
    return { activity: newActivity };
  };

  const updateActivity = (id, updates) => {
    const activities = getActivities();
    const idx = activities.findIndex(a => a.id === id);
    if (idx === -1) return { error: 'Activity not found' };

    const merged = { ...activities[idx], ...updates };
    const error = validateActivity(merged);
    if (error) return { error };

    merged.label = normalizeLabel(merged.label);
    if (labelExists(activities, merged.label, id)) {
      return { error: 'Activity label must be unique' };
    }

    merged.dailyMax =
      merged.dailyMax === null || merged.dailyMax === ''
        ? null
        : Number(merged.dailyMax);
    merged.sessionMax =
      merged.sessionMax === null || merged.sessionMax === ''
        ? null
        : Number(merged.sessionMax);
    merged.description = normalizeDescription(merged.description);
    merged.estimatedDuration = normalizeEstimatedDuration(merged.estimatedDuration);
    merged.deadline = normalizeDeadline(merged.deadline);
    merged.scheduledDays = normalizeScheduledDays(merged.scheduledDays);

    activities[idx] = merged;
    saveActivities(activities);
    return { activity: merged };
  };

  const archiveActivity = id => updateActivity(id, { archived: true });

  const deleteActivity = id => {
    if (hasSessions(id)) {
      return { error: 'Activities with sessions must be archived instead' };
    }
    const activities = getActivities().filter(act => act.id !== id);
    saveActivities(activities);
    return { ok: true };
  };

  const reorderActivities = orderedIds => {
    const activities = getActivities();
    const map = new Map(activities.map(a => [a.id, a]));
    const reordered = [];
    orderedIds.forEach(id => {
      if (map.has(id)) reordered.push(map.get(id));
    });
    // append any missing ids to avoid accidental loss
    activities.forEach(act => {
      if (!orderedIds.includes(act.id)) reordered.push(act);
    });
    saveActivities(reordered);
    return reordered;
  };

  const reorderAndReprioritize = priorityBuckets => {
    const activities = getActivities();
    const map = new Map(activities.map(a => [a.id, a]));
    const reordered = [];
    const seen = new Set();
    const bucketOrder = ['high', 'medium', 'low'];

    bucketOrder.forEach(bucket => {
      const ids = priorityBuckets[bucket] || [];
      ids.forEach(id => {
        const act = map.get(id);
        if (!act) return;
        seen.add(id);
        const updated = { ...act, priority: bucket };
        const error = validateActivity(updated);
        if (error) return;
        reordered.push(updated);
      });
    });

    // append remaining activities (including archived or missing from buckets) preserving original order
    activities.forEach(act => {
      if (!seen.has(act.id)) {
        reordered.push(act);
      }
    });

    saveActivities(reordered);
    return reordered;
  };

  const getActiveActivities = () =>
    getActivities().filter(act => !act.archived);

  const totalTrackedMinutes = activityId => {
    if (!activityId) return 0;
    const sessions = getSessions();
    const totalSeconds = sessions
      .filter(session => session.activityId === activityId)
      .reduce((acc, session) => acc + Math.max(0, session.totalDuration || 0), 0);
    return Math.round(totalSeconds / 60);
  };

  const completionPercentage = activity => {
    if (!activity || !activity.id) return null;
    const estimated = normalizeEstimatedDuration(activity.estimatedDuration);
    if (!estimated) return null;
    const trackedMinutes = totalTrackedMinutes(activity.id);
    return Math.min(100, Math.round((trackedMinutes / estimated) * 100));
  };

  window.TimeWiseActivities = {
    createActivity,
    updateActivity,
    archiveActivity,
    deleteActivity,
    reorderActivities,
    reorderAndReprioritize,
    getActiveActivities,
    hasSessions,
    totalTrackedMinutes,
    completionPercentage
  };
})();

// Daily Feasibility Engine (logic only, no UI)
(() => {
  const { getActivities, getUserConfig } = window.TimeWiseStorage;
  const { getWeekdayKey } = window.TimeWiseUtils;
  const { totalTrackedMinutes } = window.TimeWiseActivities;

  const countRemainingScheduledDays = (scheduledDays, deadline, todayDate) => {
    if (!Array.isArray(scheduledDays) || !scheduledDays.length || !deadline) return 0;
    const normalizedDays = new Set(scheduledDays.map(day => String(day).toLowerCase()));
    const today = new Date(todayDate);
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    if (Number.isNaN(deadlineDate.getTime()) || today > deadlineDate) return 0;
    let count = 0;
    const cursor = new Date(today);
    while (cursor <= deadlineDate) {
      const weekday = getWeekdayKey(cursor);
      if (normalizedDays.has(weekday)) {
        count += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  };

  const getDailyFeasibility = (todayDate = new Date()) => {
    const activities = getActivities();
    const config = getUserConfig();
    const weekdayKey = getWeekdayKey(todayDate);
    const targetHours =
      config.dailyWorkTargets && config.dailyWorkTargets[weekdayKey] !== undefined
        ? config.dailyWorkTargets[weekdayKey]
        : 0;
    const targetMinutes = Math.max(0, Number(targetHours) * 60);

    let requiredTotalToday = 0;
    let impossible = false;

    activities.forEach(activity => {
      if (
        activity.archived ||
        !Array.isArray(activity.scheduledDays) ||
        !activity.scheduledDays.length ||
        !activity.deadline ||
        !activity.estimatedDuration
      ) {
        return;
      }
      const todayWeekday = weekdayKey;
      const normalizedDays = activity.scheduledDays.map(day => String(day).toLowerCase());
      if (!normalizedDays.includes(todayWeekday)) return;

      const estimated = Number(activity.estimatedDuration);
      if (!Number.isInteger(estimated) || estimated <= 0) return;
      const remainingMinutes = Math.max(0, estimated - totalTrackedMinutes(activity.id));
      const remainingDays = countRemainingScheduledDays(
        normalizedDays,
        activity.deadline,
        todayDate
      );
      if (remainingDays <= 0) {
        impossible = true;
        return;
      }
      requiredTotalToday += remainingMinutes / remainingDays;
    });

    let state = 'not_feasible';
    if (!impossible) {
      if (requiredTotalToday <= targetMinutes) {
        state = 'feasible';
      } else if (requiredTotalToday <= targetMinutes * 1.25) {
        state = 'tight';
      }
    }

    return {
      state: impossible ? 'not_feasible' : state,
      requiredTotalToday,
      target: targetMinutes
    };
  };

  window.TimeWiseFeasibility = { getDailyFeasibility };
})();
