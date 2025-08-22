import { StorageLayer } from './storageLayer.js';
import { Reminder } from './index.js';
import { Temporal } from '@js-temporal/polyfill';

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('StorageLayer', () => {
  let storageLayer;
  const storageKey = 'test-reminders';

  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    storageLayer = new StorageLayer(storageKey);
  });

  describe('Initialization', () => {
    test('should create instance with default storage key', () => {
      const storage = new StorageLayer();
      expect(storage.storageKey).toBe('reminders');
      expect(storage.version).toBe(1);
    });

    test('should create instance with custom storage key', () => {
      expect(storageLayer.storageKey).toBe(storageKey);
      expect(storageLayer.version).toBe(1);
    });

    test('should initialize with empty data when localStorage is empty', () => {
      const data = storageLayer.load();
      expect(data).toEqual([]);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(storageKey);
    });
  });

  describe('Basic Save/Load Operations', () => {
    test('should save and load reminder data', () => {
      const reminder = new Reminder('Test Task', 'Test description');
      const data = [reminder];

      storageLayer.save(data);
      const loaded = storageLayer.load();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        storageKey,
        expect.any(String)
      );
      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toBeInstanceOf(Reminder);
      expect(loaded[0].title).toBe('Test Task');
    });

    test('should save multiple reminders', () => {
      const reminders = [
        new Reminder('Task 1', 'Description 1'),
        new Reminder('Task 2', 'Description 2', Temporal.Now.plainDateTimeISO().add({ days: 1 }))
      ];

      storageLayer.save(reminders);
      const loaded = storageLayer.load();

      expect(loaded).toHaveLength(2);
      expect(loaded[0].title).toBe('Task 1');
      expect(loaded[1].title).toBe('Task 2');
      expect(loaded[1].dueDate).toBeTruthy();
    });

    test('should handle empty data array', () => {
      storageLayer.save([]);
      const loaded = storageLayer.load();

      expect(loaded).toEqual([]);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('JSON Serialization', () => {
    test('should properly serialize complex reminder objects', () => {
      const dueDate = Temporal.PlainDateTime.from('2024-12-25T10:00:00');
      const reminder = new Reminder('Holiday Task', 'Prepare for holidays', dueDate, 'high', 'personal');
      reminder.markComplete();

      storageLayer.save([reminder]);

      // Verify the stored JSON structure
      const storedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      
      expect(storedData).toHaveProperty('version', 1);
      expect(storedData).toHaveProperty('data');
      expect(storedData.data).toHaveLength(1);
      
      const serialized = storedData.data[0];
      expect(serialized).toHaveProperty('id');
      expect(serialized).toHaveProperty('title', 'Holiday Task');
      expect(serialized).toHaveProperty('description', 'Prepare for holidays');
      expect(serialized).toHaveProperty('dueDate', dueDate.toString());
      expect(serialized).toHaveProperty('priority', 'high');
      expect(serialized).toHaveProperty('category', 'personal');
      expect(serialized).toHaveProperty('isCompleted', true);
      expect(serialized).toHaveProperty('createdAt');
      expect(serialized).toHaveProperty('completedAt');
    });

    test('should properly deserialize complex reminder objects', () => {
      const dueDate = Temporal.PlainDateTime.from('2024-12-25T10:00:00');
      const originalReminder = new Reminder('Test Task', 'Test description', dueDate, 'high', 'work');
      
      storageLayer.save([originalReminder]);
      const loaded = storageLayer.load();

      expect(loaded).toHaveLength(1);
      const loadedReminder = loaded[0];
      
      expect(loadedReminder).toBeInstanceOf(Reminder);
      expect(loadedReminder.title).toBe('Test Task');
      expect(loadedReminder.description).toBe('Test description');
      expect(loadedReminder.priority).toBe('high');
      expect(loadedReminder.category).toBe('work');
      expect(loadedReminder.dueDate?.toString()).toBe(dueDate.toString());
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage quota exceeded error', () => {
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const reminder = new Reminder('Test Task');
      const result = storageLayer.save([reminder]);

      expect(result).toBe(false);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Restore original implementation
      mockLocalStorage.setItem = originalSetItem;
    });

    test('should handle corrupted JSON data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json data');

      const loaded = storageLayer.load();

      expect(loaded).toEqual([]);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(storageKey);
    });

    test('should handle missing localStorage gracefully', () => {
      const originalLocalStorage = window.localStorage;
      delete window.localStorage;

      const storage = new StorageLayer(storageKey);
      const loaded = storage.load();
      const saved = storage.save([new Reminder('Test')]);

      expect(loaded).toEqual([]);
      expect(saved).toBe(false);

      // Restore localStorage
      window.localStorage = originalLocalStorage;
    });

    test('should handle invalid reminder data during load', () => {
      const invalidData = {
        version: 1,
        data: [
          { title: 'Valid Task', description: 'Valid description' },
          { description: 'Missing title' }, // Invalid - no title
          { title: 'Another valid task' }
        ]
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(invalidData));

      const loaded = storageLayer.load();

      // Should only load valid reminders
      expect(loaded).toHaveLength(2);
      expect(loaded[0].title).toBe('Valid Task');
      expect(loaded[1].title).toBe('Another valid task');
    });
  });

  describe('Data Migration', () => {
    test('should migrate from version 0 (legacy format) to version 1', () => {
      // Simulate legacy data format (direct array without version wrapper)
      const legacyData = [
        {
          id: 'legacy_1',
          title: 'Legacy Task',
          description: 'Old format task',
          dueDate: null,
          priority: 'medium',
          category: 'general',
          isCompleted: false,
          createdAt: '2024-01-01T10:00:00',
          completedAt: null
        }
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(legacyData));

      const loaded = storageLayer.load();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].title).toBe('Legacy Task');
      expect(loaded[0]).toBeInstanceOf(Reminder);

      // Should have saved the migrated data in new format
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveProperty('version', 1);
    });

    test('should handle future version data gracefully', () => {
      const futureData = {
        version: 2,
        data: [{ title: 'Future Task' }],
        newFeature: 'unknown feature'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(futureData));

      const loaded = storageLayer.load();

      // Should still attempt to load the data array
      expect(loaded).toHaveLength(1);
      expect(loaded[0].title).toBe('Future Task');
    });

    test('should migrate data with missing properties', () => {
      const oldData = {
        version: 1,
        data: [
          {
            id: 'old_1',
            title: 'Old Task',
            // Missing description, using older priority values, etc.
            priority: 'normal', // Old priority value
            isCompleted: false,
            createdAt: '2024-01-01T10:00:00'
          }
        ]
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(oldData));

      const loaded = storageLayer.load();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].title).toBe('Old Task');
      expect(loaded[0].description).toBe(''); // Should have default
      expect(loaded[0].priority).toBe('medium'); // Should be normalized
      expect(loaded[0].category).toBe('general'); // Should have default
    });
  });

  describe('Data Validation', () => {
    test('should validate data before saving', () => {
      const invalidReminder = { title: '', description: 'Invalid' };

      expect(() => {
        storageLayer.save([invalidReminder]);
      }).toThrow('Invalid reminder data');
    });

    test('should skip invalid items during bulk save', () => {
      const mixedData = [
        new Reminder('Valid Task 1'),
        { title: '', description: 'Invalid' }, // Invalid
        new Reminder('Valid Task 2')
      ];

      const result = storageLayer.saveWithValidation(mixedData);

      expect(result.saved).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Storage Utilities', () => {
    test('should check if localStorage is available', () => {
      expect(StorageLayer.isStorageAvailable()).toBe(true);
    });

    test('should get storage usage information', () => {
      const reminder = new Reminder('Test Task');
      storageLayer.save([reminder]);

      const usage = storageLayer.getStorageInfo();

      expect(usage).toHaveProperty('key', storageKey);
      expect(usage).toHaveProperty('size');
      expect(usage).toHaveProperty('itemCount', 1);
      expect(usage.size).toBeGreaterThan(0);
    });

    test('should clear storage', () => {
      storageLayer.save([new Reminder('Test Task')]);
      
      storageLayer.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(storageKey);
      expect(storageLayer.load()).toEqual([]);
    });

    test('should export data for backup', () => {
      const reminders = [
        new Reminder('Task 1'),
        new Reminder('Task 2')
      ];
      storageLayer.save(reminders);

      const exported = storageLayer.export();

      expect(exported).toHaveProperty('version', 1);
      expect(exported).toHaveProperty('exportedAt');
      expect(exported).toHaveProperty('data');
      expect(exported.data).toHaveLength(2);
    });

    test('should import data from backup', () => {
      const backupData = {
        version: 1,
        exportedAt: '2024-01-01T10:00:00',
        data: [
          { title: 'Imported Task 1', description: 'From backup' },
          { title: 'Imported Task 2', description: 'From backup' }
        ]
      };

      const result = storageLayer.import(backupData);

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);

      const loaded = storageLayer.load();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].title).toBe('Imported Task 1');
    });
  });
});