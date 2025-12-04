// History utilities for listing sessions with activity metadata
(() => {
  const { getSessions, getActivities } = window.TimeWiseStorage;
  const { formatDuration } = window.TimeWiseUtils;

  const getHistory = () => {
    const activities = getActivities();
    const activityMap = new Map(activities.map(a => [a.id, a]));
    return getSessions()
      .slice()
      .sort((a, b) => b.sessionStart - a.sessionStart)
      .map(session => {
        const activity = activityMap.get(session.activityId);
        return {
          ...session,
          activityLabel: activity ? activity.label : 'Unknown',
          activityCategory: activity ? activity.category : 'personal',
          activityPriority: activity ? activity.priority : 'medium',
          activityCognitiveLoad: activity ? activity.cognitiveLoad : 'moderate',
          durationText: formatDuration(session.totalDuration || 0)
        };
      });
  };

  window.TimeWiseHistory = { getHistory };
})();
