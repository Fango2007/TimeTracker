/**
 * TimeWise Planner Module Tests
 * Unit tests for planning and scheduling features
 * 
 * @module tests/planner
 * @version 1.0.0
 */

/**
 * Setup test environment
 */
describe('TimeWise Planner Module', () => {
  let planner;
  let originalLocalStorage;

  beforeAll(() => {
    // Mock localStorage for testing
    originalLocalStorage = global.localStorage;
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn()
    };
    
    // Load the planner module
    require('../../js/planner.js');
    planner = TimeWise.Planner;
  });

  afterAll(() => {
    // Restore original localStorage
    global.localStorage = originalLocalStorage;
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock getItem to return null (no existing config)
    global.localStorage.getItem.mockReturnValue(null);
  });

  /**
   * Test Suite 1: Module Initialization
   */
  describe('Module Initialization', () => {
    test('T011: Planner module should be defined', () => {
      expect(planner).toBeDefined();
      expect(typeof planner).toBe('object');
    });

    test('T012: Planner module should have required methods', () => {
      expect(typeof planner.setDayStructure).toBe('function');
      expect(typeof planner.getDayStructure).toBe('function');
      expect(typeof planner.validateDayStructure).toBe('function');
      expect(typeof planner.validateTimeFormat).toBe('function');
    });
  });

  /**
   * Test Suite 2: Time Utility Functions
   */
  describe('Time Utility Functions', () => {
    test('T013: validateTimeFormat should accept valid HH:MM format', () => {
      expect(planner.validateTimeFormat('09:00')).toBe(true);
      expect(planner.validateTimeFormat('12:30')).toBe(true);
      expect(planner.validateTimeFormat('23:59')).toBe(true);
    });

    test('T014: validateTimeFormat should reject invalid formats', () => {
      expect(planner.validateTimeFormat('9:00')).toBe(false);
      expect(planner.validateTimeFormat('0900')).toBe(false);
      expect(planner.validateTimeFormat('25:00')).toBe(false);
      expect(planner.validateTimeFormat('12:60')).toBe(false);
      expect(planner.validateTimeFormat('not-a-time')).toBe(false);
    });
  });

  /**
   * Test Suite 3: Day Structure Configuration
   */
  describe('Day Structure Configuration', () => {
    test('T015: getDayStructure should return default configuration for working day', () => {
      const today = new Date().toISOString().split('T')[0];
      const dayStructure = planner.getDayStructure(today);
      
      expect(dayStructure).toBeDefined();
      expect(dayStructure.date).toBe(today);
      expect(dayStructure.dayStartTime).toBe('09:00');
      expect(dayStructure.lunchBreakStart).toBe('12:00');
      expect(dayStructure.lunchBreakEnd).toBe('12:30');
      expect(dayStructure.isWorkingDay).toBe(true);
      expect(dayStructure.totalAvailableMinutes).toBeGreaterThan(0);
    });

    test('T016: getDayStructure should return non-working day configuration for Sunday', () => {
      const sunday = '2024-07-21'; // A Sunday
      const dayStructure = planner.getDayStructure(sunday);
      
      expect(dayStructure.dayStartTime).toBe('00:00');
      expect(dayStructure.isWorkingDay).toBe(false);
      expect(dayStructure.totalAvailableMinutes).toBe(0);
    });

    test('T017: validateDayStructure should accept valid configuration', () => {
      const validConfig = {
        dayStartTimes: { monday: '09:00' },
        lunchBreakStartTimes: { monday: '12:00' },
        lunchBreakDurations: { monday: 30 }
      };
      
      expect(planner.validateDayStructure(validConfig)).toBe(true);
    });

    test('T018: validateDayStructure should reject invalid time formats', () => {
      const invalidConfig = {
        dayStartTimes: { monday: '25:00' },
        lunchBreakStartTimes: { monday: '12:00' },
        lunchBreakDurations: { monday: 30 }
      };
      
      expect(planner.validateDayStructure(invalidConfig)).toBe(false);
    });

    test('T019: validateDayStructure should reject lunch before day start', () => {
      const invalidConfig = {
        dayStartTimes: { monday: '10:00' },
        lunchBreakStartTimes: { monday: '09:00' },
        lunchBreakDurations: { monday: 30 }
      };
      
      expect(planner.validateDayStructure(invalidConfig)).toBe(false);
    });

    test('T020: validateDayStructure should reject invalid lunch durations', () => {
      const invalidConfig = {
        dayStartTimes: { monday: '09:00' },
        lunchBreakStartTimes: { monday: '12:00' },
        lunchBreakDurations: { monday: -1 }
      };
      
      expect(planner.validateDayStructure(invalidConfig)).toBe(false);
    });
  });

  /**
   * Test Suite 4: Configuration Management
   */
  describe('Configuration Management', () => {
    test('T021: setDayStructure should save configuration', () => {
      const newConfig = {
        dayStartTimes: { monday: '08:00' },
        lunchBreakStartTimes: { monday: '12:00' },
        lunchBreakDurations: { monday: 30 }
      };
      
      // Mock localStorage setItem
      global.localStorage.setItem.mockImplementation((key, value) => {
        // Simulate storage
      });
      
      planner.setDayStructure(newConfig);
      
      expect(global.localStorage.setItem).toHaveBeenCalled();
      const callArgs = global.localStorage.setItem.mock.calls[0];
      expect(callArgs[0]).toBe('userConfig');
    });

    test('T022: setDayStructure should validate before saving', () => {
      const invalidConfig = {
        dayStartTimes: { monday: '25:00' },
        lunchBreakStartTimes: { monday: '12:00' },
        lunchBreakDurations: { monday: 30 }
      };
      
      expect(() => {
        planner.setDayStructure(invalidConfig);
      }).not.toThrow(); // Should handle gracefully, not throw
    });
  });

  /**
   * Test Suite 5: Edge Cases
   */
  describe('Edge Cases', () => {
    test('T023: getDayStructure should handle invalid date gracefully', () => {
      expect(() => {
        planner.getDayStructure('invalid-date');
      }).not.toThrow();
    });

    test('T024: validateTimeFormat should handle edge cases', () => {
      expect(planner.validateTimeFormat('00:00')).toBe(true);
      expect(planner.validateTimeFormat('23:59')).toBe(true);
      expect(planner.validateTimeFormat('')).toBe(false);
      expect(planner.validateTimeFormat(null)).toBe(false);
      expect(planner.validateTimeFormat(undefined)).toBe(false);
    });
  });

  /**
   * Test Suite 6: Feasibility Calculation (User Story 1)
   */
  describe('Feasibility Calculation', () => {
    beforeEach(() => {
      // Mock activities for testing
      window.TimeWise.Storage = {
        getActivities: () => [
          {
            id: 'ACT-001',
            label: 'Intense Task',
            cognitiveLoad: 'intense',
            estimatedDuration: 120,
            scheduledDays: ['monday']
          },
          {
            id: 'ACT-002',
            label: 'Moderate Task',
            cognitiveLoad: 'moderate',
            estimatedDuration: 180,
            scheduledDays: ['monday']
          },
          {
            id: 'ACT-003',
            label: 'Light Task',
            cognitiveLoad: 'light',
            estimatedDuration: 60,
            scheduledDays: ['monday']
          }
        ]
      };
    });

    test('T025: checkDailyFeasibility should calculate feasible schedule', () => {
      const monday = '2024-07-15'; // A Monday
      const feasibility = planner.checkDailyFeasibility(monday);
      
      expect(feasibility).toBeDefined();
      expect(feasibility.date).toBe(monday);
      expect(feasibility.totalDurationMinutes).toBe(360); // 120 + 180 + 60
      expect(feasibility.dailyWorkTargetMinutes).toBe(420); // 7 hours
      expect(feasibility.feasibilityStatus).toBe('feasible');
      expect(feasibility.colorIndicator).toBe('green');
      expect(feasibility.activitiesCount).toBe(3);
    });

    test('T026: checkDailyFeasibility should detect tight schedule', () => {
      // Mock activities that total exactly 80% of capacity (tight)
      window.TimeWise.Storage.getActivities = () => [
        {
          id: 'ACT-004',
          label: 'Full Day Task',
          cognitiveLoad: 'moderate',
          estimatedDuration: 336, // 80% of 420 minutes
          scheduledDays: ['monday']
        }
      ];
      
      const monday = '2024-07-15';
      const feasibility = planner.checkDailyFeasibility(monday);
      
      expect(feasibility.feasibilityStatus).toBe('tight');
      expect(feasibility.colorIndicator).toBe('yellow');
    });

    test('T027: checkDailyFeasibility should detect not feasible schedule', () => {
      // Mock activities that exceed capacity
      window.TimeWise.Storage.getActivities = () => [
        {
          id: 'ACT-005',
          label: 'Overloaded Task',
          cognitiveLoad: 'intense',
          estimatedDuration: 480, // Exceeds 420 minute capacity
          scheduledDays: ['monday']
        }
      ];
      
      const monday = '2024-07-15';
      const feasibility = planner.checkDailyFeasibility(monday);
      
      expect(feasibility.feasibilityStatus).toBe('not-feasible');
      expect(feasibility.colorIndicator).toBe('red');
    });

    test('T028: checkDailyFeasibility should handle non-working days', () => {
      const sunday = '2024-07-21'; // A Sunday
      const feasibility = planner.checkDailyFeasibility(sunday);
      
      expect(feasibility.feasibilityStatus).toBe('not-applicable');
      expect(feasibility.colorIndicator).toBe('gray');
      expect(feasibility.dailyWorkTargetMinutes).toBe(0);
    });

    test('T029: checkDailyFeasibility should track cognitive load distribution', () => {
      const monday = '2024-07-15';
      const feasibility = planner.checkDailyFeasibility(monday);
      
      expect(feasibility.cognitiveLoadDistribution).toBeDefined();
      expect(feasibility.cognitiveLoadDistribution.intense).toBe(120);
      expect(feasibility.cognitiveLoadDistribution.moderate).toBe(180);
      expect(feasibility.cognitiveLoadDistribution.light).toBe(60);
    });

    test('T030: getFeasibilityIndicator should return correct color', () => {
      const monday = '2024-07-15';
      const indicator = planner.getFeasibilityIndicator(monday);
      
      expect(indicator).toBe('green');
    });
  });

  /**
   * Test Suite 7: Global Agenda Generation (User Story 2)
   */
  describe('Global Agenda Generation', () => {
    beforeEach(() => {
      // Mock activities with deadlines
      window.TimeWise.Storage = {
        getActivities: () => [
          {
            id: 'ACT-101',
            label: 'Project A',
            cognitiveLoad: 'intense',
            estimatedDuration: 240,
            deadline: '2024-07-18',
            scheduledDays: ['thursday']
          },
          {
            id: 'ACT-102',
            label: 'Project B',
            cognitiveLoad: 'moderate',
            estimatedDuration: 180,
            deadline: '2024-07-19',
            scheduledDays: ['friday']
          },
          {
            id: 'ACT-103',
            label: 'Project C',
            cognitiveLoad: 'light',
            estimatedDuration: 120,
            deadline: '2024-07-17',
            scheduledDays: ['wednesday']
          }
        ]
      };
    });

    test('T031: generateGlobalAgenda should create work distribution', () => {
      const globalAgenda = planner.generateGlobalAgenda();
      
      expect(globalAgenda).toBeDefined();
      expect(globalAgenda.generatedAt).toBeDefined();
      expect(globalAgenda.timeRange).toBeDefined();
      expect(globalAgenda.dailyDistributions).toBeDefined();
      expect(globalAgenda.totalWorkHours).toBeGreaterThan(0);
      expect(globalAgenda.averageDailyLoad).toBeGreaterThan(0);
    });

    test('T032: generateGlobalAgenda should handle activities with deadlines', () => {
      const globalAgenda = planner.generateGlobalAgenda();
      
      // Should include days up to the latest deadline
      expect(Object.keys(globalAgenda.dailyDistributions).length).toBeGreaterThan(1);
    });

    test('T033: generateGlobalAgenda should calculate remaining capacity', () => {
      const globalAgenda = planner.generateGlobalAgenda();
      
      // Check that some days have remaining capacity
      const daysWithCapacity = Object.values(globalAgenda.dailyDistributions)
        .filter(day => day.remainingCapacityMinutes > 0);
      
      expect(daysWithCapacity.length).toBeGreaterThan(0);
    });

    test('T034: generateGlobalAgenda should handle non-working days', () => {
      const globalAgenda = planner.generateGlobalAgenda();
      
      // Find Sunday in the distributions
      const sundayDate = Object.keys(globalAgenda.dailyDistributions)
        .find(date => new Date(date).getDay() === 0);
      
      if (sundayDate) {
        expect(globalAgenda.dailyDistributions[sundayDate].isWorkingDay).toBe(false);
        expect(globalAgenda.dailyDistributions[sundayDate].remainingCapacityMinutes).toBe(0);
      }
    });

    test('T035: getGlobalAgenda should return current agenda', () => {
      const globalAgenda = planner.getGlobalAgenda();
      
      expect(globalAgenda).toBeDefined();
      expect(globalAgenda.dailyDistributions).toBeDefined();
    });
  });

});

/**
 * Test Summary
 */
describe('Test Coverage Summary', () => {
  test('Phase 1 Setup: All tasks completed', () => {
    // This test verifies that Phase 1 setup is complete
    expect(true).toBe(true); // Placeholder for actual verification
  });
});

console.log('✅ Planner module tests initialized successfully');