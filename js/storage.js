// LocalStorage wrapper with validation and sensible defaults
(() => {
  const ACTIVITIES_KEY = 'activities';
  const LOGS_KEY = 'logs';
  const USER_CONFIG_KEY = 'userConfig';

  const { safeParseJSON, deepClone } = window.TimeWiseUtils;

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

  const getUserConfig = () => deepClone(readObject(USER_CONFIG_KEY));
  const saveUserConfig = (config) => writeObject(USER_CONFIG_KEY, config);

  const exportAll = () => ({
    activities: getActivities(),
    logs: getSessions(),
    userConfig: getUserConfig()
  });

  const importAll = (payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid import payload');
    }
    const activities = payload.activities || [];
    const sessions = payload.logs || payload.sessions || [];
    const userConfig = payload.userConfig || {};
    if (!Array.isArray(activities) || !Array.isArray(sessions)) {
      throw new Error('Activities and sessions must be arrays');
    }
    activities.forEach(act => {
      if (
        !act ||
        typeof act.id !== 'string' ||
        !act.label ||
        typeof act.label !== 'string' ||
        !window.TimeWiseUtils.isValidCategory(act.category) ||
        !window.TimeWiseUtils.isValidPriority(act.priority) ||
        !window.TimeWiseUtils.isValidCognitiveLoad(act.cognitiveLoad)
      ) {
        throw new Error('Invalid activity schema');
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
    });
    sessions.forEach(session => {
      if (
        !session ||
        typeof session.id !== 'string' ||
        typeof session.activityId !== 'string' ||
        typeof session.sessionStart !== 'number'
      ) {
        throw new Error('Invalid session schema');
      }
      if (!Array.isArray(session.intervals)) {
        throw new Error('Session intervals must be an array');
      }
      session.intervals.forEach(interval => {
        if (
          typeof interval.start !== 'number' ||
          typeof interval.end !== 'number' ||
          typeof interval.duration !== 'number'
        ) {
          throw new Error('Invalid interval schema');
        }
      });
    });
    saveActivities(activities);
    saveSessions(sessions);
    saveUserConfig(userConfig && typeof userConfig === 'object' ? userConfig : {});
  };

  window.TimeWiseStorage = {
    getActivities,
    saveActivities,
    getSessions,
    saveSessions,
    getUserConfig,
    saveUserConfig,
    exportAll,
    importAll,
    keys: { ACTIVITIES_KEY, LOGS_KEY, USER_CONFIG_KEY }
  };
})();
