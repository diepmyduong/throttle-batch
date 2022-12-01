import { TypedEmitter } from 'tiny-typed-emitter';

export interface ThrottleBatchOptions<A, B> {
  threshold?: number;
  createInitialBatch?: () => B;
  addArgumentsToBatch?: (batch: B, args: A) => B;
  batchSize?: number;
}

export default function throttleBatch<A extends any[], B extends any[]>(
  f: (batch: B | undefined) => void,
  options: number | ThrottleBatchOptions<A, B> = {}
): (...args: A) => void {
  const {
    threshold = 0,
    createInitialBatch = () => [] as any,
    addArgumentsToBatch = (batch, [arg]) => [...(batch as any), arg] as B,
    batchSize = 100,
  }: ThrottleBatchOptions<A, B> =
    typeof options === 'number' ? { threshold: options } : options;

  let lastCallTime: undefined | number;
  let timeout: undefined | NodeJS.Timeout;
  let batch: undefined | B;
  let stack: B[] = [];

  return function(...args: any[]) {
    if (batch === undefined) {
      batch = createInitialBatch();
    }

    batch = addArgumentsToBatch(batch, args as any);

    if (batch && batch.length == batchSize) {
      stack.push(batch);
      batch = undefined;
    }

    const now = Date.now();
    const shouldCall =
      now - (lastCallTime ?? Number.NEGATIVE_INFINITY) > threshold;

    if (shouldCall) {
      clearTimeout(timeout!);
      callBatch();
    } else {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (batch === undefined && stack.length == 0) {
          return;
        }
        callBatch();
      }, threshold);
    }

    function callBatch() {
      lastCallTime = Date.now();
      if (stack.length > 0) {
        const batch_ = stack.shift();
        f(batch_);
        if (stack.length > 0) {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            if (batch === undefined && stack.length == 0) {
              return;
            }
            callBatch();
          }, threshold);
        }
      } else {
        const batch_ = batch;
        batch = undefined;
        f(batch_);
      }
    }
  };
}

interface BatchAsyncEvent<T> {
  completed: () => void;
  feed: (item: T) => void;
  batch: (items: T[]) => void;
  error: (error: any) => void;
}

interface BatchAsyncOptions {
  batchSize?: number;
  debound?: number;
  parallel?: number;
}

export class BatchAsync<T> extends TypedEmitter<BatchAsyncEvent<T>> {
  stack: T[][] = [];
  batch: T[] = [];
  processing = 0;
  completed = false;

  private timeout: any;

  constructor(
    batchFn: (items: T[]) => Promise<any>,
    private options: BatchAsyncOptions = {}
  ) {
    super();
    this.options = {
      batchSize: options.batchSize || 1000,
      debound: options.debound || 300,
      parallel: options.parallel || 1,
    };
    // parallet require more than 1
    if (this.options.parallel! < 1) {
      this.options.parallel = 1;
    }

    this.on('feed', data => {
      this.touch();
      this.batch.push(data);
      if (this.batch.length == this.options.batchSize) {
        this.emit('batch', this.batch);
        this.batch = [];
      }
    });
    this.on('batch', async (items: any[]) => {
      if (this.processing >= this.options.parallel!) {
        this.stack.push(items);
        return;
      }
      this.processing++;
      try {
        await batchFn(items);
      } catch (err) {
        this.emit('error', err);
      } finally {
        this.processing--;
        if (this.stack.length > 0) {
          this.emit('batch', this.stack.shift() as T[]);
        }
        // else {
        //   if (this.completed) {
        //     if (this.batch.length > 0) {
        //       this.batch = [];
        //       await batchFn(this.batch);
        //     }
        //     console.log('emit completed');
        //     this.emit('completed');
        //   }
        // }
      }
    });

    this.on('completed', () => {
      if (this.timeout) clearTimeout(this.timeout);
    });
  }

  complete() {
    this.completed = true;
    if (
      this.stack.length == 0 &&
      this.batch.length == 0 &&
      this.processing == 0
    ) {
      this.emit('completed');
    }
  }

  feed(item: T) {
    this.emit('feed', item);
  }

  private touch() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      if (this.processing < this.options.parallel! && this.batch.length > 0) {
        this.emit('batch', this.batch);
        this.batch = [];
      }
      if (
        this.processing == 0 &&
        this.batch.length == 0 &&
        this.completed &&
        this.stack.length == 0
      ) {
        this.emit('completed');
      } else {
        this.touch();
      }
    }, this.options.debound);
  }
}
