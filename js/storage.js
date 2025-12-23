// LocalStorage wrapper with validation and sensible defaults
(() => {
  const ACTIVITIES_KEY = 'activities';
  const LOGS_KEY = 'logs';
  const USER_CONFIG_KEY = 'userConfig';
  const DAY_SNAPSHOTS_KEY = 'daySnapshots';

  const {
    safeParseJSON,
    deepClone,
    isValidCategory,
    isValidPriority,
    isValidCognitiveLoad,
    getDateKey,
    WEEKDAYS
  } = window.TimeWiseUtils;

  const DEFAULT_USER_CONFIG = {
    soundEnabled: true,
    defaultSessionMaxMinutes: null,
    defaultDailyMaxMinutes: null,
    dailyWorkTargets: {
      monday: 7,
      tuesday: 7,
      wednesday: 7,
      thursday: 7,
      friday: 7,
      saturday: 3,
      sunday: 0
    },
    weekStart: 'monday',
    // NEW: Day structure configuration fields
    dayStartTimes: {
      monday: '09:00',
      tuesday: '09:00',
      wednesday: '09:00',
      thursday: '09:00',
      friday: '09:00',
      saturday: '10:00',
      sunday: '00:00'
    },
    lunchBreakStartTimes: {
      monday: '12:00',
      tuesday: '12:00',
      wednesday: '12:00',
      thursday: '12:00',
      friday: '12:00',
      saturday: '12:30',
      sunday: '00:00'
    },
    lunchBreakDurations: {
      monday: 30,
      tuesday: 30,
      wednesday: 30,
      thursday: 30,
      friday: 30,
      saturday: 30,
      sunday: 0
    }
  };

  const readArray = (key) => {
    const raw = localStorage.getItem(key);
    const parsed = safeParseJSON(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  };

  const writeArray = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value || []));
  };

  const readObject = (key) => {
    const raw = localStorage.getItem(key);
    const parsed = safeParseJSON(raw, {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  };

  const writeObject = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value || {}));
  };

  const getActivities = () => deepClone(readArray(ACTIVITIES_KEY));
  const saveActivities = (activities) => writeArray(ACTIVITIES_KEY, activities);

  const getSessions = () => deepClone(readArray(LOGS_KEY));
  const saveSessions = (sessions) => writeArray(LOGS_KEY, sessions);

  const createEmptySnapshot = (date) => ({
    date,
    firstTimerAt: null,
    dayEndAt: null
  });

  const sanitizeSnapshot = (date, snapshot) => {
    const safe = createEmptySnapshot(date);
    if (snapshot && typeof snapshot === 'object') {
      const first = snapshot.firstTimerAt;
      const end = snapshot.dayEndAt;
      const inactivity = snapshot.inactivityDurationMs;
      if (Number.isFinite(first)) {
        safe.firstTimerAt = first;
      }
      if (Number.isFinite(end)) {
        safe.dayEndAt = end;
      }
      if (Number.isFinite(inactivity) && inactivity >= 0) {
        safe.inactivityDurationMs = inactivity;
      }
    }
    return safe;
  };

  const getDaySnapshots = () => {
    const raw = readObject(DAY_SNAPSHOTS_KEY);
    const result = {};
    Object.keys(raw).forEach(date => {
      result[date] = sanitizeSnapshot(date, raw[date]);
    });
    return deepClone(result);
  };

  const saveDaySnapshots = (snapshots) => {
    const safe = {};
    if (snapshots && typeof snapshots === 'object') {
      Object.keys(snapshots).forEach(date => {
        safe[date] = sanitizeSnapshot(date, snapshots[date]);
      });
    }
    writeObject(DAY_SNAPSHOTS_KEY, safe);
  };

  const getOrCreateDaySnapshot = (date) => {
    if (!date || typeof date !== 'string') {
      throw new Error('A date key (YYYY-MM-DD) is required');
    }
    const snapshots = getDaySnapshots();
    if (snapshots[date]) {
      return deepClone(snapshots[date]);
    }
    const fresh = createEmptySnapshot(date);
    snapshots[date] = fresh;
    saveDaySnapshots(snapshots);
    return deepClone(fresh);
  };

  const computeTrackedSpan = (sessions, dayStartAt, dayEndAt) => {
    if (dayStartAt === null || dayEndAt === null || dayEndAt <= dayStartAt) return 0;
    let totalMs = 0;
    sessions.forEach(session => {
      (session.intervals || []).forEach(interval => {
        const intervalStart = Number(interval.start);
        const intervalEnd =
          interval.end === null || interval.end === undefined
            ? intervalStart
            : Number(interval.end);
        if (!Number.isFinite(intervalStart) || !Number.isFinite(intervalEnd)) return;
        const overlapStart = Math.max(intervalStart, dayStartAt);
        const overlapEnd = Math.min(intervalEnd, dayEndAt);
        if (overlapEnd > overlapStart) {
          totalMs += overlapEnd - overlapStart;
        }
      });
    });
    return totalMs;
  };

  const computeDaySnapshot = (date) => {
    if (!date || typeof date !== 'string') {
      throw new Error('A date key (YYYY-MM-DD) is required');
    }
    const snapshots = getDaySnapshots();
    const baseSnapshot = sanitizeSnapshot(date, snapshots[date]);
    const sessions = getSessions().filter(
      session => getDateKey(session.sessionStart) === date
    );
    if (!sessions.length) {
      return deepClone(baseSnapshot);
    }
    const earliestSessionStart = Math.min(...sessions.map(s => s.sessionStart));
    const dayStartAt =
      baseSnapshot.firstTimerAt !== null && baseSnapshot.firstTimerAt !== undefined
        ? baseSnapshot.firstTimerAt
        : earliestSessionStart;
    const latestSessionEnd = Math.max(
      ...sessions.map(s => (s.sessionEnd ? s.sessionEnd : s.sessionStart))
    );
    const dayEndAt =
      baseSnapshot.dayEndAt !== null && baseSnapshot.dayEndAt !== undefined
        ? Math.max(baseSnapshot.dayEndAt, latestSessionEnd)
        : latestSessionEnd;
    const workingWindow = Math.max(0, dayEndAt - dayStartAt);
    const trackedSpan = computeTrackedSpan(sessions, dayStartAt, dayEndAt);
    const inactivityDurationMs = Math.max(0, workingWindow - trackedSpan);

    const nextSnapshot = {
      ...baseSnapshot,
      date,
      firstTimerAt: baseSnapshot.firstTimerAt !== null ? baseSnapshot.firstTimerAt : dayStartAt,
      dayEndAt,
      inactivityDurationMs
    };
    snapshots[date] = nextSnapshot;
    saveDaySnapshots(snapshots);
    return deepClone(nextSnapshot);
  };

  const getDaySnapshot = (date) => computeDaySnapshot(date);

  const recomputeDaySnapshot = (date) => computeDaySnapshot(date);

  const coerceMinutes = (value, fieldName, strict = false) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      if (strict) throw new Error(`Invalid value for ${fieldName}`);
      return null;
    }
    return num;
  };

  const sanitizeDailyTargets = (targets = {}, strict = false) => {
    const safeTargets = { ...DEFAULT_USER_CONFIG.dailyWorkTargets };
    WEEKDAYS.forEach(day => {
      const candidate = targets[day];
      const num = Number(candidate);
      if (Number.isFinite(num) && num >= 0) {
        safeTargets[day] = num;
      } else if (strict && candidate !== undefined) {
        throw new Error(`Invalid daily target for ${day}`);
      }
    });
    return safeTargets;
  };

  const validateTimeFormat = (timeStr) => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
  };

  const sanitizeTimeConfig = (config = {}, fieldName = 'time', strict = false) => {
    const safeConfig = { ...DEFAULT_USER_CONFIG[fieldName] };
    WEEKDAYS.forEach(day => {
      const candidate = config[day];
      if (candidate !== undefined) {
        if (candidate === '00:00' || validateTimeFormat(candidate)) {
          safeConfig[day] = candidate;
        } else if (strict) {
          throw new Error(`Invalid ${fieldName} format for ${day}. Use HH:MM or "00:00"`);
        }
      }
    });
    return safeConfig;
  };

  const sanitizeDurationConfig = (config = {}, fieldName = 'duration', strict = false) => {
    const safeConfig = { ...DEFAULT_USER_CONFIG[fieldName] };
    WEEKDAYS.forEach(day => {
      const candidate = config[day];
      if (candidate !== undefined) {
        const num = Number(candidate);
        if (Number.isFinite(num) && num >= 0 && num <= 180) {
          safeConfig[day] = num;
        } else if (strict) {
          throw new Error(`Invalid ${fieldName} for ${day}. Must be 0-180 minutes`);
        }
      }
    });
    return safeConfig;
  };

  const validateDayStructureConstraints = (config = {}, strict = false) => {
    WEEKDAYS.forEach(day => {
      const dayStart = config.dayStartTimes?.[day];
      const lunchStart = config.lunchBreakStartTimes?.[day];
      
      if (dayStart && lunchStart && dayStart !== '00:00' && lunchStart !== '00:00') {
        const dayStartMinutes = parseTime(dayStart);
        const lunchStartMinutes = parseTime(lunchStart);
        
        if (lunchStartMinutes < dayStartMinutes) {
          if (strict) {
            throw new Error(`Lunch break cannot start before day start for ${day}`);
          }
          // Auto-correct if not strict
          config.lunchBreakStartTimes[day] = dayStart;
        }
      }
    });
    return config;
  };

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const sanitizeUserConfig = (config = {}, options = {}) => {
    const { strict = false } = options;
    const base = { ...DEFAULT_USER_CONFIG, ...(config && typeof config === 'object' ? config : {}) };
    
    // Apply day structure validation and auto-correction
    const validatedConfig = validateDayStructureConstraints(base, strict);
    
    return {
      soundEnabled: validatedConfig.soundEnabled !== false,
      defaultSessionMaxMinutes: coerceMinutes(
        validatedConfig.defaultSessionMaxMinutes,
        'defaultSessionMaxMinutes',
        strict
      ),
      defaultDailyMaxMinutes: coerceMinutes(
        validatedConfig.defaultDailyMaxMinutes,
        'defaultDailyMaxMinutes',
        strict
      ),
      dailyWorkTargets: sanitizeDailyTargets(validatedConfig.dailyWorkTargets, strict),
      weekStart: validatedConfig.weekStart === 'sunday' ? 'sunday' : 'monday',
      // NEW: Day structure configuration fields
      dayStartTimes: sanitizeTimeConfig(validatedConfig.dayStartTimes, 'dayStartTimes', strict),
      lunchBreakStartTimes: sanitizeTimeConfig(validatedConfig.lunchBreakStartTimes, 'lunchBreakStartTimes', strict),
      lunchBreakDurations: sanitizeDurationConfig(validatedConfig.lunchBreakDurations, 'lunchBreakDurations', strict)
    };
  };

  const getUserConfig = () => sanitizeUserConfig(readObject(USER_CONFIG_KEY));
  const saveUserConfig = (config) =>
    writeObject(USER_CONFIG_KEY, sanitizeUserConfig(config, { strict: true }));

  const exportAll = () => {
    const sessions = getSessions();
    return {
      activities: getActivities(),
      logs: sessions,
      sessions,
      userConfig: getUserConfig()
    };
  };

  const migrateUserConfig = (oldConfig = {}) => {
    /**
     * Migrate existing user configuration to include new day structure fields
     * @param {Object} oldConfig - Existing user configuration
     * @returns {Object} Migrated configuration with new fields
     */
    const migratedConfig = { ...oldConfig };
    
    // Add day structure fields if missing
    if (!migratedConfig.dayStartTimes) {
      migratedConfig.dayStartTimes = DEFAULT_USER_CONFIG.dayStartTimes;
    }
    
    if (!migratedConfig.lunchBreakStartTimes) {
      migratedConfig.lunchBreakStartTimes = DEFAULT_USER_CONFIG.lunchBreakStartTimes;
    }
    
    if (!migratedConfig.lunchBreakDurations) {
      migratedConfig.lunchBreakDurations = DEFAULT_USER_CONFIG.lunchBreakDurations;
    }
    
    // Validate and sanitize the migrated configuration
    return sanitizeUserConfig(migratedConfig, { strict: true });
  };

  const migrateExistingData = () => {
    /**
     * Automatically migrate existing user data to new format
     * @returns {boolean} True if migration was performed
     */
    try {
      const rawConfig = localStorage.getItem(USER_CONFIG_KEY);
      if (rawConfig) {
        const parsedConfig = JSON.parse(rawConfig);
        
        // Check if migration is needed
        if (!parsedConfig.dayStartTimes || !parsedConfig.lunchBreakStartTimes || !parsedConfig.lunchBreakDurations) {
          const migratedConfig = migrateUserConfig(parsedConfig);
          saveUserConfig(migratedConfig);
          console.log('✅ User configuration migrated to include day structure fields');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  };

  const importAll = (payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid import payload');
    }
    const activities = payload.activities || [];
    const sessions = payload.logs || payload.sessions || [];
    if (!Array.isArray(activities) || !Array.isArray(sessions)) {
      throw new Error('Activities and sessions must be arrays');
    }
    const activityIds = new Set();
    const activityLabels = new Set();
    activities.forEach(act => {
      if (
        !act ||
        typeof act.id !== 'string' ||
        !act.label ||
        typeof act.label !== 'string' ||
        act.label.length > 120 ||
        !isValidCategory(act.category) ||
        !isValidPriority(act.priority) ||
        !isValidCognitiveLoad(act.cognitiveLoad)
      ) {
        throw new Error('Invalid activity schema');
      }
      if (
        act.description !== undefined &&
        act.description !== null &&
        (typeof act.description !== 'string' || act.description.length > 300)
      ) {
        throw new Error('Invalid activity description');
      }
      if (
        act.estimatedDuration !== undefined &&
        act.estimatedDuration !== null &&
        (!Number.isInteger(act.estimatedDuration) || act.estimatedDuration <= 0)
      ) {
        throw new Error('Invalid activity estimatedDuration');
      }
      if (
        act.deadline !== undefined &&
        act.deadline !== null &&
        (typeof act.deadline !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(act.deadline.trim()) ||
          Number.isNaN(new Date(act.deadline.trim()).getTime()))
      ) {
        throw new Error('Invalid activity deadline');
      }
      if (act.scheduledDays !== undefined && act.scheduledDays !== null) {
        if (!Array.isArray(act.scheduledDays)) {
          throw new Error('Invalid activity scheduledDays');
        }
        act.scheduledDays.forEach(day => {
          if (!WEEKDAYS.includes(String(day).toLowerCase())) {
            throw new Error('Invalid activity scheduledDays');
          }
        });
      }
      const normalizedLabel = act.label.trim().toLowerCase();
      if (activityLabels.has(normalizedLabel)) {
        throw new Error('Duplicate activity labels detected');
      }
      if (activityIds.has(act.id)) {
        throw new Error('Duplicate activity ids detected');
      }
      if (
        act.dailyMax !== null &&
        act.dailyMax !== undefined &&
        typeof act.dailyMax !== 'number'
      ) {
        throw new Error('Invalid activity dailyMax');
      }
      if (
        act.sessionMax !== null &&
        act.sessionMax !== undefined &&
        typeof act.sessionMax !== 'number'
      ) {
        throw new Error('Invalid activity sessionMax');
      }
      activityIds.add(act.id);
      activityLabels.add(normalizedLabel);
    });
    sessions.forEach(session => {
      if (
        !session ||
        typeof session.id !== 'string' ||
        typeof session.activityId !== 'string' ||
        typeof session.sessionStart !== 'number' ||
        typeof session.sessionEnd !== 'number'
      ) {
        throw new Error('Invalid session schema');
      }
      if (!activityIds.has(session.activityId)) {
        throw new Error('Session references unknown activity');
      }
      if (!Array.isArray(session.intervals)) {
        throw new Error('Session intervals must be an array');
      }
      let totalIntervals = 0;
      let lastEnd = null;
      session.intervals.forEach(interval => {
        if (
          typeof interval.start !== 'number' ||
          (interval.end !== null && typeof interval.end !== 'number') ||
          typeof interval.duration !== 'number'
        ) {
          throw new Error('Invalid interval schema');
        }
        if (interval.end !== null && interval.end < interval.start) {
          throw new Error('Interval end before start');
        }
        if (interval.end !== null) {
          const expected = Math.round((interval.end - interval.start) / 1000);
          if (Math.abs(expected - interval.duration) > 1) {
            throw new Error('Interval duration mismatch');
          }
        }
        if (lastEnd !== null && interval.start < lastEnd) {
          throw new Error('Intervals must be chronological and non-overlapping');
        }
        lastEnd = interval.end ?? interval.start;
        totalIntervals += interval.duration || 0;
      });
      if (Math.abs(totalIntervals - (session.totalDuration || 0)) > 1) {
        throw new Error('Session totalDuration mismatch');
      }
    });
    const userConfig = sanitizeUserConfig(payload.userConfig || {}, { strict: true });
    saveActivities(activities);
    saveSessions(sessions);
    saveUserConfig(userConfig);
  };

  window.TimeWiseStorage = {
    getActivities,
    saveActivities,
    getSessions,
    saveSessions,
    getUserConfig,
    saveUserConfig,
    getDaySnapshots,
    saveDaySnapshots,
    getOrCreateDaySnapshot,
    computeDaySnapshot,
    getDaySnapshot,
    recomputeDaySnapshot,
    exportAll,
    importAll,
    migrateUserConfig,
    migrateExistingData,
    keys: { ACTIVITIES_KEY, LOGS_KEY, USER_CONFIG_KEY, DAY_SNAPSHOTS_KEY }
  };

  // Auto-migrate existing data on initialization
  migrateExistingData();
})();
