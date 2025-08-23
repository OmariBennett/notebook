/**
 * @jest-environment jsdom
 */
import { StorageLayer } from './storageLayer.js';
import { Reminder } from './index.js';
import { Temporal } from '@js-temporal/polyfill';

// Simple mock localStorage
const createMockStorage = () => {
  let store = {};
  let setItemCalls = [];
  let getItemCalls = [];
  let removeItemCalls = [];

  return {
    getItem: (key) => {
      getItemCalls.push(key);
      return store[key] || null;
    },
    setItem: (key, value) => {
      setItemCalls.push([key, value]);
      store[key] = value.toString();
    },
    removeItem: (key) => {
      removeItemCalls.push(key);
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get setItemCalls() { return setItemCalls; },
    get getItemCalls() { return getItemCalls; },
    get removeItemCalls() { return removeItemCalls; },
    clearCalls: () => {
      setItemCalls = [];
      getItemCalls = [];
      removeItemCalls = [];
    }
  };
};

let mockStorage;

Object.defineProperty(window, 'localStorage', {
  get: () => mockStorage,
  set: (value) => { mockStorage = value; }
});

describe('StorageLayer', () => {
  let storageLayer;
  const storageKey = 'test-reminders';

  beforeEach(() => {
    mockStorage = createMockStorage();
    storageLayer = new StorageLayer(storageKey);
  });

  describe('Basic Operations', () => {
    test('should save and load reminders', () => {
      const reminder = new Reminder('Test Task', 'Test description');
      const data = [reminder];

      const saveResult = storageLayer.save(data);
      expect(saveResult).toBe(true);

      const loaded = storageLayer.load();
      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toBeInstanceOf(Reminder);
      expect(loaded[0].title).toBe('Test Task');
      expect(loaded[0].description).toBe('Test description');
    });

    test('should handle empty localStorage', () => {
      const loaded = storageLayer.load();
      expect(loaded).toEqual([]);
    });

    test('should save versioned data format', () => {
      mockStorage.clearCalls(); // Clear calls from constructor
      
      const reminder = new Reminder('Test Task');
      storageLayer.save([reminder]);

      // Check that at least one save call was made (may be more due to load/migration calls)
      expect(mockStorage.setItemCalls.length).toBeGreaterThan(0);
      const savedData = JSON.parse(mockStorage.setItemCalls[mockStorage.setItemCalls.length - 1][1]);
      
      expect(savedData).toHaveProperty('version', 1);
      expect(savedData).toHaveProperty('data');
      expect(savedData.data).toHaveLength(1);
    });
  });

  describe('JSON Serialization', () => {
    test('should serialize complex reminder data', () => {
      const dueDate = Temporal.PlainDateTime.from('2024-12-25T10:00:00');
      const reminder = new Reminder('Holiday Task', 'Prepare for holidays', dueDate, 'high', 'personal');
      
      storageLayer.save([reminder]);
      const loaded = storageLayer.load();

      expect(loaded[0].title).toBe('Holiday Task');
      expect(loaded[0].description).toBe('Prepare for holidays');
      expect(loaded[0].priority).toBe('high');
      expect(loaded[0].category).toBe('personal');
      expect(loaded[0].dueDate?.toString()).toBe(dueDate.toString());
    });
  });

  describe('Error Handling', () => {
    test('should handle corrupted JSON data', () => {
      // Manually set corrupted data
      mockStorage.setItem(storageKey, 'invalid json');
      
      const loaded = storageLayer.load();
      expect(loaded).toEqual([]);
    });

    test('should handle storage errors gracefully', () => {
      // Mock setItem to throw error
      const originalSetItem = mockStorage.setItem;
      mockStorage.setItem = () => {
        throw new Error('Storage quota exceeded');
      };

      const reminder = new Reminder('Test Task');
      const result = storageLayer.save([reminder]);
      
      expect(result).toBe(false);

      // Restore
      mockStorage.setItem = originalSetItem;
    });

    test('should validate reminder data', () => {
      const invalidData = [{ title: '', description: 'Invalid' }];
      
      // Should return false instead of throwing for graceful error handling
      const result = storageLayer.save(invalidData);
      expect(result).toBe(false);
    });
  });

  describe('Data Migration', () => {
    test('should migrate from legacy format', () => {
      const legacyData = [
        {
          id: 'legacy_1',
          title: 'Legacy Task',
          description: 'Old format',
          priority: 'medium',
          category: 'general',
          isCompleted: false,
          createdAt: '2024-01-01T10:00:00'
        }
      ];

      mockStorage.setItem(storageKey, JSON.stringify(legacyData));
      
      const loaded = storageLayer.load();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].title).toBe('Legacy Task');
      expect(loaded[0]).toBeInstanceOf(Reminder);
      
      // Should have saved migrated data
      expect(mockStorage.setItemCalls.length).toBeGreaterThan(0);
    });

    test('should normalize old priority values', () => {
      const oldData = {
        version: 1,
        data: [
          {
            id: 'old_1',
            title: 'Old Task',
            priority: 'normal', // Old priority value
            isCompleted: false,
            createdAt: '2024-01-01T10:00:00'
          }
        ]
      };

      mockStorage.setItem(storageKey, JSON.stringify(oldData));
      
      const loaded = storageLayer.load();
      
      expect(loaded[0].priority).toBe('medium'); // Should be normalized
    });
  });

  describe('Storage Utilities', () => {
    test('should clear storage', () => {
      const reminder = new Reminder('Test Task');
      storageLayer.save([reminder]);
      
      storageLayer.clear();
      
      expect(mockStorage.removeItemCalls).toContain(storageKey);
      expect(storageLayer.load()).toEqual([]);
    });

    test('should provide storage info', () => {
      const reminder = new Reminder('Test Task');
      storageLayer.save([reminder]);
      
      const info = storageLayer.getStorageInfo();
      
      expect(info.key).toBe(storageKey);
      expect(info.size).toBeGreaterThan(0);
      expect(info.itemCount).toBe(1);
    });

    test('should export data', () => {
      const reminder = new Reminder('Test Task');
      storageLayer.save([reminder]);
      
      const exported = storageLayer.export();
      
      expect(exported).toHaveProperty('version', 1);
      expect(exported).toHaveProperty('exportedAt');
      expect(exported).toHaveProperty('data');
      expect(exported.data).toHaveLength(1);
    });

    test('should import data', () => {
      const backupData = {
        version: 1,
        exportedAt: '2024-01-01T10:00:00',
        data: [
          { title: 'Imported Task', description: 'From backup' }
        ]
      };

      const result = storageLayer.import(backupData);
      
      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
      
      const loaded = storageLayer.load();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].title).toBe('Imported Task');
    });
  });

  describe('Validation Features', () => {
    test('should use saveWithValidation for mixed data', () => {
      const mixedData = [
        new Reminder('Valid Task 1'),
        { title: '', description: 'Invalid - empty title' },
        { title: 'Valid Task 2', description: 'Valid data' }
      ];

      const result = storageLayer.saveWithValidation(mixedData);
      
      expect(result.saved).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  test('should check storage availability', () => {
    expect(StorageLayer.isStorageAvailable()).toBe(true);
  });
});