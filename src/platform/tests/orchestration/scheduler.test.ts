/**
 * Scheduler Tests
 */

import { Scheduler } from '../../orchestration/engine/scheduler';

describe('Scheduler', () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    scheduler = new Scheduler();
  });

  afterEach(() => {
    if (scheduler.isRunning()) {
      scheduler.stop();
    }
  });

  describe('Job Management', () => {
    it('should add a scheduled job', () => {
      const handler = jest.fn(async () => {});

      scheduler.addJob('test-job', '* * * * *', handler);

      const jobs = scheduler.listJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe('test-job');
      expect(jobs[0].cron).toBe('* * * * *');
    });

    it('should reject invalid cron expression', () => {
      const handler = jest.fn(async () => {});

      expect(() => {
        scheduler.addJob('invalid-job', 'invalid-cron', handler);
      }).toThrow('Invalid cron expression');
    });

    it('should remove a job', () => {
      const handler = jest.fn(async () => {});

      scheduler.addJob('test-job', '* * * * *', handler);
      expect(scheduler.listJobs()).toHaveLength(1);

      scheduler.removeJob('test-job');
      expect(scheduler.listJobs()).toHaveLength(0);
    });

    it('should enable and disable jobs', () => {
      const handler = jest.fn(async () => {});

      scheduler.addJob('test-job', '* * * * *', handler);

      scheduler.disableJob('test-job');
      let job = scheduler.getJob('test-job');
      expect(job?.enabled).toBe(false);

      scheduler.enableJob('test-job');
      job = scheduler.getJob('test-job');
      expect(job?.enabled).toBe(true);
    });
  });

  describe('Scheduler Lifecycle', () => {
    it('should start and stop scheduler', () => {
      const handler = jest.fn(async () => {});

      scheduler.addJob('test-job', '* * * * *', handler);

      expect(scheduler.isRunning()).toBe(false);

      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);

      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    it('should not start if already running', () => {
      scheduler.start();
      scheduler.start(); // Should log warning

      expect(scheduler.isRunning()).toBe(true);

      scheduler.stop();
    });
  });

  describe('Execution History', () => {
    it('should record job executions', async () => {
      let executionCount = 0;
      const handler = jest.fn(async () => {
        executionCount++;
      });

      // Use a cron expression that fires every second for testing
      scheduler.addJob('test-job', '* * * * * *', handler);
      scheduler.start();

      // Wait for job to execute at least once
      await new Promise(resolve => setTimeout(resolve, 2000));

      const history = scheduler.getExecutionHistory('test-job');
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].jobName).toBe('test-job');
      expect(history[0].status).toBe('completed');

      scheduler.stop();
    }, 10000);

    it('should get job statistics', async () => {
      const handler = jest.fn(async () => {});

      scheduler.addJob('test-job', '* * * * * *', handler);
      scheduler.start();

      await new Promise(resolve => setTimeout(resolve, 2000));

      const stats = scheduler.getJobStats('test-job');
      expect(stats.totalExecutions).toBeGreaterThan(0);
      expect(stats.successfulExecutions).toBeGreaterThan(0);
      expect(stats.failedExecutions).toBe(0);

      scheduler.stop();
    }, 10000);

    it('should record failed executions', async () => {
      const handler = jest.fn(async () => {
        throw new Error('Test error');
      });

      scheduler.addJob('failing-job', '* * * * * *', handler);
      scheduler.start();

      await new Promise(resolve => setTimeout(resolve, 2000));

      const history = scheduler.getExecutionHistory('failing-job');
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].status).toBe('failed');
      expect(history[0].error).toBe('Test error');

      scheduler.stop();
    }, 10000);

    it('should clear execution history', async () => {
      const handler = jest.fn(async () => {});

      scheduler.addJob('test-job', '* * * * * *', handler);
      scheduler.start();

      await new Promise(resolve => setTimeout(resolve, 2000));

      let history = scheduler.getExecutionHistory();
      expect(history.length).toBeGreaterThan(0);

      scheduler.clearHistory();

      history = scheduler.getExecutionHistory();
      expect(history.length).toBe(0);

      scheduler.stop();
    }, 10000);
  });
});
