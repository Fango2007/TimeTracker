// UI wiring for TimeWise SPA
(() => {
  const {
    formatDuration,
    formatMinutesLabel,
    PRIORITIES,
    COGNITIVE_LOADS,
    CATEGORIES,
    WEEKDAYS,
    getDateKey,
    getWeekdayKey
  } = window.TimeWiseUtils;
  const {
    getActivities,
    exportAll,
    importAll,
    getSessions,
    getUserConfig,
    saveUserConfig
  } = window.TimeWiseStorage;
  const Activities = window.TimeWiseActivities;
  const Timer = window.TimeWiseTimer;
  const Stats = window.TimeWiseStats;
  const History = window.TimeWiseHistory;

  let selectedActivityId = null;
  let editingActivityId = null;
  let statsChart = null;
  let statsPeriod = 'daily';
  let userConfig = getUserConfig();
  let statsData = null;
  let statsSelectedIndex = 0;
  let statsOffset = 0;

  const elements = {
    navLinks: $('[data-view-target]'),
    views: $('.view-section'),
    dashboardHighList: $('#dashboard-high-list'),
    dashboardTarget: $('#dashboard-target'),
    priorityLists: {
      high: $('#list-high'),
      medium: $('#list-medium'),
      low: $('#list-low')
    },
    startBtn: $('#btn-start'),
    pauseBtn: $('#btn-pause'),
    resumeBtn: $('#btn-resume'),
    stopBtn: $('#btn-stop'),
    resetBtn: $('#btn-reset'),
    timerDisplay: $('#timer-display'),
    currentActivityLabel: $('#current-activity-label'),
    currentActivityBadges: $('#current-activity-badges'),
    sessionMaxBar: $('#session-max-bar'),
    sessionMaxText: $('#session-max-text'),
    dailyMaxBar: $('#daily-max-bar'),
    dailyMaxText: $('#daily-max-text'),
    todayTotalText: $('#today-total-text'),
    activityForm: $('#activity-form'),
    activityFormError: $('#activity-form-error'),
    activitiesTableBody: $('#activities-table-body'),
    historyList: $('#history-list'),
    statsTabs: $('[data-stats-period]'),
    statsTableBody: $('#stats-table-body'),
    statsPrev: $('#stats-prev'),
    statsNext: $('#stats-next'),
    // Settings
    settingsForm: $('#settings-form'),
    settingsError: $('#settings-error'),
    settingsSuccess: $('#settings-success'),
    defaultSessionMax: $('#default-session-max'),
    defaultDailyMax: $('#default-daily-max'),
    weekStartInputs: $('input[name="week-start"]'),
    settingsImportArea: $('#settings-import-json'),
    settingsImportBtn: $('#settings-import-btn'),
    settingsExportJsonBtn: $('#settings-export-json'),
    settingsExportCsvBtn: $('#settings-export-csv'),
    importError: $('#import-error')
  };
  elements.dailyTargetInputs = WEEKDAYS.reduce((acc, day) => {
    acc[day] = $(`#target-${day}`);
    return acc;
  }, {});

  const refreshUserConfig = () => {
    userConfig = getUserConfig();
  };

  const switchView = target => {
    elements.views.removeClass('active');
    $(`#${target}`).addClass('active');
    elements.navLinks.removeClass('active');
    elements.navLinks
      .filter(`[data-view-target="${target}"]`)
      .addClass('active');
  };

  const renderPriorityLists = () => {
    const activities = getActivities().filter(a => !a.archived);
    if (!selectedActivityId && activities.length) {
      selectedActivityId = activities[0].id;
    }
    const buckets = {
      high: activities.filter(a => a.priority === 'high'),
      medium: activities.filter(a => a.priority === 'medium'),
      low: activities.filter(a => a.priority === 'low')
    };

    const buildItem = act => {
      const daily = formatMinutesLabel(act.dailyMax);
      const session = formatMinutesLabel(act.sessionMax);
      const item = $(`
        <li class="list-group-item activity-item" data-id="${act.id}">
          <div class="d-flex align-items-center">
            <span class="drag-handle mr-2"><i class="fas fa-grip-lines"></i></span>
            <div>
              <div class="font-weight-bold">${act.label}</div>
              <div class="activity-badges">
                <span class="badge badge-info text-uppercase">${act.category}</span>
                <span class="badge badge-${priorityColor(act.priority)} text-uppercase">${act.priority}</span>
                <span class="badge badge-light text-uppercase">${act.cognitiveLoad}</span>
              </div>
              <div class="activity-meta">Daily ${daily} • Session ${session}</div>
            </div>
          </div>
          <button class="btn btn-sm btn-primary start-from-list">Start</button>
        </li>
      `);
      if (selectedActivityId === act.id) item.addClass('active');
      item.on('click', e => {
        if ($(e.target).hasClass('start-from-list') || $(e.target).closest('.start-from-list').length) {
          handleStartFromList(act.id);
          return;
        }
        selectedActivityId = act.id;
        highlightSelected();
        updateTimerPanel();
      });
      item.find('.start-from-list').on('click', e => e.stopPropagation());
      return item;
    };

    Object.entries(elements.priorityLists).forEach(([priority, $list]) => {
      $list.empty();
      buckets[priority].forEach(act => {
        $list.append(buildItem(act));
      });
    });

    // sortable across lists
    $('.priority-list').each(function () {
      if ($(this).data('ui-sortable')) {
        $(this).sortable('destroy');
      }
    });
    $('.priority-list').sortable({
      connectWith: '.priority-list',
      handle: '.drag-handle',
      update: () => {
        const priorityBuckets = {
          high: elements.priorityLists.high
            .children()
            .map((_, el) => $(el).data('id'))
            .get(),
          medium: elements.priorityLists.medium
            .children()
            .map((_, el) => $(el).data('id'))
            .get(),
          low: elements.priorityLists.low
            .children()
            .map((_, el) => $(el).data('id'))
            .get()
        };
        Activities.reorderAndReprioritize(priorityBuckets);
        renderPriorityLists();
        renderDashboard();
      }
    });

    highlightSelected();
  };

  const highlightSelected = () => {
    Object.values(elements.priorityLists).forEach($list => {
      $list.children().removeClass('active');
      $list.children(`[data-id="${selectedActivityId}"]`).addClass('active');
    });
  };

  const priorityColor = priority => {
    if (priority === 'high') return 'danger';
    if (priority === 'medium') return 'warning';
    return 'success';
  };

  const getTodayTargetSeconds = () => {
    const config = getUserConfig();
    const weekdayKey = getWeekdayKey(new Date());
    const hours = config.dailyWorkTargets?.[weekdayKey] || 0;
    return Math.max(0, hours * 3600);
  };

  const getTodayActivitySeconds = activityId => {
    const todayKey = getDateKey(Date.now());
    const sessions = getSessions().filter(
      s => getDateKey(s.sessionStart) === todayKey && (!activityId || s.activityId === activityId)
    );
    const pastSeconds = sessions.reduce(
      (acc, s) => acc + Math.max(0, s.totalDuration || 0),
      0
    );
    const state = Timer.getState();
    const current = state.currentSession;
    const currentMatches =
      current &&
      getDateKey(current.sessionStart) === todayKey &&
      (!activityId || current.activityId === activityId);
    const runningSeconds = currentMatches ? state.elapsedSeconds : 0;
    return pastSeconds + runningSeconds;
  };

  const renderDashboard = () => {
    const activities = getActivities().filter(a => !a.archived && a.priority === 'high');
    const todayTargetSeconds = getTodayTargetSeconds();
    const todayTotalSeconds = getTodayActivitySeconds(null);
    const sorted = activities
      .map(act => ({
        ...act,
        todaySeconds: getTodayActivitySeconds(act.id)
      }))
      .sort((a, b) => a.todaySeconds - b.todaySeconds);

    elements.dashboardHighList.empty();
    if (!sorted.length) {
      elements.dashboardHighList.append(
        '<li class="list-group-item text-muted small">No high-priority activities</li>'
      );
    } else {
      sorted.forEach(act => {
        elements.dashboardHighList.append(`
          <li class="list-group-item d-flex justify-content-between">
            <span>${act.label}</span>
            <span>${formatMinutesLabel(Math.round(act.todaySeconds / 60))}</span>
          </li>
        `);
      });
    }

    const trackedLabel = formatMinutesLabel(Math.round(todayTotalSeconds / 60));
    if (todayTargetSeconds > 0) {
      const targetLabel = formatMinutesLabel(Math.round(todayTargetSeconds / 60));
      const percent = Math.min(
        999,
        Math.round((todayTotalSeconds / todayTargetSeconds) * 100)
      );
      elements.dashboardTarget.text(`Today: ${trackedLabel} / Target: ${targetLabel} (${percent}%)`);
    } else {
      elements.dashboardTarget.text(`Today: ${trackedLabel}`);
    }
  };

  const renderActivitiesTable = () => {
    const activities = getActivities();
    elements.activitiesTableBody.empty();
    activities.forEach(act => {
      const row = $(`
        <tr>
          <td>${act.label}</td>
          <td class="text-capitalize">${act.category}</td>
          <td><span class="badge badge-${priorityColor(act.priority)}">${act.priority}</span></td>
          <td class="text-capitalize">${act.cognitiveLoad}</td>
          <td>${formatMinutesLabel(act.dailyMax)}</td>
          <td>${formatMinutesLabel(act.sessionMax)}</td>
          <td>${act.archived ? '<span class="badge badge-secondary">Archived</span>' : ''}</td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-outline-primary mr-1 edit-activity">Edit</button>
            <button class="btn btn-sm btn-outline-warning mr-1 archive-activity">Archive</button>
            <button class="btn btn-sm btn-outline-danger delete-activity">Delete</button>
          </td>
        </tr>
      `);
      row.find('.edit-activity').on('click', () => populateForm(act));
      row.find('.archive-activity').on('click', () => {
        Activities.archiveActivity(act.id);
        refreshAll();
      });
      row.find('.delete-activity').on('click', () => {
        const res = Activities.deleteActivity(act.id);
        if (res.error) {
          alert(res.error);
        }
        refreshAll();
      });
      elements.activitiesTableBody.append(row);
    });
  };

  const populateForm = activity => {
    editingActivityId = activity.id;
    $('#activity-label').val(activity.label);
    $('#activity-category').val(activity.category);
    $('#activity-priority').val(activity.priority);
    $('#activity-cognitive').val(activity.cognitiveLoad);
    $('#activity-daily-max').val(activity.dailyMax ?? '');
    $('#activity-session-max').val(activity.sessionMax ?? '');
    $('#activity-submit').text('Update Activity');
  };

  const resetForm = () => {
    editingActivityId = null;
    elements.activityForm[0].reset();
    $('#activity-submit').text('Create Activity');
    elements.activityFormError.text('');
    $('#activity-priority').val('medium');
    $('#activity-cognitive').val('moderate');
    $('#activity-daily-max').val(
      userConfig.defaultDailyMaxMinutes !== null ? userConfig.defaultDailyMaxMinutes : ''
    );
    $('#activity-session-max').val(
      userConfig.defaultSessionMaxMinutes !== null ? userConfig.defaultSessionMaxMinutes : ''
    );
  };

  const handleStartFromList = activityId => {
    selectedActivityId = activityId;
    highlightSelected();
    startTimer();
  };

  const startTimer = () => {
    if (!selectedActivityId) {
      alert('Please select an activity to start.');
      return;
    }
    const state = Timer.getState();
    if (state.currentSession && state.currentSession.activityId !== selectedActivityId) {
      const confirmStop = confirm(
        'A session is running. Stop it and start a new session?'
      );
      if (!confirmStop) return;
      Timer.stop();
    } else if (state.currentSession) {
      alert('A session is already running.');
      return;
    }
    Timer.startSession(selectedActivityId);
    updateTimerPanel();
  };

  const pauseTimer = () => {
    Timer.pause();
    updateTimerPanel();
  };

  const resumeTimer = () => {
    Timer.resume();
    updateTimerPanel();
  };

  const stopTimer = () => {
    Timer.stop();
    updateTimerPanel();
    refreshAll();
  };

  const resetTimer = () => {
    if (!confirm('Discard the current session? This cannot be undone.')) return;
    Timer.reset();
    updateTimerPanel();
  };

  const updateTimerPanel = () => {
    const state = Timer.getState();
    const activities = getActivities();
    const currentActivity = activities.find(
      act => act.id === state.currentSession?.activityId
    );
    const activityLabel = currentActivity?.label || 'No active session';
    elements.timerDisplay.text(formatDuration(state.elapsedSeconds));
    elements.currentActivityLabel.text(activityLabel);
    const activityId = currentActivity?.id || selectedActivityId;
    const activity = activities.find(a => a.id === activityId);
    elements.currentActivityBadges.empty();
    if (activity) {
      elements.currentActivityBadges.append(
        `<span class="badge badge-info text-uppercase mr-1">${activity.category}</span>`
      );
      elements.currentActivityBadges.append(
        `<span class="badge badge-${priorityColor(activity.priority)} text-uppercase mr-1">${activity.priority}</span>`
      );
      elements.currentActivityBadges.append(
        `<span class="badge badge-light text-uppercase">${activity.cognitiveLoad}</span>`
      );
    }
    updateProgressBars(activity, state.elapsedSeconds);

    elements.startBtn.prop('disabled', !activityId || !!state.currentSession);
    elements.pauseBtn.prop('disabled', !state.currentSession || state.isPaused);
    elements.resumeBtn.prop('disabled', !state.currentSession || !state.isPaused);
    elements.stopBtn.prop('disabled', !state.currentSession);
    elements.resetBtn.prop('disabled', !state.currentSession);
  };

  const updateProgressBars = (activity, currentElapsedSeconds) => {
    if (!activity) {
      elements.sessionMaxBar.css('width', '0%');
      elements.dailyMaxBar.css('width', '0%');
      elements.sessionMaxText.text('Session max: —');
      elements.dailyMaxText.text('Daily max: —');
      elements.todayTotalText.text('');
      return;
    }
    // Session max progress
    if (activity.sessionMax) {
      const maxSeconds = activity.sessionMax * 60;
      const percent = Math.min(100, Math.round((currentElapsedSeconds / maxSeconds) * 100));
      elements.sessionMaxBar
        .css('width', `${percent}%`)
        .toggleClass('bg-danger', percent >= 100)
        .toggleClass('bg-success', percent < 100);
      elements.sessionMaxText.text(
        `Session max: ${formatMinutesLabel(activity.sessionMax)} (${percent}%)`
      );
    } else {
      elements.sessionMaxBar.css('width', '0%').removeClass('bg-danger').addClass('bg-success');
      elements.sessionMaxText.text('Session max: —');
    }

    // Daily max warning/progress
    if (activity.dailyMax) {
      const pastSeconds = Timer.getDailyTotalSeconds(activity.id);
      const totalSeconds = pastSeconds + currentElapsedSeconds;
      const maxSeconds = activity.dailyMax * 60;
      const percent = Math.min(100, Math.round((totalSeconds / maxSeconds) * 100));
      elements.dailyMaxBar
        .css('width', `${percent}%`)
        .toggleClass('bg-warning', percent >= 100)
        .toggleClass('bg-success', percent < 100);
      elements.dailyMaxText.text(
        `Daily max: ${formatMinutesLabel(activity.dailyMax)} (${percent}%)`
      );
      if (totalSeconds >= maxSeconds) {
        elements.todayTotalText.text('Daily max exceeded (warning only)');
      } else {
        elements.todayTotalText.text(`Today: ${formatMinutesLabel(Math.round(totalSeconds / 60))}`);
      }
    } else {
      const todaysSeconds = Timer.getDailyTotalSeconds(activity.id) + currentElapsedSeconds;
      elements.dailyMaxBar.css('width', '0%').removeClass('bg-warning').addClass('bg-success');
      elements.dailyMaxText.text('Daily max: —');
      elements.todayTotalText.text(
        todaysSeconds ? `Today: ${formatMinutesLabel(Math.round(todaysSeconds / 60))}` : ''
      );
    }
  };

  const handleTimerEvents = (type, payload) => {
    if (type === 'auto-stop') {
      alert('Session reached its maximum duration and was stopped automatically.');
    }
    if (type === 'stop' || type === 'reset') {
      refreshAll();
    }
    if (type === 'tick') {
      renderDashboard();
    }
    updateTimerPanel();
  };

  const refreshAll = () => {
    refreshUserConfig();
    renderPriorityLists();
    renderDashboard();
    renderActivitiesTable();
    renderHistory();
    renderStats(statsPeriod);
    updateTimerPanel();
  };

  const bindNav = () => {
    elements.navLinks.on('click', function (e) {
      e.preventDefault();
      const target = $(this).data('view-target');
      switchView(target);
      if (target === 'statistics') {
        renderStats(statsPeriod);
      }
      if (target === 'history') {
        renderHistory();
      }
      if (target === 'settings-view') {
        renderSettingsForm();
      }
    });
  };

  const bindTimerButtons = () => {
    elements.startBtn.on('click', startTimer);
    elements.pauseBtn.on('click', pauseTimer);
    elements.resumeBtn.on('click', resumeTimer);
    elements.stopBtn.on('click', stopTimer);
    elements.resetBtn.on('click', resetTimer);
  };

  const bindActivityForm = () => {
    elements.activityForm.on('submit', e => {
      e.preventDefault();
      const payload = {
        label: $('#activity-label').val(),
        category: $('#activity-category').val(),
        priority: $('#activity-priority').val(),
        cognitiveLoad: $('#activity-cognitive').val(),
        dailyMax: $('#activity-daily-max').val(),
        sessionMax: $('#activity-session-max').val()
      };
      const result = editingActivityId
        ? Activities.updateActivity(editingActivityId, payload)
        : Activities.createActivity(payload);
      if (result.error) {
        elements.activityFormError.text(result.error);
        return;
      }
      resetForm();
      refreshAll();
    });

    $('#activity-cancel').on('click', e => {
      e.preventDefault();
      resetForm();
    });
  };

  const bindImportExport = () => {
    elements.settingsExportJsonBtn.on('click', () => {
      const dataStr = JSON.stringify(exportAll(), null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'timewise-export.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });

    elements.settingsExportCsvBtn.on('click', () => {
      const sessions = getSessions();
      const header = ['Session ID', 'Activity ID', 'Start', 'End', 'Total Seconds'];
      const rows = sessions.map(s => [
        s.id,
        s.activityId,
        new Date(s.sessionStart).toISOString(),
        new Date(s.sessionEnd).toISOString(),
        s.totalDuration || 0
      ]);
      const csv = [header, ...rows]
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'timewise-sessions.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });

    elements.settingsImportBtn.on('click', () => {
      elements.importError.text('');
      const raw = elements.settingsImportArea.val();
      try {
        const parsed = JSON.parse(raw);
        importAll(parsed);
        refreshUserConfig();
        renderSettingsForm();
        alert('Data imported successfully.');
        refreshAll();
      } catch (err) {
        elements.importError.text(err.message || 'Invalid JSON. Existing data untouched.');
      }
    });
  };

  const renderHistory = () => {
    const history = History.getHistory();
    elements.historyList.empty();
    history.forEach(session => {
      const intervals = session.intervals || [];
      const listItem = $(`
        <li class="list-group-item">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="font-weight-bold">${session.activityLabel}</div>
              <div class="text-muted small">${new Date(session.sessionStart).toLocaleString()}</div>
              <div class="activity-badges">
                <span class="badge badge-info text-uppercase">${session.activityCategory}</span>
                <span class="badge badge-${priorityColor(session.activityPriority)} text-uppercase">${session.activityPriority}</span>
                <span class="badge badge-light text-uppercase">${session.activityCognitiveLoad}</span>
              </div>
            </div>
            <div class="text-right">
              <div class="h5 mb-0">${session.durationText}</div>
            </div>
          </div>
          <details class="mt-2">
            <summary>Intervals</summary>
            <ul class="mb-0 pl-3">
              ${intervals
                .map(
                  interval =>
                    `<li>${new Date(interval.start).toLocaleTimeString()} - ${
                      interval.end ? new Date(interval.end).toLocaleTimeString() : 'Running'
                    } (${formatDuration(interval.duration || 0)})</li>`
                )
                .join('')}
            </ul>
          </details>
        </li>
      `);
      elements.historyList.append(listItem);
    });
  };

  const renderStatsTable = () => {
    elements.statsTableBody.empty();
    if (!statsData || !statsData.units || !statsData.units.length) {
      elements.statsTableBody.append(
        '<tr><td colspan="6" class="text-muted">No data available.</td></tr>'
      );
      return;
    }
    const unit =
      statsData.units[statsSelectedIndex] || statsData.units[statsData.units.length - 1];
    if (!unit || !unit.rows.length) {
      elements.statsTableBody.append(
        '<tr><td colspan="6" class="text-muted">No tracked time for selection.</td></tr>'
      );
      return;
    }
    unit.rows.forEach(row => {
      const tr = $(`
        <tr>
          <td>${row.label}</td>
          <td class="text-capitalize">${row.category}</td>
          <td><span class="badge badge-${priorityColor(row.priority)}">${row.priority}</span></td>
          <td class="text-capitalize">${row.cognitiveLoad}</td>
          <td>${row.archived ? 'Archived' : ''}</td>
          <td>${row.totalFormatted}</td>
        </tr>
      `);
      elements.statsTableBody.append(tr);
    });
  };

  const updateStatsChartSelection = () => {
    if (!statsChart || !statsData) return;
    const colors = statsData.labels.map((_, idx) =>
      idx === statsSelectedIndex ? 'rgba(54, 162, 235, 0.75)' : 'rgba(54, 162, 235, 0.3)'
    );
    statsChart.data.datasets[0].backgroundColor = colors;
    statsChart.update();
  };

  const renderStats = (period, resetOffset = false) => {
    if (resetOffset) {
      statsOffset = 0;
    }
    statsPeriod = period;
    elements.statsTabs.removeClass('active');
    elements.statsTabs.filter(`[data-stats-period="${period}"]`).addClass('active');

    statsData = Stats.getStats(period, statsOffset);
    statsSelectedIndex = Math.max(0, (statsData.labels?.length || 1) - 1);

    const ctx = document.getElementById('statsChart').getContext('2d');
    if (statsChart) statsChart.destroy();
    const minVal = statsData.data.length ? Math.min(...statsData.data) : 0;
    const maxVal = statsData.data.length ? Math.max(...statsData.data) : 0;
    const baseColors = statsData.labels.map((_, idx) =>
      idx === statsSelectedIndex ? 'rgba(54, 162, 235, 0.75)' : 'rgba(54, 162, 235, 0.3)'
    );
    statsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: statsData.labels,
        datasets: [
          {
            label: 'Minutes',
            backgroundColor: baseColors,
            borderColor: 'rgba(54, 162, 235, 1)',
            data: statsData.data
          },
          {
            label: 'Min',
            type: 'line',
            borderColor: 'rgba(75, 192, 192, 0.8)',
            borderDash: [4, 4],
            fill: false,
            pointRadius: 0,
            data: statsData.labels.map(() => minVal)
          },
          {
            label: 'Max',
            type: 'line',
            borderColor: 'rgba(255, 99, 132, 0.8)',
            borderDash: [4, 4],
            fill: false,
            pointRadius: 0,
            data: statsData.labels.map(() => maxVal)
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          yAxes: [
            {
              ticks: { beginAtZero: true }
            }
          ]
        },
        onClick: (_evt, elementsArr) => {
          if (elementsArr && elementsArr.length) {
            statsSelectedIndex = elementsArr[0]._index;
            updateStatsChartSelection();
            renderStatsTable();
          }
        }
      }
    });

    const mins = statsData.data.length ? Math.min(...statsData.data) : 0;
    const maxs = statsData.data.length ? Math.max(...statsData.data) : 0;
    elements.statsMin.text(`${mins}m`);
    elements.statsMax.text(`${maxs}m`);
    elements.statsPrev.prop('disabled', !statsData.hasPrev);
    elements.statsNext.prop('disabled', !statsData.hasNext);
    renderStatsTable();
  };

  const renderSettingsForm = () => {
    refreshUserConfig();
    elements.settingsError.text('');
    elements.settingsSuccess.text('');
    elements.importError.text('');
    elements.defaultSessionMax.val(
      userConfig.defaultSessionMaxMinutes !== null ? userConfig.defaultSessionMaxMinutes : ''
    );
    elements.defaultDailyMax.val(
      userConfig.defaultDailyMaxMinutes !== null ? userConfig.defaultDailyMaxMinutes : ''
    );
    WEEKDAYS.forEach(day => {
      const targetValue =
        userConfig.dailyWorkTargets && userConfig.dailyWorkTargets[day] !== undefined
          ? userConfig.dailyWorkTargets[day]
          : '';
      elements.dailyTargetInputs[day].val(targetValue);
    });
    elements.weekStartInputs.prop('checked', false);
    elements.weekStartInputs
      .filter(`[value="${userConfig.weekStart}"]`)
      .prop('checked', true);
  };

  const bindSettingsForm = () => {
    elements.settingsForm.on('submit', e => {
      e.preventDefault();
      elements.settingsError.text('');
      elements.settingsSuccess.text('');
      const parseMinutes = (value, label) => {
        if (value === '' || value === null) return null;
        const num = Number(value);
        if (!Number.isFinite(num) || num < 0) throw new Error(`${label} must be zero or positive`);
        return num;
      };
      const defaultSessionMax = parseMinutes(
        elements.defaultSessionMax.val(),
        'Default session max'
      );
      const defaultDailyMax = parseMinutes(elements.defaultDailyMax.val(), 'Default daily max');
      const dailyWorkTargets = {};
      WEEKDAYS.forEach(day => {
        const raw = elements.dailyTargetInputs[day].val();
        const num = raw === '' || raw === null ? 0 : Number(raw);
        if (!Number.isFinite(num) || num < 0) {
          throw new Error('Daily work targets must be zero or positive numbers');
        }
        dailyWorkTargets[day] = num;
      });
      const weekStart = elements.weekStartInputs.filter(':checked').val() || 'monday';
      try {
        saveUserConfig({
          defaultSessionMaxMinutes: defaultSessionMax,
          defaultDailyMaxMinutes: defaultDailyMax,
          dailyWorkTargets,
          weekStart
        });
        refreshUserConfig();
        elements.settingsSuccess.text('Settings saved.');
        if (!editingActivityId) {
          resetForm();
        }
        renderStats(statsPeriod);
      } catch (err) {
        elements.settingsError.text(err.message || 'Failed to save settings.');
      }
    });
  };

  const bindStatsTabs = () => {
    elements.statsTabs.on('click', function (e) {
      e.preventDefault();
      const period = $(this).data('stats-period');
      statsSelectedIndex = 0;
      statsOffset = 0;
      renderStats(period, true);
    });
    elements.statsPrev.on('click', () => {
      if (statsData && statsData.hasPrev) {
        statsOffset += 1;
        renderStats(statsPeriod);
      }
    });
    elements.statsNext.on('click', () => {
      if (statsOffset > 0) {
        statsOffset -= 1;
        renderStats(statsPeriod);
      }
    });
  };

  const init = () => {
    bindNav();
    bindTimerButtons();
    bindActivityForm();
    bindSettingsForm();
    bindImportExport();
    bindStatsTabs();
    Timer.subscribe(handleTimerEvents);
    resetForm();
    renderPriorityLists();
    renderDashboard();
    renderActivitiesTable();
    renderHistory();
    renderStats(statsPeriod);
    renderSettingsForm();
    updateTimerPanel();
  };

  $(document).ready(init);
})();
