// Activity management: CRUD, validation, ordering, archive/delete rules
(() => {
  const {
    generateId,
    isValidPriority,
    isValidCognitiveLoad,
    isValidCategory
  } = window.TimeWiseUtils;
  const { getActivities, saveActivities, getSessions, getUserConfig } = window.TimeWiseStorage;

  const normalizeLabel = label => label.trim();

  const labelExists = (activities, label, ignoreId = null) =>
    activities.some(
      act =>
        act.id !== ignoreId &&
        act.label.toLowerCase() === label.trim().toLowerCase()
    );

  const validateActivity = ({ label, category, priority, cognitiveLoad }) => {
    if (!label || !label.trim()) return 'Label is required';
    if (label.trim().length > 120) return 'Label is too long';
    if (!isValidCategory(category)) return 'Invalid category';
    if (!isValidPriority(priority)) return 'Invalid priority';
    if (!isValidCognitiveLoad(cognitiveLoad)) return 'Invalid cognitive load';
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

  window.TimeWiseActivities = {
    createActivity,
    updateActivity,
    archiveActivity,
    deleteActivity,
    reorderActivities,
    reorderAndReprioritize,
    getActiveActivities,
    hasSessions
  };
})();
