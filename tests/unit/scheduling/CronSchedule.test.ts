/**
 * Unit Tests for CronSchedule Value Object
 */

import { CronSchedule } from '../../../src/platform/scheduling/domain/value-objects/CronSchedule';

describe('CronSchedule', () => {
  describe('create', () => {
    it('should create from valid cron expression', () => {
      const schedule = CronSchedule.create('0 2 * * *');
      expect(schedule.expression).toBe('0 2 * * *');
    });

    it('should resolve preset names', () => {
      const schedule = CronSchedule.create('every-day-2am');
      expect(schedule.expression).toBe('0 2 * * *');
    });

    it('should throw for invalid cron expression', () => {
      expect(() => CronSchedule.create('invalid')).toThrow('Invalid cron expression');
    });

    it('should accept every-minute expression', () => {
      const schedule = CronSchedule.create('* * * * *');
      expect(schedule.expression).toBe('* * * * *');
    });

    it('should accept complex expressions', () => {
      const schedule = CronSchedule.create('*/15 * * * *');
      expect(schedule.expression).toBe('*/15 * * * *');
    });
  });

  describe('fromPreset', () => {
    it('should create from valid preset', () => {
      const schedule = CronSchedule.fromPreset('every-hour');
      expect(schedule.expression).toBe('0 * * * *');
    });

    it('should throw for unknown preset', () => {
      expect(() => CronSchedule.fromPreset('nonexistent')).toThrow('Unknown cron preset');
    });
  });

  describe('getPresets', () => {
    it('should return available presets', () => {
      const presets = CronSchedule.getPresets();
      expect(presets).toHaveProperty('every-minute');
      expect(presets).toHaveProperty('every-day-2am');
      expect(presets).toHaveProperty('every-monday-2am');
    });
  });

  describe('getNextRunTime', () => {
    it('should return a future date', () => {
      const schedule = CronSchedule.create('* * * * *');
      const next = schedule.getNextRunTime();
      expect(next.getTime()).toBeGreaterThan(Date.now());
    });

    it('should calculate from a specific base date', () => {
      const schedule = CronSchedule.create('0 2 * * *');
      const baseDate = new Date('2026-02-10T01:00:00');
      const next = schedule.getNextRunTime(baseDate);
      expect(next.getHours()).toBe(2);
      expect(next.getMinutes()).toBe(0);
    });
  });

  describe('getNextRunTimes', () => {
    it('should return the requested number of future times', () => {
      const schedule = CronSchedule.create('0 * * * *');
      const times = schedule.getNextRunTimes(3);
      expect(times).toHaveLength(3);

      // Each time should be after the previous
      for (let i = 1; i < times.length; i++) {
        expect(times[i].getTime()).toBeGreaterThan(times[i - 1].getTime());
      }
    });
  });

  describe('toHumanReadable', () => {
    it('should describe every-minute', () => {
      const schedule = CronSchedule.create('* * * * *');
      expect(schedule.toHumanReadable()).toBe('Every minute');
    });

    it('should describe every-N-minutes', () => {
      const schedule = CronSchedule.create('*/5 * * * *');
      expect(schedule.toHumanReadable()).toBe('Every 5 minutes');
    });

    it('should describe daily at specific time', () => {
      const schedule = CronSchedule.create('0 2 * * *');
      expect(schedule.toHumanReadable()).toContain('Daily at');
    });
  });

  describe('equals', () => {
    it('should return true for same expression', () => {
      const a = CronSchedule.create('0 2 * * *');
      const b = CronSchedule.create('0 2 * * *');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different expressions', () => {
      const a = CronSchedule.create('0 2 * * *');
      const b = CronSchedule.create('0 3 * * *');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the cron expression', () => {
      const schedule = CronSchedule.create('0 2 * * *');
      expect(schedule.toString()).toBe('0 2 * * *');
    });
  });
});
