import { Reminder } from './index.js';
import { Temporal } from '@js-temporal/polyfill';

export class StorageLayer {
  constructor(storageKey = 'reminders') {
    this.storageKey = storageKey;
    this.version = 1;
  }

  save(reminders) {
    try {
      if (!this._isStorageAvailable()) {
        return false;
      }

      // Validate reminders before saving
      if (!Array.isArray(reminders)) {
        throw new Error('Data must be an array');
      }

      for (const reminder of reminders) {
        if (!(reminder instanceof Reminder)) {
          // Check if it's a plain object that could be converted to a Reminder
          if (!reminder || typeof reminder !== 'object' || !reminder.title || !reminder.title.trim()) {
            throw new Error('Invalid reminder data');
          }
        }
      }

      const data = {
        version: this.version,
        data: reminders.map(r => r.toJSON())
      };

      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save reminders:', error);
      return false;
    }
  }

  load() {
    try {
      if (!this._isStorageAvailable()) {
        return [];
      }

      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      
      // Handle legacy format (direct array without version wrapper)
      if (Array.isArray(parsed)) {
        const migrated = this._migrateFromLegacy(parsed);
        // Save migrated data
        this.save(migrated);
        return migrated;
      }

      // Handle versioned format
      const data = parsed.data || [];
      const reminders = [];

      for (const item of data) {
        try {
          // Normalize old data
          const normalizedItem = this._normalizeReminderData(item);
          const reminder = Reminder.fromJSON(normalizedItem);
          reminders.push(reminder);
        } catch (error) {
          console.warn('Skipping invalid reminder data:', error);
          // Skip invalid items but continue processing others
        }
      }

      return reminders;
    } catch (error) {
      console.error('Failed to load reminders:', error);
      return [];
    }
  }

  saveWithValidation(data) {
    let saved = 0;
    let skipped = 0;
    const errors = [];
    const validReminders = [];

    for (const item of data) {
      try {
        if (item instanceof Reminder) {
          validReminders.push(item);
          saved++;
        } else if (item && typeof item === 'object' && item.title && item.title.trim()) {
          const reminder = new Reminder(
            item.title,
            item.description || '',
            item.dueDate || null,
            item.priority || 'medium',
            item.category || 'general'
          );
          validReminders.push(reminder);
          saved++;
        } else {
          skipped++;
          errors.push('Invalid reminder data: missing or empty title');
        }
      } catch (error) {
        skipped++;
        errors.push(error.message);
      }
    }

    this.save(validReminders);
    
    return {
      saved,
      skipped,
      errors
    };
  }

  clear() {
    try {
      if (this._isStorageAvailable()) {
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  getStorageInfo() {
    try {
      if (!this._isStorageAvailable()) {
        return { key: this.storageKey, size: 0, itemCount: 0 };
      }

      const stored = localStorage.getItem(this.storageKey);
      const size = stored ? stored.length : 0;
      const reminders = this.load();
      
      return {
        key: this.storageKey,
        size,
        itemCount: reminders.length
      };
    } catch (error) {
      return { key: this.storageKey, size: 0, itemCount: 0 };
    }
  }

  export() {
    const reminders = this.load();
    return {
      version: this.version,
      exportedAt: new Date().toISOString(),
      data: reminders.map(r => r.toJSON())
    };
  }

  import(backupData) {
    let imported = 0;
    const errors = [];

    try {
      if (!backupData || !backupData.data || !Array.isArray(backupData.data)) {
        throw new Error('Invalid backup data format');
      }

      const existingReminders = this.load();
      const newReminders = [];

      for (const item of backupData.data) {
        try {
          // Handle both plain objects and already serialized data
          let reminderData;
          if (item instanceof Reminder) {
            reminderData = item;
          } else if (item && typeof item === 'object' && item.title) {
            // Create reminder from plain object data
            reminderData = new Reminder(
              item.title,
              item.description || '',
              item.dueDate ? (typeof item.dueDate === 'string' ? Temporal.PlainDateTime.from(item.dueDate) : item.dueDate) : null,
              item.priority || 'medium',
              item.category || 'general'
            );
          } else {
            // Try to normalize and create from JSON
            const normalizedItem = this._normalizeReminderData(item);
            reminderData = Reminder.fromJSON(normalizedItem);
          }
          
          newReminders.push(reminderData);
          imported++;
        } catch (error) {
          errors.push(`Failed to import item: ${error.message}`);
        }
      }

      // Combine with existing reminders and save
      const allReminders = [...existingReminders, ...newReminders];
      this.save(allReminders);

      return { imported, errors };
    } catch (error) {
      errors.push(error.message);
      return { imported: 0, errors };
    }
  }

  static isStorageAvailable() {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  _isStorageAvailable() {
    return StorageLayer.isStorageAvailable();
  }

  _migrateFromLegacy(legacyData) {
    const reminders = [];
    
    for (const item of legacyData) {
      try {
        const normalizedItem = this._normalizeReminderData(item);
        const reminder = Reminder.fromJSON(normalizedItem);
        reminders.push(reminder);
      } catch (error) {
        console.warn('Skipping invalid legacy item:', error);
      }
    }

    return reminders;
  }

  _normalizeReminderData(item) {
    // Normalize old priority values
    let priority = item.priority;
    if (priority === 'normal') {
      priority = 'medium';
    }
    if (!['low', 'medium', 'high'].includes(priority)) {
      priority = 'medium';
    }

    // Ensure required fields have defaults
    return {
      id: item.id || `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: item.title || '',
      description: item.description || '',
      dueDate: item.dueDate || null,
      priority: priority,
      category: item.category || 'general',
      isCompleted: Boolean(item.isCompleted),
      createdAt: item.createdAt || new Date().toISOString(),
      completedAt: item.completedAt || null
    };
  }
}