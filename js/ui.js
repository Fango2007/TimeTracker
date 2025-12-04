// UI wiring for TimeWise SPA
(() => {
  const {
    formatDuration,
    formatMinutesLabel,
    PRIORITIES,
    COGNITIVE_LOADS,
    CATEGORIES
  } = window.TimeWiseUtils;
  const { getActivities, saveActivities, exportAll, importAll, getSessions } =
    window.TimeWiseStorage;
  const Activities = window.TimeWiseActivities;
  const Timer = window.TimeWiseTimer;
  const Stats = window.TimeWiseStats;
  const History = window.TimeWiseHistory;

  let selectedActivityId = null;
  let editingActivityId = null;
  let statsChart = null;
  let statsPeriod = 'daily';

  const elements = {
    navLinks: $('[data-view-target]'),
    views: $('.view-section'),
    activityList: $('#activity-list'),
    activityFilters: {
      category: $('#filter-category'),
      priority: $('#filter-priority'),
      cognitive: $('#filter-cognitive')
    },
    startBtn: $('#btn-start'),
    pauseBtn: $('#btn-pause'),
    resumeBtn: $('#btn-resume'),
    stopBtn: $('#btn-stop'),
    resetBtn: $('#btn-reset'),
    timerDisplay: $('#timer-display'),
    currentActivityLabel: $('#current-activity-label'),
    sessionMaxBar: $('#session-max-bar'),
    sessionMaxText: $('#session-max-text'),
    dailyMaxBar: $('#daily-max-bar'),
    dailyMaxText: $('#daily-max-text'),
    todayTotalText: $('#today-total-text'),
    activityForm: $('#activity-form'),
    activityFormError: $('#activity-form-error'),
    activitiesTableBody: $('#activities-table-body'),
    importInput: $('#import-json-input'),
    importBtn: $('#import-btn'),
    exportBtn: $('#export-btn'),
    exportCsvBtn: $('#export-csv-btn'),
    historyList: $('#history-list'),
    statsTabs: $('[data-stats-period]'),
    statsTableBody: $('#stats-table-body')
  };

  const switchView = target => {
    elements.views.removeClass('active');
    $(`#${target}`).addClass('active');
    elements.navLinks.removeClass('active');
    elements.navLinks
      .filter(`[data-view-target="${target}"]`)
      .addClass('active');
  };

  const renderActivityOptions = () => {
    const activities = getActivities();
    const filterCategory = elements.activityFilters.category.val();
    const filterPriority = elements.activityFilters.priority.val();
    const filterCognitive = elements.activityFilters.cognitive.val();
    const filtered = activities.filter(act => {
      if (act.archived) return false;
      if (filterCategory && filterCategory !== 'all' && act.category !== filterCategory)
        return false;
      if (filterPriority && filterPriority !== 'all' && act.priority !== filterPriority)
        return false;
      if (filterCognitive && filterCognitive !== 'all' && act.cognitiveLoad !== filterCognitive)
        return false;
      return true;
    });

    if (!selectedActivityId && filtered.length) {
      selectedActivityId = filtered[0].id;
    }

    elements.activityList.empty();
    filtered.forEach(act => {
      const item = $(`
        <li class="list-group-item d-flex align-items-center justify-content-between activity-item" data-id="${act.id}">
          <div class="d-flex align-items-center flex-wrap">
            <span class="drag-handle mr-2"><i class="fas fa-grip-lines"></i></span>
            <div>
              <div class="font-weight-bold">${act.label}</div>
              <div class="activity-badges">
                <span class="badge badge-info text-uppercase">${act.category}</span>
                <span class="badge badge-${priorityColor(act.priority)} text-uppercase">${act.priority}</span>
                <span class="badge badge-light text-uppercase">${act.cognitiveLoad}</span>
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-primary start-from-list">Start</button>
        </li>
      `);
      if (selectedActivityId === act.id) {
        item.addClass('active');
      }
      item.on('click', e => {
        if ($(e.target).hasClass('start-from-list') || $(e.target).closest('.start-from-list').length) {
          handleStartFromList(act.id);
          return;
        }
        selectedActivityId = act.id;
        highlightSelected();
      });
      item.find('.start-from-list').on('click', e => {
        e.stopPropagation();
      });
      elements.activityList.append(item);
    });

    if (elements.activityList.data('ui-sortable')) {
      elements.activityList.sortable('destroy');
    }

    $('#activity-list').sortable({
      handle: '.drag-handle',
      update: () => {
        const orderedIds = $('#activity-list')
          .children()
          .map((_, el) => $(el).data('id'))
          .get();
        Activities.reorderActivities(orderedIds);
      }
    });

    highlightSelected();
  };

  const highlightSelected = () => {
    elements.activityList
      .children()
      .removeClass('active');
    elements.activityList
      .children(`[data-id="${selectedActivityId}"]`)
      .addClass('active');
  };

  const priorityColor = priority => {
    if (priority === 'high') return 'danger';
    if (priority === 'medium') return 'warning';
    return 'success';
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
    updateTimerPanel();
  };

  const refreshAll = () => {
    renderActivityOptions();
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
    });
  };

  const bindFilters = () => {
    Object.values(elements.activityFilters).forEach($el => {
      $el.on('change', renderActivityOptions);
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
    elements.exportBtn.on('click', () => {
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

    elements.exportCsvBtn.on('click', () => {
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

    elements.importBtn.on('click', () => {
      const raw = elements.importInput.val();
      try {
        const parsed = JSON.parse(raw);
        importAll(parsed);
        alert('Data imported successfully.');
        refreshAll();
      } catch (err) {
        alert('Invalid JSON. Existing data untouched.');
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

  const renderStats = period => {
    statsPeriod = period;
    elements.statsTabs.removeClass('active');
    elements.statsTabs.filter(`[data-stats-period="${period}"]`).addClass('active');

    const stats = Stats.getStats(period);
    const ctx = document.getElementById('statsChart').getContext('2d');
    if (statsChart) statsChart.destroy();
    statsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: stats.labels,
        datasets: [
          {
            label: 'Minutes',
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            data: stats.data
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true
              }
            }
          ]
        }
      }
    });

    elements.statsTableBody.empty();
    stats.table.forEach(row => {
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

  const bindStatsTabs = () => {
    elements.statsTabs.on('click', function (e) {
      e.preventDefault();
      const period = $(this).data('stats-period');
      renderStats(period);
    });
  };

  const initFiltersOptions = () => {
    const buildOptions = (values, $select, label) => {
      $select.empty();
      $select.append(`<option value="all">All ${label}</option>`);
      values.forEach(val => {
        $select.append(`<option value="${val}">${val}</option>`);
      });
    };
    buildOptions(CATEGORIES, elements.activityFilters.category, 'Categories');
    buildOptions(PRIORITIES, elements.activityFilters.priority, 'Priorities');
    buildOptions(COGNITIVE_LOADS, elements.activityFilters.cognitive, 'Loads');
  };

  const init = () => {
    initFiltersOptions();
    bindNav();
    bindFilters();
    bindTimerButtons();
    bindActivityForm();
    bindImportExport();
    bindStatsTabs();
    Timer.subscribe(handleTimerEvents);
    renderActivityOptions();
    renderActivitiesTable();
    renderHistory();
    renderStats(statsPeriod);
    updateTimerPanel();
  };

  $(document).ready(init);
})();
