import { EventEmitter } from 'events';

export type TaskPriority = 1 | 2 | 3 | 4;

export type TaskType = 'api' | 'rss' | 'site' | 'social' | 'rumor';

export interface CrawledItem {
  id?: string;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  date?: Date;
  source?: string;
}

export interface CrawlerTask {
  id: string;
  source: string;
  type: TaskType;
  priority: TaskPriority;
  execute: () => Promise<CrawledItem[]>;
}

export interface WorkerStatus {
  activeWorkers: number;
  idleWorkers: number;
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalProcessed: number;
}

export class PriorityQueue {
  private queues: Map<TaskPriority, CrawlerTask[]>;

  constructor() {
    this.queues = new Map();
    for (let p = 1; p <= 4; p++) {
      this.queues.set(p as TaskPriority, []);
    }
  }

  enqueue(task: CrawlerTask): void {
    const queue = this.queues.get(task.priority);
    if (!queue) return;
    queue.push(task);
  }

  dequeue(): CrawlerTask | undefined {
    for (let p = 1; p <= 4; p++) {
      const queue = this.queues.get(p as TaskPriority);
      if (queue && queue.length > 0) {
        return queue.shift();
      }
    }
    return undefined;
  }

  size(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  peek(): CrawlerTask | undefined {
    for (let p = 1; p <= 4; p++) {
      const queue = this.queues.get(p as TaskPriority);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }
    return undefined;
  }

  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
  }
}

interface WorkerMetrics {
  completed: number;
  failed: number;
  startedAt: number;
}

interface Worker {
  id: number;
  busy: boolean;
  metrics: WorkerMetrics;
}

export class WorkerPool {
  private workerCount: number;
  private queue: PriorityQueue;
  private workers: Worker[];
  private results: CrawledItem[];
  private errors: Map<string, Error>;
  private eventEmitter: EventEmitter;
  private running: boolean;

  constructor(workerCount: number = 4) {
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

  addTask(task: CrawlerTask): void {
    this.queue.enqueue(task);
  }

  addTaskBatch(tasks: CrawlerTask[]): void {
    for (const task of tasks) {
      this.queue.enqueue(task);
    }
  }

  async run(): Promise<CrawledItem[]> {
    if (this.running) {
      throw new Error('WorkerPool is already running');
    }

    this.running = true;
    this.results = [];
    this.errors.clear();

    const workerPromises: Promise<void>[] = [];

    for (let i = 0; i < this.workerCount; i++) {
      workerPromises.push(this.workerLoop(i));
    }

    await Promise.all(workerPromises);
    this.running = false;

    return this.results;
  }

  private async workerLoop(workerId: number): Promise<void> {
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
      } catch (error) {
        const err = error as Error;
        this.errors.set(task.id, err);
        worker.metrics.failed++;
        this.eventEmitter.emit('task:error', { workerId, task, error: err });
      } finally {
        worker.busy = false;
      }
    }
  }

  private hasActiveWorkers(): boolean {
    return this.workers.some(w => w.busy);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): WorkerStatus {
    let activeWorkers = 0;
    let idleWorkers = 0;

    for (const worker of this.workers) {
      if (worker.busy) {
        activeWorkers++;
      } else {
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

  on(event: 'task:start' | 'task:complete' | 'task:error', listener: (data: unknown) => void): void {
    this.eventEmitter.on(event, listener);
  }

  getErrors(): Map<string, Error> {
    return new Map(this.errors);
  }
}

export function createCrawlerTask(
  id: string,
  source: string,
  type: TaskType,
  execute: () => Promise<CrawledItem[]>
): CrawlerTask {
  const priority = getPriorityForType(type);
  return {
    id,
    source,
    type,
    priority,
    execute,
  };
}

export function getPriorityForType(type: TaskType): TaskPriority {
  const priorityMap: Record<TaskType, TaskPriority> = {
    api: 1,
    rss: 2,
    site: 2,
    social: 3,
    rumor: 4,
  };
  return priorityMap[type];
}

export function isReliableSource(source: string): boolean {
  const reliableSources = ['anilist', 'jikan', 'kitsu', 'mangadex'];
  return reliableSources.some(s => source.toLowerCase().includes(s));
}

export function isNewsSource(source: string): boolean {
  const newsSources = ['ann', 'mal', 'myanimelist', 'anime news network'];
  return newsSources.some(s => source.toLowerCase().includes(s));
}

export function isSocialSource(source: string): boolean {
  const socialSources = ['twitter', 'reddit', 'x.com', 'instagram', 'youtube'];
  return socialSources.some(s => source.toLowerCase().includes(s));
}
