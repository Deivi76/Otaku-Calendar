export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  resetTimeout: number;
}

interface CircuitBreakerState {
  failures: number;
  successes: number;
  state: CircuitState;
  nextAttempt: number;
}

export class CircuitBreaker {
  private circuits: Map<string, CircuitBreakerState> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      resetTimeout: config.resetTimeout ?? 30000,
    };
  }

  async execute<T>(source: string, fn: () => Promise<T>): Promise<T> {
    const state = this.getState(source);
    
    if (state.state === CircuitState.OPEN) {
      if (Date.now() < state.nextAttempt) {
        throw new Error(`[CircuitBreaker] ${source}: Circuit is OPEN, rejecting request`);
      }
      state.state = CircuitState.HALF_OPEN;
      state.successes = 0;
    }

    try {
      const result = await fn();
      this.onSuccess(source);
      return result;
    } catch (error) {
      this.onFailure(source);
      throw error;
    }
  }

  private getState(source: string): CircuitBreakerState {
    if (!this.circuits.has(source)) {
      this.circuits.set(source, {
        failures: 0,
        successes: 0,
        state: CircuitState.CLOSED,
        nextAttempt: 0,
      });
    }
    return this.circuits.get(source)!;
  }

  private onSuccess(source: string): void {
    const state = this.getState(source);
    
    if (state.state === CircuitState.HALF_OPEN) {
      state.successes++;
      if (state.successes >= this.config.successThreshold) {
        console.log(`[CircuitBreaker] ${source}: Circuit CLOSED (recovered)`);
        state.state = CircuitState.CLOSED;
        state.failures = 0;
        state.successes = 0;
      }
    } else {
      state.failures = 0;
    }
  }

  private onFailure(source: string): void {
    const state = this.getState(source);
    state.failures++;

    if (state.state === CircuitState.HALF_OPEN) {
      console.log(`[CircuitBreaker] ${source}: Circuit OPENED (half-open test failed)`);
      state.state = CircuitState.OPEN;
      state.nextAttempt = Date.now() + this.config.resetTimeout;
    } else if (state.failures >= this.config.failureThreshold) {
      console.log(`[CircuitBreaker] ${source}: Circuit OPENED (${state.failures} failures)`);
      state.state = CircuitState.OPEN;
      state.nextAttempt = Date.now() + this.config.resetTimeout;
    }
  }

  getCircuitState(source: string): CircuitState {
    return this.getState(source).state;
  }

  reset(source: string): void {
    this.circuits.delete(source);
  }

  resetAll(): void {
    this.circuits.clear();
  }
}

export const circuitBreaker = new CircuitBreaker();
