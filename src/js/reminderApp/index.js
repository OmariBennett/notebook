import { Temporal } from '@js-temporal/polyfill';

export class Reminder {
  constructor(title, description = '', dueDate = null, priority = 'medium', category = 'general') {
    if (!title || title.trim() === '') {
      throw new Error('Title is required');
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      throw new Error('Invalid priority level');
    }

    this.id = this._generateId();
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
    this.priority = priority;
    this.category = category;
    this.isCompleted = false;
    this.createdAt = Temporal.Now.plainDateTimeISO();
    this.completedAt = null;
  }

  _generateId() {
    return `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isOverdue() {
    if (!this.dueDate || this.isCompleted) {
      return false;
    }
    
    const now = Temporal.Now.plainDateTimeISO();
    return Temporal.PlainDateTime.compare(this.dueDate, now) < 0;
  }

  timeUntilDue() {
    if (!this.dueDate) {
      return null;
    }

    const now = Temporal.Now.plainDateTimeISO();
    return this.dueDate.since(now);
  }

  timeUntilDueFormatted() {
    const duration = this.timeUntilDue();
    if (!duration) {
      return 'No due date';
    }

    const totalHours = duration.total('hours');
    const totalDays = Math.floor(totalHours / 24);

    if (duration.sign < 0) {
      if (totalDays < -1) {
        return `${Math.abs(totalDays)} days overdue`;
      }
      return `${Math.abs(Math.floor(totalHours))} hours overdue`;
    }

    if (totalDays >= 1) {
      return `${totalDays} days remaining`;
    }
    return `${Math.floor(totalHours)} hours remaining`;
  }

  markComplete(completed = null) {
    if (completed === null) {
      this.isCompleted = !this.isCompleted;
    } else {
      this.isCompleted = completed;
    }

    if (this.isCompleted) {
      this.completedAt = Temporal.Now.plainDateTimeISO();
    } else {
      this.completedAt = null;
    }
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      dueDate: this.dueDate ? this.dueDate.toString() : null,
      priority: this.priority,
      category: this.category,
      isCompleted: this.isCompleted,
      createdAt: this.createdAt.toString(),
      completedAt: this.completedAt ? this.completedAt.toString() : null
    };
  }

  static fromJSON(json) {
    const reminder = new Reminder(json.title, json.description, null, json.priority, json.category);
    reminder.id = json.id;
    reminder.dueDate = json.dueDate ? Temporal.PlainDateTime.from(json.dueDate) : null;
    reminder.isCompleted = json.isCompleted;
    reminder.createdAt = Temporal.PlainDateTime.from(json.createdAt);
    reminder.completedAt = json.completedAt ? Temporal.PlainDateTime.from(json.completedAt) : null;
    return reminder;
  }

  update(properties) {
    const validProperties = ['title', 'description', 'dueDate', 'priority', 'category'];
    
    for (const [key, value] of Object.entries(properties)) {
      if (validProperties.includes(key)) {
        if (key === 'title' && (!value || value.trim() === '')) {
          throw new Error('Title is required');
        }
        if (key === 'priority' && !['low', 'medium', 'high'].includes(value)) {
          throw new Error('Invalid priority level');
        }
        this[key] = value;
      }
    }
  }

  clone() {
    const cloned = new Reminder(this.title, this.description, this.dueDate, this.priority, this.category);
    cloned.isCompleted = this.isCompleted;
    cloned.createdAt = this.createdAt;
    cloned.completedAt = this.completedAt;
    return cloned;
  }
}

export class ReminderManager {
  constructor(storageKey = 'reminders') {
    this.storageKey = storageKey;
    this.reminders = [];
    this.load();
  }

  // Collection Management Methods
  add(reminderData) {
    let reminder;

    if (reminderData instanceof Reminder) {
      reminder = reminderData;
    } else if (reminderData && typeof reminderData === 'object' && reminderData.title) {
      reminder = new Reminder(
        reminderData.title,
        reminderData.description,
        reminderData.dueDate,
        reminderData.priority,
        reminderData.category
      );
    } else {
      throw new Error('Invalid reminder');
    }

    this.reminders.push(reminder);
    this.save();
    return reminder;
  }

  addMultiple(reminders) {
    const addedReminders = [];
    for (const reminderData of reminders) {
      addedReminders.push(this.add(reminderData));
    }
    return addedReminders;
  }

  remove(id) {
    const index = this.reminders.findIndex(r => r.id === id);
    if (index === -1) return null;

    const removed = this.reminders.splice(index, 1)[0];
    this.save();
    return removed;
  }

  removeCompleted() {
    const completedReminders = this.reminders.filter(r => r.isCompleted);
    this.reminders = this.reminders.filter(r => !r.isCompleted);
    this.save();
    return completedReminders.length;
  }

  clear() {
    this.reminders = [];
    this.save();
  }

  update(id, updates) {
    const reminder = this.getById(id);
    if (!reminder) return null;

    reminder.update(updates);
    this.save();
    return reminder;
  }

  // Retrieval Methods
  getAll() {
    return [...this.reminders];
  }

  getById(id) {
    return this.reminders.find(r => r.id === id) || null;
  }

  getActive() {
    return this.reminders.filter(r => !r.isCompleted);
  }

  getCompleted() {
    return this.reminders.filter(r => r.isCompleted);
  }

  getOverdue() {
    return this.reminders.filter(r => r.isOverdue());
  }

  getUpcoming(days = 7) {
    const now = Temporal.Now.plainDateTimeISO();
    const futureLimit = now.add({ days });

    return this.reminders.filter(r => {
      if (!r.dueDate || r.isCompleted) return false;
      return Temporal.PlainDateTime.compare(r.dueDate, now) >= 0 &&
             Temporal.PlainDateTime.compare(r.dueDate, futureLimit) <= 0;
    });
  }

  // Filtering Methods
  getByCategory(category) {
    return this.reminders.filter(r => r.category === category);
  }

  getByPriority(priority) {
    return this.reminders.filter(r => r.priority === priority);
  }

  search(query) {
    if (!query) return [];
    
    const searchTerm = query.toLowerCase();
    return this.reminders.filter(r => 
      r.title.toLowerCase().includes(searchTerm) ||
      r.description.toLowerCase().includes(searchTerm)
    );
  }

  // Sorting Methods
  sortBy(field, order = 'asc') {
    const sorted = [...this.reminders];
    
    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return Temporal.PlainDateTime.compare(a.dueDate, b.dueDate);
        case 'priority':
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          return bValue - aValue; // High priority first
        case 'createdAt':
          return Temporal.PlainDateTime.compare(a.createdAt, b.createdAt);
        default:
          aValue = a[field];
          bValue = b[field];
      }

      if (field === 'dueDate') return 0; // Already handled above
      if (field === 'priority') return 0; // Already handled above

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  // Storage Methods
  save() {
    try {
      const data = this.reminders.map(r => r.toJSON());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save reminders:', error);
    }
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        this.reminders = [];
        return;
      }

      const parsed = JSON.parse(data);
      this.reminders = parsed.map(item => Reminder.fromJSON(item));
    } catch (error) {
      console.error('Failed to load reminders:', error);
      this.reminders = [];
    }
  }

  export() {
    const data = this.reminders.map(r => r.toJSON());
    return JSON.stringify(data, null, 2);
  }

  import(jsonData) {
    try {
      const parsed = JSON.parse(jsonData);
      const importedReminders = parsed.map(item => Reminder.fromJSON(item));
      
      this.reminders = [...this.reminders, ...importedReminders];
      this.save();
      return importedReminders.length;
    } catch (error) {
      console.error('Failed to import reminders:', error);
      return 0;
    }
  }

  // Statistics Methods
  count() {
    return this.reminders.length;
  }

  countActive() {
    return this.getActive().length;
  }

  countCompleted() {
    return this.getCompleted().length;
  }

  countOverdue() {
    return this.getOverdue().length;
  }

  countByCategory() {
    const counts = {};
    this.reminders.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }

  countByPriority() {
    const counts = {};
    this.reminders.forEach(r => {
      counts[r.priority] = (counts[r.priority] || 0) + 1;
    });
    return counts;
  }

  getStatistics() {
    return {
      total: this.count(),
      active: this.countActive(),
      completed: this.countCompleted(),
      overdue: this.countOverdue(),
      byCategory: this.countByCategory(),
      byPriority: this.countByPriority()
    };
  }
}