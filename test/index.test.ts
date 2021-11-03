import { BatchAsync } from '../src';

const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms * 1000));

// test('Batch', async () => {
//   const fn = throttleBatch(console.log, {
//     threshold: 1000,
//     batchSize: 2,
//   });

//   fn(1);
//   fn(2);
//   fn(3);

//   setTimeout(() => {
//     fn(4);
//     fn(5);
//     fn(6);
//   }, 1100);
//   setTimeout(() => {
//     fn(7);
//     fn(8);
//     fn(9);
//   }, 2200);
//   await sleep(10);
// }, 10000);

test('Bathc Async', async () => {
  const batchAsync = new BatchAsync(async (items: string[]) => {
    console.log(items);
    await sleep(0.1);
  }, 20);

  for (var i = 0; i < 500; i++) {
    batchAsync.feed(i.toString());
  }

  await sleep(0.2);
  for (var i = 10; i < 20; i++) {
    batchAsync.feed(i.toString());
  }
  await sleep(2);
  for (var i = 20; i < 30; i++) {
    batchAsync.feed(i.toString());
  }
  batchAsync.complete();
  console.log('set complete');
  batchAsync.on('completed', () => {
    console.log('complete');
  });
  await sleep(20);
}, 30000);
