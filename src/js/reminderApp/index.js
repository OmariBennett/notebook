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
  // TODO: Implement ReminderManager class
}