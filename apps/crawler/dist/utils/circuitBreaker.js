export var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half-open";
})(CircuitState || (CircuitState = {}));
export class CircuitBreaker {
    circuits = new Map();
    config;
    constructor(config = {}) {
        this.config = {
            failureThreshold: config.failureThreshold ?? 5,
            successThreshold: config.successThreshold ?? 2,
            resetTimeout: config.resetTimeout ?? 30000,
        };
    }
    async execute(source, fn) {
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
        }
        catch (error) {
            this.onFailure(source);
            throw error;
        }
    }
    getState(source) {
        if (!this.circuits.has(source)) {
            this.circuits.set(source, {
                failures: 0,
                successes: 0,
                state: CircuitState.CLOSED,
                nextAttempt: 0,
            });
        }
        return this.circuits.get(source);
    }
    onSuccess(source) {
        const state = this.getState(source);
        if (state.state === CircuitState.HALF_OPEN) {
            state.successes++;
            if (state.successes >= this.config.successThreshold) {
                console.log(`[CircuitBreaker] ${source}: Circuit CLOSED (recovered)`);
                state.state = CircuitState.CLOSED;
                state.failures = 0;
                state.successes = 0;
            }
        }
        else {
            state.failures = 0;
        }
    }
    onFailure(source) {
        const state = this.getState(source);
        state.failures++;
        if (state.state === CircuitState.HALF_OPEN) {
            console.log(`[CircuitBreaker] ${source}: Circuit OPENED (half-open test failed)`);
            state.state = CircuitState.OPEN;
            state.nextAttempt = Date.now() + this.config.resetTimeout;
        }
        else if (state.failures >= this.config.failureThreshold) {
            console.log(`[CircuitBreaker] ${source}: Circuit OPENED (${state.failures} failures)`);
            state.state = CircuitState.OPEN;
            state.nextAttempt = Date.now() + this.config.resetTimeout;
        }
    }
    getCircuitState(source) {
        return this.getState(source).state;
    }
    reset(source) {
        this.circuits.delete(source);
    }
    resetAll() {
        this.circuits.clear();
    }
}
export const circuitBreaker = new CircuitBreaker();
