import throttleBatch from '../src';

const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms * 1000));

test('Batch', async () => {
  const fn = throttleBatch(console.log, {
    threshold: 1000,
    batchSize: 2,
  });

  fn(1);
  fn(2);
  fn(3);

  setTimeout(() => {
    fn(4);
    fn(5);
    fn(6);
  }, 1100);
  setTimeout(() => {
    fn(7);
    fn(8);
    fn(9);
  }, 2200);
  await sleep(10);
}, 10000);
