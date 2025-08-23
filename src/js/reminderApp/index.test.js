// * Test suite for Reminder App core functionality

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Temporal } from '@js-temporal/polyfill';

import { Reminder, ReminderManager } from './index.js';

describe('Reminder App Test Suite', () => {
  
  // * Test placeholder - will be updated when classes are implemented
  test('should be ready for implementation', () => {
    expect(true).toBe(true);
  });

  describe('Reminder Class', () => {
    let reminder;
    const futureDate = Temporal.PlainDateTime.from('2026-12-25T15:30:00');
    const pastDate = Temporal.PlainDateTime.from('2023-01-15T09:00:00');
    const currentDateTime = Temporal.Now.plainDateTimeISO();

    describe('Constructor', () => {
      test('should create reminder with all properties', () => {
        const reminder = new Reminder(
          'Meeting with team',
          'Discuss project timeline and deliverables',
          futureDate,
          'high',
          'work'
        );

        expect(reminder.title).toBe('Meeting with team');
        expect(reminder.description).toBe('Discuss project timeline and deliverables');
        expect(reminder.dueDate).toEqual(futureDate);
        expect(reminder.priority).toBe('high');
        expect(reminder.category).toBe('work');
        expect(reminder.isCompleted).toBe(false);
        expect(reminder.id).toBeDefined();
        expect(typeof reminder.id).toBe('string');
        expect(reminder.createdAt).toBeDefined();
      });

      test('should create reminder with minimal required properties', () => {
        const reminder = new Reminder('Simple task');

        expect(reminder.title).toBe('Simple task');
        expect(reminder.description).toBe('');
        expect(reminder.dueDate).toBeNull();
        expect(reminder.priority).toBe('medium');
        expect(reminder.category).toBe('general');
        expect(reminder.isCompleted).toBe(false);
      });

      test('should throw error for empty title', () => {
        expect(() => new Reminder('')).toThrow('Title is required');
        expect(() => new Reminder(null)).toThrow('Title is required');
        expect(() => new Reminder(undefined)).toThrow('Title is required');
      });

      test('should validate priority levels', () => {
        expect(() => new Reminder('Task', '', null, 'invalid')).toThrow('Invalid priority level');
        
        const validPriorities = ['low', 'medium', 'high'];
        validPriorities.forEach(priority => {
          expect(() => new Reminder('Task', '', null, priority)).not.toThrow();
        });
      });
    });

    describe('isOverdue()', () => {
      test('should return true for past due dates', () => {
        const reminder = new Reminder('Past task', '', pastDate);
        expect(reminder.isOverdue()).toBe(true);
      });

      test('should return false for future due dates', () => {
        const reminder = new Reminder('Future task', '', futureDate);
        expect(reminder.isOverdue()).toBe(false);
      });

      test('should return false for no due date', () => {
        const reminder = new Reminder('No due date task');
        expect(reminder.isOverdue()).toBe(false);
      });

      test('should return false for completed reminders', () => {
        const reminder = new Reminder('Completed past task', '', pastDate);
        reminder.markComplete();
        expect(reminder.isOverdue()).toBe(false);
      });
    });

    describe('timeUntilDue()', () => {
      test('should calculate positive duration for future dates', () => {
        const reminder = new Reminder('Future task', '', futureDate);
        const timeUntil = reminder.timeUntilDue();
        
        expect(timeUntil).toBeInstanceOf(Temporal.Duration);
        expect(timeUntil.sign).toBe(1);
      });

      test('should calculate negative duration for past dates', () => {
        const reminder = new Reminder('Past task', '', pastDate);
        const timeUntil = reminder.timeUntilDue();
        
        expect(timeUntil).toBeInstanceOf(Temporal.Duration);
        expect(timeUntil.sign).toBe(-1);
      });

      test('should return null for no due date', () => {
        const reminder = new Reminder('No due date task');
        expect(reminder.timeUntilDue()).toBeNull();
      });

      test('should format time until due as human readable', () => {
        const reminder = new Reminder('Future task', '', futureDate);
        const formatted = reminder.timeUntilDueFormatted();
        
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      });
    });

    describe('markComplete()', () => {
      beforeEach(() => {
        reminder = new Reminder('Test task', '', futureDate);
      });

      test('should mark reminder as complete', () => {
        expect(reminder.isCompleted).toBe(false);
        
        reminder.markComplete();
        
        expect(reminder.isCompleted).toBe(true);
        expect(reminder.completedAt).toBeDefined();
        expect(reminder.completedAt).toBeInstanceOf(Temporal.PlainDateTime);
      });

      test('should toggle completion status', () => {
        reminder.markComplete();
        expect(reminder.isCompleted).toBe(true);
        
        reminder.markComplete(false);
        expect(reminder.isCompleted).toBe(false);
        expect(reminder.completedAt).toBeNull();
      });

      test('should explicitly set completion status', () => {
        reminder.markComplete(true);
        expect(reminder.isCompleted).toBe(true);
        
        reminder.markComplete(false);
        expect(reminder.isCompleted).toBe(false);
      });
    });

    describe('Additional Methods', () => {
      beforeEach(() => {
        reminder = new Reminder('Test task', 'Test description', futureDate, 'high', 'work');
      });

      test('should convert to JSON representation', () => {
        const json = reminder.toJSON();
        
        expect(json.id).toBe(reminder.id);
        expect(json.title).toBe('Test task');
        expect(json.description).toBe('Test description');
        expect(json.priority).toBe('high');
        expect(json.category).toBe('work');
        expect(json.isCompleted).toBe(false);
        expect(json.dueDate).toBe(futureDate.toString());
      });

      test('should create from JSON representation', () => {
        const json = {
          id: 'test-id',
          title: 'JSON task',
          description: 'From JSON',
          dueDate: futureDate.toString(),
          priority: 'low',
          category: 'personal',
          isCompleted: true,
          createdAt: currentDateTime.toString(),
          completedAt: currentDateTime.toString()
        };

        const fromJson = Reminder.fromJSON(json);
        
        expect(fromJson.id).toBe('test-id');
        expect(fromJson.title).toBe('JSON task');
        expect(fromJson.description).toBe('From JSON');
        expect(fromJson.priority).toBe('low');
        expect(fromJson.category).toBe('personal');
        expect(fromJson.isCompleted).toBe(true);
        expect(fromJson.dueDate.toString()).toBe(futureDate.toString());
      });

      test('should update reminder properties', () => {
        const newDate = Temporal.PlainDateTime.from('2026-11-30T14:00:00');
        
        reminder.update({
          title: 'Updated task',
          description: 'Updated description',
          dueDate: newDate,
          priority: 'low',
          category: 'personal'
        });

        expect(reminder.title).toBe('Updated task');
        expect(reminder.description).toBe('Updated description');
        expect(reminder.dueDate).toEqual(newDate);
        expect(reminder.priority).toBe('low');
        expect(reminder.category).toBe('personal');
      });

      test('should clone reminder', () => {
        const cloned = reminder.clone();
        
        expect(cloned.id).not.toBe(reminder.id);
        expect(cloned.title).toBe(reminder.title);
        expect(cloned.description).toBe(reminder.description);
        expect(cloned.dueDate).toEqual(reminder.dueDate);
        expect(cloned.priority).toBe(reminder.priority);
        expect(cloned.category).toBe(reminder.category);
        expect(cloned.isCompleted).toBe(reminder.isCompleted);
      });
    });
  });

  // TODO: Add ReminderManager class tests
  describe('ReminderManager Class', () => {
    let manager;
    let sampleReminders;
    let futureDate;
    let pastDate;
    let mockLocalStorage;

    beforeEach(() => {
      futureDate = Temporal.PlainDateTime.from('2026-12-25T15:30:00');
      pastDate = Temporal.PlainDateTime.from('2023-01-15T09:00:00');
      
      mockLocalStorage = {
        data: {},
        getItem: function(key) { return this.data[key] || null; },
        setItem: function(key, value) { this.data[key] = value; },
        removeItem: function(key) { delete this.data[key]; },
        clear: function() { this.data = {}; }
      };
      
      global.localStorage = mockLocalStorage;
      
      manager = new ReminderManager();
      
      sampleReminders = [
        new Reminder('Work meeting', 'Weekly team sync', futureDate, 'high', 'work'),
        new Reminder('Buy groceries', 'Milk, bread, eggs', pastDate, 'medium', 'personal'),
        new Reminder('Doctor appointment', 'Annual checkup', futureDate, 'high', 'health'),
        new Reminder('Call mom', '', null, 'low', 'personal'),
        new Reminder('Overdue task', 'This task is overdue', pastDate, 'high', 'work')
      ];
      
      sampleReminders[1].markComplete();
      
      mockLocalStorage.clear();
    });

    afterEach(() => {
      mockLocalStorage.clear();
    });

    describe('Constructor', () => {
      test('should initialize with empty collection', () => {
        expect(manager.getAll()).toEqual([]);
        expect(manager.count()).toBe(0);
      });

      test('should initialize with storage key', () => {
        expect(manager.storageKey).toBe('reminders');
      });

      test('should accept custom storage key', () => {
        const customManager = new ReminderManager('custom_key');
        expect(customManager.storageKey).toBe('custom_key');
      });

      test('should load existing data from localStorage', () => {
        const testData = [sampleReminders[0].toJSON()];
        localStorage.setItem('reminders', JSON.stringify(testData));
        
        const newManager = new ReminderManager();
        expect(newManager.count()).toBe(1);
        expect(newManager.getAll()[0].title).toBe('Work meeting');
      });
    });

    describe('Adding Reminders', () => {
      test('should add single reminder', () => {
        const reminder = manager.add(sampleReminders[0]);
        
        expect(manager.count()).toBe(1);
        expect(reminder).toBeInstanceOf(Reminder);
        expect(manager.getAll()).toContain(reminder);
      });

      test('should add reminder from object data', () => {
        const reminderData = {
          title: 'New task',
          description: 'Test description',
          dueDate: futureDate,
          priority: 'medium',
          category: 'work'
        };

        const reminder = manager.add(reminderData);
        
        expect(reminder).toBeInstanceOf(Reminder);
        expect(reminder.title).toBe('New task');
        expect(manager.count()).toBe(1);
      });

      test('should add multiple reminders', () => {
        const reminders = manager.addMultiple(sampleReminders);
        
        expect(manager.count()).toBe(5);
        expect(reminders).toHaveLength(5);
        reminders.forEach(r => expect(r).toBeInstanceOf(Reminder));
      });

      test('should throw error for invalid reminder', () => {
        expect(() => manager.add(null)).toThrow('Invalid reminder');
        expect(() => manager.add({})).toThrow('Invalid reminder');
        expect(() => manager.add('invalid')).toThrow('Invalid reminder');
      });

      test('should auto-save after adding', () => {
        manager.add(sampleReminders[0]);
        
        const stored = JSON.parse(localStorage.getItem('reminders'));
        expect(stored).toHaveLength(1);
        expect(stored[0].title).toBe('Work meeting');
      });
    });

    describe('Removing Reminders', () => {
      beforeEach(() => {
        manager.addMultiple(sampleReminders);
      });

      test('should remove reminder by ID', () => {
        const reminder = manager.getAll()[0];
        const removed = manager.remove(reminder.id);
        
        expect(removed).toEqual(reminder);
        expect(manager.count()).toBe(4);
        expect(manager.getById(reminder.id)).toBeNull();
      });

      test('should return null for non-existent ID', () => {
        const removed = manager.remove('non-existent');
        expect(removed).toBeNull();
        expect(manager.count()).toBe(5);
      });

      test('should remove completed reminders', () => {
        const completedCount = manager.getCompleted().length;
        const removedCount = manager.removeCompleted();
        
        expect(removedCount).toBe(completedCount);
        expect(manager.getCompleted()).toHaveLength(0);
      });

      test('should clear all reminders', () => {
        manager.clear();
        
        expect(manager.count()).toBe(0);
        expect(manager.getAll()).toEqual([]);
      });

      test('should auto-save after removing', () => {
        const reminder = manager.getAll()[0];
        manager.remove(reminder.id);
        
        const stored = JSON.parse(localStorage.getItem('reminders'));
        expect(stored).toHaveLength(4);
      });
    });

    describe('Updating Reminders', () => {
      beforeEach(() => {
        manager.addMultiple(sampleReminders);
      });

      test('should update existing reminder', () => {
        const reminder = manager.getAll()[0];
        const updates = { title: 'Updated title', priority: 'low' };
        
        const updated = manager.update(reminder.id, updates);
        
        expect(updated.title).toBe('Updated title');
        expect(updated.priority).toBe('low');
        expect(updated.id).toBe(reminder.id);
      });

      test('should return null for non-existent ID', () => {
        const updated = manager.update('non-existent', { title: 'New title' });
        expect(updated).toBeNull();
      });

      test('should validate updates', () => {
        const reminder = manager.getAll()[0];
        
        expect(() => manager.update(reminder.id, { title: '' }))
          .toThrow('Title is required');
        expect(() => manager.update(reminder.id, { priority: 'invalid' }))
          .toThrow('Invalid priority level');
      });

      test('should auto-save after updating', () => {
        const reminder = manager.getAll()[0];
        manager.update(reminder.id, { title: 'Updated' });
        
        const stored = JSON.parse(localStorage.getItem('reminders'));
        const updatedStored = stored.find(r => r.id === reminder.id);
        expect(updatedStored.title).toBe('Updated');
      });
    });

    describe('Retrieval Methods', () => {
      beforeEach(() => {
        manager.addMultiple(sampleReminders);
      });

      test('should get all reminders', () => {
        const all = manager.getAll();
        expect(all).toHaveLength(5);
        all.forEach(r => expect(r).toBeInstanceOf(Reminder));
      });

      test('should get reminder by ID', () => {
        const reminder = manager.getAll()[0];
        const found = manager.getById(reminder.id);
        
        expect(found).toEqual(reminder);
      });

      test('should return null for non-existent ID', () => {
        const found = manager.getById('non-existent');
        expect(found).toBeNull();
      });

      test('should get active reminders', () => {
        const active = manager.getActive();
        
        expect(active).toHaveLength(4);
        active.forEach(r => expect(r.isCompleted).toBe(false));
      });

      test('should get completed reminders', () => {
        const completed = manager.getCompleted();
        
        expect(completed).toHaveLength(1);
        completed.forEach(r => expect(r.isCompleted).toBe(true));
      });

      test('should get overdue reminders', () => {
        const overdue = manager.getOverdue();
        
        expect(overdue).toHaveLength(1);
        expect(overdue[0].title).toBe('Overdue task');
      });

      test('should get upcoming reminders', () => {
        const upcoming = manager.getUpcoming(1000);
        
        expect(upcoming.length).toBe(2);
        upcoming.forEach(r => {
          expect(r.dueDate).not.toBeNull();
          expect(r.isOverdue()).toBe(false);
        });
      });
    });

    describe('Filtering and Search', () => {
      beforeEach(() => {
        manager.addMultiple(sampleReminders);
      });

      test('should get reminders by category', () => {
        const personal = manager.getByCategory('personal');
        const work = manager.getByCategory('work');
        
        expect(personal).toHaveLength(2);
        expect(work).toHaveLength(2);
        personal.forEach(r => expect(r.category).toBe('personal'));
        work.forEach(r => expect(r.category).toBe('work'));
      });

      test('should get reminders by priority', () => {
        const high = manager.getByPriority('high');
        const medium = manager.getByPriority('medium');
        const low = manager.getByPriority('low');
        
        expect(high).toHaveLength(3);
        expect(medium).toHaveLength(1);
        expect(low).toHaveLength(1);
      });

      test('should search reminders by text', () => {
        const meetingResults = manager.search('meeting');
        const groceryResults = manager.search('groceries');
        const emptyResults = manager.search('nonexistent');
        
        expect(meetingResults).toHaveLength(1);
        expect(meetingResults[0].title).toContain('meeting');
        expect(groceryResults).toHaveLength(1);
        expect(emptyResults).toHaveLength(0);
      });

      test('should search in title and description', () => {
        const syncResults = manager.search('sync');
        const milkResults = manager.search('milk');
        
        expect(syncResults).toHaveLength(1);
        expect(milkResults).toHaveLength(1);
      });

      test('should perform case-insensitive search', () => {
        const upperResults = manager.search('MEETING');
        const lowerResults = manager.search('meeting');
        
        expect(upperResults).toEqual(lowerResults);
      });
    });

    describe('Sorting', () => {
      beforeEach(() => {
        manager.addMultiple(sampleReminders);
      });

      test('should sort by title', () => {
        const sorted = manager.sortBy('title');
        const titles = sorted.map(r => r.title);
        
        expect(titles).toEqual([...titles].sort());
      });

      test('should sort by due date', () => {
        const sorted = manager.sortBy('dueDate');
        
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].dueDate && sorted[i + 1].dueDate) {
            expect(Temporal.PlainDateTime.compare(sorted[i].dueDate, sorted[i + 1].dueDate))
              .toBeLessThanOrEqual(0);
          }
        }
      });

      test('should sort by priority', () => {
        const sorted = manager.sortBy('priority');
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(priorityOrder[sorted[i].priority])
            .toBeGreaterThanOrEqual(priorityOrder[sorted[i + 1].priority]);
        }
      });

      test('should sort in descending order', () => {
        const sorted = manager.sortBy('title', 'desc');
        const titles = sorted.map(r => r.title);
        
        expect(titles).toEqual([...titles].sort().reverse());
      });
    });

    describe('Storage Persistence', () => {
      test('should save to localStorage', () => {
        manager.addMultiple(sampleReminders);
        manager.save();
        
        const stored = JSON.parse(localStorage.getItem('reminders'));
        expect(stored).toHaveLength(5);
      });

      test('should load from localStorage', () => {
        const testData = sampleReminders.map(r => r.toJSON());
        localStorage.setItem('reminders', JSON.stringify(testData));
        
        manager.load();
        expect(manager.count()).toBe(5);
      });

      test('should handle corrupted storage data', () => {
        localStorage.setItem('reminders', 'invalid json');
        
        expect(() => manager.load()).not.toThrow();
        expect(manager.count()).toBe(0);
      });

      test('should handle missing storage data', () => {
        expect(() => manager.load()).not.toThrow();
        expect(manager.count()).toBe(0);
      });

      test('should export reminders as JSON', () => {
        manager.addMultiple(sampleReminders);
        const exported = manager.export();
        
        expect(typeof exported).toBe('string');
        const parsed = JSON.parse(exported);
        expect(parsed).toHaveLength(5);
      });

      test('should import reminders from JSON', () => {
        const testData = sampleReminders.map(r => r.toJSON());
        const jsonData = JSON.stringify(testData);
        
        const imported = manager.import(jsonData);
        expect(imported).toBe(5);
        expect(manager.count()).toBe(5);
      });
    });

    describe('Statistics and Utilities', () => {
      beforeEach(() => {
        manager.addMultiple(sampleReminders);
      });

      test('should count all reminders', () => {
        expect(manager.count()).toBe(5);
      });

      test('should count active reminders', () => {
        expect(manager.countActive()).toBe(4);
      });

      test('should count completed reminders', () => {
        expect(manager.countCompleted()).toBe(1);
      });

      test('should count overdue reminders', () => {
        expect(manager.countOverdue()).toBe(1);
      });

      test('should count by category', () => {
        const counts = manager.countByCategory();
        
        expect(counts.personal).toBe(2);
        expect(counts.work).toBe(2);
        expect(counts.health).toBe(1);
      });

      test('should count by priority', () => {
        const counts = manager.countByPriority();
        
        expect(counts.high).toBe(3);
        expect(counts.medium).toBe(1);
        expect(counts.low).toBe(1);
      });

      test('should get statistics summary', () => {
        const stats = manager.getStatistics();
        
        expect(stats.total).toBe(5);
        expect(stats.active).toBe(4);
        expect(stats.completed).toBe(1);
        expect(stats.overdue).toBe(1);
        expect(stats.byCategory).toBeDefined();
        expect(stats.byPriority).toBeDefined();
      });
    });
  });

});