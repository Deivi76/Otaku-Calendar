import { EventEmitter } from 'events';
export class PriorityQueue {
    queues;
    constructor() {
        this.queues = new Map();
        for (let p = 1; p <= 4; p++) {
            this.queues.set(p, []);
        }
    }
    enqueue(task) {
        const queue = this.queues.get(task.priority);
        if (!queue)
            return;
        queue.push(task);
    }
    dequeue() {
        for (let p = 1; p <= 4; p++) {
            const queue = this.queues.get(p);
            if (queue && queue.length > 0) {
                return queue.shift();
            }
        }
        return undefined;
    }
    size() {
        let total = 0;
        for (const queue of this.queues.values()) {
            total += queue.length;
        }
        return total;
    }
    peek() {
        for (let p = 1; p <= 4; p++) {
            const queue = this.queues.get(p);
            if (queue && queue.length > 0) {
                return queue[0];
            }
        }
        return undefined;
    }
    clear() {
        for (const queue of this.queues.values()) {
            queue.length = 0;
        }
    }
}
export class WorkerPool {
    workerCount;
    queue;
    workers;
    results;
    errors;
    eventEmitter;
    running;
    constructor(workerCount = 4) {
        this.workerCount = workerCount;
        this.queue = new PriorityQueue();
        this.results = [];
        this.errors = new Map();
        this.eventEmitter = new EventEmitter();
        this.running = false;
        this.workers = Array.from({ length: workerCount }, (_, i) => ({
            id: i,
            busy: false,
            metrics: {
                completed: 0,
                failed: 0,
                startedAt: Date.now(),
            },
        }));
    }
    addTask(task) {
        this.queue.enqueue(task);
    }
    addTaskBatch(tasks) {
        for (const task of tasks) {
            this.queue.enqueue(task);
        }
    }
    async run() {
        if (this.running) {
            throw new Error('WorkerPool is already running');
        }
        this.running = true;
        this.results = [];
        this.errors.clear();
        const workerPromises = [];
        for (let i = 0; i < this.workerCount; i++) {
            workerPromises.push(this.workerLoop(i));
        }
        await Promise.all(workerPromises);
        this.running = false;
        return this.results;
    }
    async workerLoop(workerId) {
        const worker = this.workers[workerId];
        while (this.queue.size() > 0 || this.hasActiveWorkers()) {
            if (worker.busy) {
                await this.sleep(10);
                continue;
            }
            const task = this.queue.dequeue();
            if (!task) {
                await this.sleep(10);
                continue;
            }
            worker.busy = true;
            try {
                this.eventEmitter.emit('task:start', { workerId, task });
                const items = await task.execute();
                this.results.push(...items);
                worker.metrics.completed++;
                this.eventEmitter.emit('task:complete', { workerId, task, itemsCount: items.length });
            }
            catch (error) {
                const err = error;
                this.errors.set(task.id, err);
                worker.metrics.failed++;
                this.eventEmitter.emit('task:error', { workerId, task, error: err });
            }
            finally {
                worker.busy = false;
            }
        }
    }
    hasActiveWorkers() {
        return this.workers.some(w => w.busy);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getStatus() {
        let activeWorkers = 0;
        let idleWorkers = 0;
        for (const worker of this.workers) {
            if (worker.busy) {
                activeWorkers++;
            }
            else {
                idleWorkers++;
            }
        }
        return {
            activeWorkers,
            idleWorkers,
            pendingTasks: this.queue.size(),
            completedTasks: this.workers.reduce((sum, w) => sum + w.metrics.completed, 0),
            failedTasks: this.workers.reduce((sum, w) => sum + w.metrics.failed, 0),
            totalProcessed: this.workers.reduce((sum, w) => sum + w.metrics.completed + w.metrics.failed, 0),
        };
    }
    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }
    getErrors() {
        return new Map(this.errors);
    }
}
export function createCrawlerTask(id, source, type, execute) {
    const priority = getPriorityForType(type);
    return {
        id,
        source,
        type,
        priority,
        execute,
    };
}
export function getPriorityForType(type) {
    const priorityMap = {
        api: 1,
        rss: 2,
        site: 2,
        social: 3,
        rumor: 4,
    };
    return priorityMap[type];
}
export function isReliableSource(source) {
    const reliableSources = ['anilist', 'jikan', 'kitsu', 'mangadex'];
    return reliableSources.some(s => source.toLowerCase().includes(s));
}
export function isNewsSource(source) {
    const newsSources = ['ann', 'mal', 'myanimelist', 'anime news network'];
    return newsSources.some(s => source.toLowerCase().includes(s));
}
export function isSocialSource(source) {
    const socialSources = ['twitter', 'reddit', 'x.com', 'instagram', 'youtube'];
    return socialSources.some(s => source.toLowerCase().includes(s));
}
