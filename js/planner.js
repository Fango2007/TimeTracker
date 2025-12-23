/**
 * TimeWise Planner Module
 * Planning & Scheduling Features Implementation
 * 
 * @module planner
 * @description Provides agenda generation, feasibility calculation, and day structure configuration
 * @version 1.0.0
 * @license MIT
 */

/**
 * Planner Module - Main Implementation
 * 
 * This module implements the planning and scheduling features for TimeWise,
 * including daily feasibility calculation, global work distribution,
 * weekly agenda generation, and day structure configuration.
 */

const TimeWise = TimeWise || {};

TimeWise.Planner = (function() {
  'use strict';

  // Private constants
  const DEFAULT_DAY_START = '09:00';
  const DEFAULT_LUNCH_START = '12:00';
  const DEFAULT_LUNCH_DURATION = 30; // minutes
  const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  // Private variables
  let config = null;
  let currentAgenda = null;
  let feasibilityCache = {};

  /**
   * Time utility functions
   */
  function parseTime(timeStr) {
    /**
     * Parse time string in HH:MM format to minutes since midnight
     * @param {string} timeStr - Time string in HH:MM format
     * @returns {number} Minutes since midnight
     * @throws {Error} If time format is invalid
     */
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(timeStr)) {
      throw new Error(`Invalid time format. Use HH:MM. Received: ${timeStr}`);
    }
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function formatTime(minutes) {
    /**
     * Format minutes since midnight to HH:MM string
     * @param {number} minutes - Minutes since midnight
     * @returns {string} Time string in HH:MM format
     */
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  function addMinutes(timeStr, minutesToAdd) {
    /**
     * Add minutes to a time string
     * @param {string} timeStr - Time string in HH:MM format
     * @param {number} minutesToAdd - Minutes to add
     * @returns {string} New time string in HH:MM format
     */
    const totalMinutes = parseTime(timeStr) + minutesToAdd;
    return formatTime(totalMinutes);
  }

  /**
   * Configuration management
   */
  function loadConfig() {
    /**
     * Load configuration from localStorage
     * @returns {Object} Configuration object
     */
    try {
      const storedConfig = localStorage.getItem('userConfig');
      if (storedConfig) {
        return JSON.parse(storedConfig);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
    
    // Return default configuration
    return getDefaultConfig();
  }

  function getDefaultConfig() {
    /**
     * Get default configuration
     * @returns {Object} Default configuration
     */
    const defaultConfig = {
      soundEnabled: true,
      defaultSessionMaxMinutes: 50,
      defaultDailyMaxMinutes: 120,
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
      dayStartTimes: {
        monday: DEFAULT_DAY_START,
        tuesday: DEFAULT_DAY_START,
        wednesday: DEFAULT_DAY_START,
        thursday: DEFAULT_DAY_START,
        friday: DEFAULT_DAY_START,
        saturday: '10:00',
        sunday: '00:00'
      },
      lunchBreakStartTimes: {
        monday: DEFAULT_LUNCH_START,
        tuesday: DEFAULT_LUNCH_START,
        wednesday: DEFAULT_LUNCH_START,
        thursday: DEFAULT_LUNCH_START,
        friday: DEFAULT_LUNCH_START,
        saturday: '12:30',
        sunday: '00:00'
      },
      lunchBreakDurations: {
        monday: DEFAULT_LUNCH_DURATION,
        tuesday: DEFAULT_LUNCH_DURATION,
        wednesday: DEFAULT_LUNCH_DURATION,
        thursday: DEFAULT_LUNCH_DURATION,
        friday: DEFAULT_LUNCH_DURATION,
        saturday: DEFAULT_LUNCH_DURATION,
        sunday: 0
      }
    };
    
    return defaultConfig;
  }

  function saveConfig(newConfig) {
    /**
     * Save configuration to localStorage
     * @param {Object} newConfig - Configuration to save
     * @throws {Error} If configuration is invalid
     */
    validateDayStructure(newConfig);
    localStorage.setItem('userConfig', JSON.stringify(newConfig));
    config = newConfig;
  }

  function validateDayStructure(configToValidate) {
    /**
     * Validate day structure configuration
     * @param {Object} configToValidate - Configuration to validate
     * @throws {Error} If validation fails
     */
    const configCopy = configToValidate || config;
    
    // Validate time formats
    WEEKDAYS.forEach(day => {
      const dayStart = configCopy.dayStartTimes[day];
      const lunchStart = configCopy.lunchBreakStartTimes[day];
      
      if (dayStart !== '00:00' && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(dayStart)) {
        throw new Error(`Invalid dayStartTime format for ${day}. Use HH:MM or "00:00"`);
      }
      
      if (lunchStart !== '00:00' && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(lunchStart)) {
        throw new Error(`Invalid lunchBreakStartTime format for ${day}. Use HH:MM or "00:00"`);
      }
      
      // Validate logical constraints
      if (dayStart !== '00:00' && lunchStart !== '00:00') {
        const dayStartMinutes = parseTime(dayStart);
        const lunchStartMinutes = parseTime(lunchStart);
        
        if (lunchStartMinutes < dayStartMinutes) {
          throw new Error(`Lunch break cannot start before day start for ${day}`);
        }
      }
      
      // Validate lunch break duration
      const duration = configCopy.lunchBreakDurations[day];
      if (duration < 0 || duration > 180) {
        throw new Error(`Lunch break duration for ${day} must be between 0 and 180 minutes`);
      }
    });
  }

  /**
   * Day structure utilities
   */
  function getDayStructure(dateStr) {
    /**
     * Get day structure for a specific date
     * @param {string} dateStr - Date string in YYYY-MM-DD format
     * @returns {Object} Day structure object
     */
    if (!config) {
      config = loadConfig();
    }
    
    const date = new Date(dateStr);
    const dayOfWeek = WEEKDAYS[date.getDay()];
    
    const dayStart = config.dayStartTimes[dayOfWeek];
    const lunchStart = config.lunchBreakStartTimes[dayOfWeek];
    const lunchDuration = config.lunchBreakDurations[dayOfWeek];
    
    if (dayStart === '00:00') {
      return {
        date: dateStr,
        dayStartTime: dayStart,
        lunchBreakStart: lunchStart,
        lunchBreakEnd: addMinutes(lunchStart, lunchDuration),
        workWindowEnd: '00:00',
        totalAvailableMinutes: 0,
        isWorkingDay: false
      };
    }
    
    const dayStartMinutes = parseTime(dayStart);
    const workTargetMinutes = config.dailyWorkTargets[dayOfWeek] * 60;
    const workWindowEndMinutes = dayStartMinutes + workTargetMinutes + lunchDuration;
    
    return {
      date: dateStr,
      dayStartTime: dayStart,
      lunchBreakStart: lunchStart,
      lunchBreakEnd: addMinutes(lunchStart, lunchDuration),
      workWindowEnd: formatTime(workWindowEndMinutes),
      totalAvailableMinutes: workTargetMinutes,
      isWorkingDay: true
    };
  }

  /**
   * Public API
   */
  return {
    // Configuration management
    setDayStructure: function(dayStructureConfig) {
      /**
       * Set day structure configuration
       * @param {Object} dayStructureConfig - Day structure configuration
       * @throws {Error} If configuration is invalid
       */
      const currentConfig = loadConfig();
      const updatedConfig = {
        ...currentConfig,
        ...dayStructureConfig
      };
      saveConfig(updatedConfig);
    },
    
    getDayStructure: function(dateStr) {
      /**
       * Get day structure for a specific date
       * @param {string} dateStr - Date string in YYYY-MM-DD format
       * @returns {Object} Day structure object
       */
      return getDayStructure(dateStr || getTodayDate());
    },
    
    validateDayStructure: function(configToValidate) {
      /**
       * Validate day structure configuration
       * @param {Object} configToValidate - Configuration to validate
       * @returns {boolean} True if valid
       * @throws {Error} If validation fails
       */
      try {
        validateDayStructure(configToValidate);
        return true;
      } catch (error) {
        console.error('Validation error:', error.message);
        return false;
      }
    },
    
    // Feasibility calculation (to be implemented in Phase 3)
    checkDailyFeasibility: function(dateStr) {
      console.warn('checkDailyFeasibility: Not yet implemented (Phase 3)');
      return null;
    },
    
    // Agenda generation (to be implemented in Phase 5)
    generateWeeklyAgenda: function() {
      console.warn('generateWeeklyAgenda: Not yet implemented (Phase 5)');
      return null;
    },
    
    // Utility functions
    validateTimeFormat: function(timeStr) {
      /**
       * Validate time format
       * @param {string} timeStr - Time string to validate
       * @returns {boolean} True if valid
       */
      return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
    }
  };

  // Initialize configuration
  function init() {
    config = loadConfig();
    console.log('TimeWise Planner module initialized');
  }

  // Auto-initialize
  init();

})();

// Export for Node.js/CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeWise.Planner;
}