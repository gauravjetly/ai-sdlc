/**
 * CronSchedule Value Object
 *
 * Encapsulates a cron expression with validation, human-readable description,
 * and next-run-time calculation.
 */

import cron from 'node-cron';

const CRON_PRESETS: Record<string, string> = {
  'every-minute': '* * * * *',
  'every-5-minutes': '*/5 * * * *',
  'every-15-minutes': '*/15 * * * *',
  'every-hour': '0 * * * *',
  'every-day-2am': '0 2 * * *',
  'every-day-midnight': '0 0 * * *',
  'every-monday-2am': '0 2 * * 1',
  'every-weekday-9am': '0 9 * * 1-5',
  'first-of-month': '0 0 1 * *',
};

export class CronSchedule {
  private readonly _expression: string;

  private constructor(expression: string) {
    this._expression = expression;
  }

  /**
   * Create a CronSchedule from a cron expression
   */
  static create(expression: string): CronSchedule {
    // Check if it is a preset name
    const resolvedExpression = CRON_PRESETS[expression] || expression;

    if (!cron.validate(resolvedExpression)) {
      throw new Error(`Invalid cron expression: "${expression}"`);
    }

    return new CronSchedule(resolvedExpression);
  }

  /**
   * Create a CronSchedule from a preset name
   */
  static fromPreset(presetName: string): CronSchedule {
    const expression = CRON_PRESETS[presetName];
    if (!expression) {
      throw new Error(`Unknown cron preset: "${presetName}". Available: ${Object.keys(CRON_PRESETS).join(', ')}`);
    }
    return new CronSchedule(expression);
  }

  /**
   * List available presets
   */
  static getPresets(): Record<string, string> {
    return { ...CRON_PRESETS };
  }

  get expression(): string {
    return this._expression;
  }

  /**
   * Calculate the next run time from now
   */
  getNextRunTime(from?: Date): Date {
    const baseDate = from || new Date();
    const parts = this._expression.split(' ');

    // Parse cron parts
    const [minutePart, hourPart, dayOfMonthPart, monthPart, dayOfWeekPart] = parts;

    // Simple next-run calculation
    // For production use, a library like cron-parser would be more appropriate
    const next = new Date(baseDate);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Advance by 1 minute to get next occurrence
    next.setMinutes(next.getMinutes() + 1);

    // Try up to 525600 iterations (1 year of minutes)
    for (let i = 0; i < 525600; i++) {
      if (this.matchesCron(next, minutePart, hourPart, dayOfMonthPart, monthPart, dayOfWeekPart)) {
        return next;
      }
      next.setMinutes(next.getMinutes() + 1);
    }

    // Fallback: return 1 day from now
    const fallback = new Date(baseDate);
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }

  /**
   * Get the next N run times
   */
  getNextRunTimes(count: number, from?: Date): Date[] {
    const times: Date[] = [];
    let current = from || new Date();

    for (let i = 0; i < count; i++) {
      const next = this.getNextRunTime(current);
      times.push(next);
      current = next;
    }

    return times;
  }

  /**
   * Get a human-readable description of the cron expression
   */
  toHumanReadable(): string {
    const parts = this._expression.split(' ');
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Common patterns
    if (this._expression === '* * * * *') return 'Every minute';
    if (minute.startsWith('*/') && hour === '*') {
      return `Every ${minute.slice(2)} minutes`;
    }
    if (hour.startsWith('*/') && minute === '0') {
      return `Every ${hour.slice(2)} hours`;
    }
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `Daily at ${this.formatTime(hour, minute)}`;
    }
    if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
      return `Every ${this.formatDayOfWeek(dayOfWeek)} at ${this.formatTime(hour, minute)}`;
    }
    if (dayOfMonth !== '*' && month === '*') {
      return `Monthly on day ${dayOfMonth} at ${this.formatTime(hour, minute)}`;
    }

    return `Cron: ${this._expression}`;
  }

  /**
   * Check if a date matches the cron expression
   */
  private matchesCron(
    date: Date,
    minutePart: string,
    hourPart: string,
    dayOfMonthPart: string,
    monthPart: string,
    dayOfWeekPart: string,
  ): boolean {
    return (
      this.matchesPart(date.getMinutes(), minutePart, 0, 59) &&
      this.matchesPart(date.getHours(), hourPart, 0, 23) &&
      this.matchesPart(date.getDate(), dayOfMonthPart, 1, 31) &&
      this.matchesPart(date.getMonth() + 1, monthPart, 1, 12) &&
      this.matchesPart(date.getDay(), dayOfWeekPart, 0, 7)
    );
  }

  private matchesPart(value: number, part: string, min: number, max: number): boolean {
    if (part === '*') return true;

    // Handle step values (*/5, 1-10/2)
    if (part.includes('/')) {
      const [range, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);
      if (range === '*') {
        return value % step === 0;
      }
    }

    // Handle ranges (1-5)
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      return value >= start && value <= end;
    }

    // Handle lists (1,3,5)
    if (part.includes(',')) {
      return part.split(',').some(p => parseInt(p, 10) === value);
    }

    // Direct match
    return parseInt(part, 10) === value;
  }

  private formatTime(hour: string, minute: string): string {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  private formatDayOfWeek(part: string): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= 0 && num <= 7) {
      return days[num === 7 ? 0 : num];
    }
    return part;
  }

  equals(other: CronSchedule): boolean {
    return this._expression === other._expression;
  }

  toString(): string {
    return this._expression;
  }
}
