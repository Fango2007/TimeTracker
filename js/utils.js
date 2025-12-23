// Utility helpers shared across TimeWise modules
const PRIORITIES = ['low', 'medium', 'high'];
const COGNITIVE_LOADS = ['light', 'moderate', 'intense'];
const CATEGORIES = ['professional', 'personal'];
const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const generateId = () => {
  if (window.crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122-ish UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const pad = num => num.toString().padStart(2, '0');

const formatDuration = totalSeconds => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const formatMinutesLabel = minutes => {
  if (minutes === null || minutes === undefined) return '—';
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
};

const minutesToSeconds = minutes =>
  minutes === null || minutes === undefined ? null : minutes * 60;

const safeParseJSON = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (err) {
    console.error('Failed to parse JSON', err);
    return fallback;
  }
};

const deepClone = obj => JSON.parse(JSON.stringify(obj));

const getDateKey = ts => {
  const d = new Date(ts);
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${d.getFullYear()}-${month}-${day}`;
};

const startOfWeek = (date, weekStart = 'monday') => {
  const d = new Date(date);
  const startsOnSunday = weekStart === 'sunday';
  const day = d.getDay(); // 0 = Sunday
  const normalizedDay = startsOnSunday ? day : day === 0 ? 6 : day - 1; // 0-indexed based on start
  const diff = -normalizedDay;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = date => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getWeekdayKey = date => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  // Align to WEEKDAYS ordering (Monday first)
  const idx = day === 0 ? 6 : day - 1;
  return WEEKDAYS[idx];
};

const isValidPriority = value => PRIORITIES.includes(value);
const isValidCognitiveLoad = value => COGNITIVE_LOADS.includes(value);
const isValidCategory = value => CATEGORIES.includes(value);

const sortByLabel = list =>
  [...list].sort((a, b) => a.label.localeCompare(b.label));

const sumSeconds = intervals =>
  intervals.reduce((acc, interval) => acc + (interval.duration || 0), 0);

// Time utility functions for planning features
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const parseTime = (timeStr) => {
  if (!TIME_REGEX.test(timeStr)) {
    throw new Error(`Invalid time format. Use HH:MM. Received: ${timeStr}`);
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const addMinutes = (timeStr, minutesToAdd) => {
  const totalMinutes = parseTime(timeStr) + minutesToAdd;
  return formatTime(totalMinutes);
};

const validateTimeFormat = (timeStr) => TIME_REGEX.test(timeStr);

// Day structure validation
const validateDayStructure = (config) => {
  WEEKDAYS.forEach(day => {
    const dayStart = config.dayStartTimes?.[day];
    const lunchStart = config.lunchBreakStartTimes?.[day];
    
    if (dayStart && !validateTimeFormat(dayStart) && dayStart !== '00:00') {
      throw new Error(`Invalid dayStartTime format for ${day}. Use HH:MM or "00:00"`);
    }
    
    if (lunchStart && !validateTimeFormat(lunchStart) && lunchStart !== '00:00') {
      throw new Error(`Invalid lunchBreakStartTime format for ${day}. Use HH:MM or "00:00"`);
    }
    
    if (dayStart && lunchStart && dayStart !== '00:00' && lunchStart !== '00:00') {
      const dayStartMinutes = parseTime(dayStart);
      const lunchStartMinutes = parseTime(lunchStart);
      
      if (lunchStartMinutes < dayStartMinutes) {
        throw new Error(`Lunch break cannot start before day start for ${day}`);
      }
    }
    
    const duration = config.lunchBreakDurations?.[day];
    if (duration !== undefined && (duration < 0 || duration > 180)) {
      throw new Error(`Lunch break duration for ${day} must be between 0 and 180 minutes`);
    }
  });
  return true;
};

// Error handling utilities
const createErrorHandler = (context = 'Unknown') => {
  return (error, message = 'Operation failed') => {
    console.error(`[${context}] ${message}:`, error);
    return null;
  };
};

const handleAsyncError = (promise, context = 'AsyncOperation') => {
  return promise.catch(error => {
    console.error(`[${context}] Async error:`, error);
    throw error;
  });
};

// Date utilities (already exist, but adding for completeness)
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

window.TimeWiseUtils = {
  generateId,
  pad,
  formatDuration,
  formatMinutesLabel,
  minutesToSeconds,
  safeParseJSON,
  deepClone,
  getDateKey,
  startOfWeek,
  startOfMonth,
  getWeekdayKey,
  isValidPriority,
  isValidCognitiveLoad,
  isValidCategory,
  sortByLabel,
  sumSeconds,
  // NEW: Planning feature utilities
  parseTime,
  formatTime,
  addMinutes,
  validateTimeFormat,
  validateDayStructure,
  createErrorHandler,
  handleAsyncError,
  getTodayDate,
  TIME_REGEX,
  PRIORITIES,
  COGNITIVE_LOADS,
  CATEGORIES,
  WEEKDAYS
};
