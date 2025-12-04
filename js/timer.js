// Timer engine with timestamp-based elapsed tracking and auto-stop
(() => {
  const { generateId, sumSeconds } = window.TimeWiseUtils;
  const { getSessions, saveSessions } = window.TimeWiseStorage;

  const subscribers = [];
  let ticker = null;
  let state = {
    currentSession: null,
    isPaused: false,
    pauseStart: null,
    totalPausedMs: 0
  };

  const subscribe = fn => {
    subscribers.push(fn);
    return () => {
      const idx = subscribers.indexOf(fn);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  };

  const emit = (type, payload) => {
    subscribers.forEach(fn => {
      try {
        fn(type, payload);
      } catch (err) {
        console.error('Timer subscriber error', err);
      }
    });
  };

  const getElapsedSeconds = () => {
    if (!state.currentSession) return 0;
    const now = Date.now();
    const pausedOngoing = state.pauseStart ? now - state.pauseStart : 0;
    const elapsedMs =
      now - state.currentSession.sessionStart - state.totalPausedMs - pausedOngoing;
    return Math.max(0, Math.floor(elapsedMs / 1000));
  };

  const closeCurrentInterval = endTs => {
    const session = state.currentSession;
    if (!session) return;
    const current = session.intervals[session.intervals.length - 1];
    if (current && !current.end) {
      current.end = endTs;
      current.duration = Math.max(
        0,
        Math.round((current.end - current.start) / 1000)
      );
    }
  };

  const startTicker = () => {
    if (ticker) clearInterval(ticker);
    ticker = setInterval(() => {
      checkAutoStop();
      emit('tick', getState());
    }, 1000);
  };

  const stopTicker = () => {
    if (ticker) clearInterval(ticker);
    ticker = null;
  };

  const startSession = activityId => {
    if (state.currentSession) {
      return { error: 'active_session_exists' };
    }
    const activity = window.TimeWiseStorage
      .getActivities()
      .find(a => a.id === activityId && !a.archived);
    if (!activity) {
      return { error: 'invalid_activity' };
    }
    const now = Date.now();
    state = {
      currentSession: {
        id: generateId(),
        activityId,
        sessionStart: now,
        sessionEnd: null,
        intervals: [
          {
            start: now,
            end: null,
            duration: 0
          }
        ],
        totalDuration: 0
      },
      isPaused: false,
      pauseStart: null,
      totalPausedMs: 0
    };
    startTicker();
    emit('start', getState());
    return { session: state.currentSession };
  };

  const pause = () => {
    if (!state.currentSession || state.isPaused) return { error: 'not_running' };
    const now = Date.now();
    closeCurrentInterval(now);
    state.isPaused = true;
    state.pauseStart = now;
    emit('pause', getState());
    return { session: state.currentSession };
  };

  const resume = () => {
    if (!state.currentSession || !state.isPaused) {
      return { error: 'not_paused' };
    }
    const now = Date.now();
    if (state.pauseStart) {
      state.totalPausedMs += now - state.pauseStart;
    }
    state.isPaused = false;
    state.pauseStart = null;
    state.currentSession.intervals.push({
      start: now,
      end: null,
      duration: 0
    });
    emit('resume', getState());
    return { session: state.currentSession };
  };

  const persistSession = (session, autoStopped = false) => {
    const sessions = getSessions();
    const completed = {
      ...session,
      sessionEnd:
        session.sessionEnd || (session.intervals.slice(-1)[0]?.end || session.sessionStart),
      totalDuration: sumSeconds(session.intervals),
      autoStopped: !!autoStopped
    };
    sessions.push(completed);
    saveSessions(sessions);
    return completed;
  };

  const stop = (autoStopped = false) => {
    if (!state.currentSession) return { error: 'no_active_session' };

    const now = Date.now();
    if (state.isPaused && state.pauseStart) {
      state.totalPausedMs += now - state.pauseStart;
      state.isPaused = false;
      state.pauseStart = null;
    }
    closeCurrentInterval(now);
    state.currentSession.sessionEnd = now;
    const sessionToPersist = state.currentSession;
    const saved = persistSession(sessionToPersist, autoStopped);

    state = { currentSession: null, isPaused: false, pauseStart: null, totalPausedMs: 0 };
    stopTicker();
    emit('stop', { session: saved, autoStopped });
    return { session: saved };
  };

  const reset = () => {
    state = { currentSession: null, isPaused: false, pauseStart: null, totalPausedMs: 0 };
    stopTicker();
    emit('reset', getState());
    return { ok: true };
  };

  const getState = () => ({
    currentSession: state.currentSession ? JSON.parse(JSON.stringify(state.currentSession)) : null,
    isPaused: state.isPaused,
    pauseStart: state.pauseStart,
    totalPausedMs: state.totalPausedMs,
    elapsedSeconds: getElapsedSeconds()
  });

  const getDailyTotalSeconds = (activityId, targetDate = new Date()) => {
    const sessions = getSessions();
    const targetKey = window.TimeWiseUtils.getDateKey(targetDate);
    return sessions
      .filter(
        s =>
          s.activityId === activityId &&
          window.TimeWiseUtils.getDateKey(s.sessionStart) === targetKey
      )
      .reduce((acc, s) => acc + (s.totalDuration || 0), 0);
  };

  const checkAutoStop = () => {
    const session = state.currentSession;
    if (!session || state.isPaused) return;
    const activity = window.TimeWiseStorage
      .getActivities()
      .find(a => a.id === session.activityId);
    if (!activity || !activity.sessionMax) return;

    const elapsedSeconds = getElapsedSeconds();
    const sessionMaxSeconds = activity.sessionMax * 60;
    if (elapsedSeconds >= sessionMaxSeconds) {
      const result = stop(true);
      playAlert();
      emit('auto-stop', { session: result.session, activity });
    }
  };

  const playAlert = () => {
    const audio = new Audio(
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQgAAAABAQEB'
    );
    audio.play().catch(() => {});
  };

  window.TimeWiseTimer = {
    startSession,
    pause,
    resume,
    stop,
    reset,
    getState,
    subscribe,
    getDailyTotalSeconds,
    getElapsedSeconds
  };
})();
