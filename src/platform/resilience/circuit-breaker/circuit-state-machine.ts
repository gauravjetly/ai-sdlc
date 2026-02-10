/**
 * Circuit State Machine
 * Manages state transitions for circuit breaker: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 */

import { createLogger } from '../../utils/logger.js';
import { CircuitState } from '../types.js';

const logger = createLogger('CircuitStateMachine');

/**
 * State machine for circuit breaker pattern
 */
export class CircuitStateMachine {
  private state: CircuitState;
  private stateHistory: Array<{ state: CircuitState; timestamp: number }> = [];

  constructor(initialState: CircuitState = 'CLOSED') {
    this.state = initialState;
    this.recordStateChange(initialState);

    logger.debug('Circuit state machine initialized', {
      initialState
    });
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Transition to OPEN state
   */
  open(): void {
    if (this.state === 'OPEN') {
      logger.debug('Already in OPEN state');
      return;
    }

    const previousState = this.state;
    this.state = 'OPEN';
    this.recordStateChange('OPEN');

    logger.info('State transition', {
      from: previousState,
      to: 'OPEN'
    });
  }

  /**
   * Transition to CLOSED state
   */
  close(): void {
    if (this.state === 'CLOSED') {
      logger.debug('Already in CLOSED state');
      return;
    }

    const previousState = this.state;
    this.state = 'CLOSED';
    this.recordStateChange('CLOSED');

    logger.info('State transition', {
      from: previousState,
      to: 'CLOSED'
    });
  }

  /**
   * Transition to HALF_OPEN state (attempt to recover)
   */
  attemptReset(): void {
    if (this.state !== 'OPEN') {
      logger.warn('Attempt reset called but not in OPEN state', {
        currentState: this.state
      });
      return;
    }

    this.state = 'HALF_OPEN';
    this.recordStateChange('HALF_OPEN');

    logger.info('State transition', {
      from: 'OPEN',
      to: 'HALF_OPEN'
    });
  }

  /**
   * Check if can transition to a specific state
   */
  canTransitionTo(targetState: CircuitState): boolean {
    // Valid transitions:
    // CLOSED -> OPEN
    // OPEN -> HALF_OPEN
    // HALF_OPEN -> CLOSED
    // HALF_OPEN -> OPEN

    const validTransitions: Record<CircuitState, CircuitState[]> = {
      'CLOSED': ['OPEN'],
      'OPEN': ['HALF_OPEN'],
      'HALF_OPEN': ['CLOSED', 'OPEN']
    };

    return validTransitions[this.state].includes(targetState);
  }

  /**
   * Record state change in history
   */
  private recordStateChange(state: CircuitState): void {
    this.stateHistory.push({
      state,
      timestamp: Date.now()
    });

    // Keep only last 100 state changes
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift();
    }
  }

  /**
   * Get state history
   */
  getStateHistory(): Array<{ state: CircuitState; timestamp: number }> {
    return [...this.stateHistory];
  }

  /**
   * Get time in current state (milliseconds)
   */
  getTimeInCurrentState(): number {
    const lastChange = this.stateHistory[this.stateHistory.length - 1];
    if (!lastChange) return 0;

    return Date.now() - lastChange.timestamp;
  }

  /**
   * Get state change count
   */
  getStateChangeCount(): number {
    return this.stateHistory.length - 1; // Subtract initial state
  }

  /**
   * Get time spent in each state
   */
  getStateStats(): Record<CircuitState, { count: number; totalTime: number }> {
    const stats: Record<CircuitState, { count: number; totalTime: number }> = {
      'CLOSED': { count: 0, totalTime: 0 },
      'OPEN': { count: 0, totalTime: 0 },
      'HALF_OPEN': { count: 0, totalTime: 0 }
    };

    for (let i = 0; i < this.stateHistory.length; i++) {
      const current = this.stateHistory[i];
      const next = this.stateHistory[i + 1];

      stats[current.state].count++;

      if (next) {
        const duration = next.timestamp - current.timestamp;
        stats[current.state].totalTime += duration;
      } else {
        // Current state - add time since last change
        const duration = Date.now() - current.timestamp;
        stats[current.state].totalTime += duration;
      }
    }

    return stats;
  }

  /**
   * Reset state machine
   */
  reset(): void {
    logger.info('Resetting state machine');

    this.state = 'CLOSED';
    this.stateHistory = [];
    this.recordStateChange('CLOSED');
  }

  /**
   * Get last state transition time
   */
  getLastTransitionTime(): number | undefined {
    const lastChange = this.stateHistory[this.stateHistory.length - 1];
    return lastChange?.timestamp;
  }

  /**
   * Check if state has changed recently
   */
  hasRecentStateChange(withinMilliseconds: number): boolean {
    const lastTransition = this.getLastTransitionTime();
    if (!lastTransition) return false;

    return (Date.now() - lastTransition) <= withinMilliseconds;
  }
}
