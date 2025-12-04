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
  const day = new Date(date).getDay(); // 0 = Sunday
  return WEEKDAYS[day === 0 ? 6 : day - 1];
};

const isValidPriority = value => PRIORITIES.includes(value);
const isValidCognitiveLoad = value => COGNITIVE_LOADS.includes(value);
const isValidCategory = value => CATEGORIES.includes(value);

const sortByLabel = list =>
  [...list].sort((a, b) => a.label.localeCompare(b.label));

const sumSeconds = intervals =>
  intervals.reduce((acc, interval) => acc + (interval.duration || 0), 0);

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
  PRIORITIES,
  COGNITIVE_LOADS,
  CATEGORIES,
  WEEKDAYS
};
