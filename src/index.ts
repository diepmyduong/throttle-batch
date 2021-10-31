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
