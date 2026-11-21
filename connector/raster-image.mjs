import { Worker } from 'node:worker_threads';

export function rasterize(plan, { mapWays, timeout = 3_000, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted || timeout <= 0) return reject(new Error('Map deadline passed.'));
    const worker = new Worker(new URL('./raster-worker.mjs', import.meta.url), { workerData: { plan, mapWays } });
    let finished = false;
    const finish = (error, value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      if (error) reject(error);
      else resolve(value);
      worker.unref();
      void worker.terminate().catch(() => {});
    };
    const cancel = () => finish(new Error('Map rendering cancelled.'));
    const timer = setTimeout(() => finish(new Error('Map rendering timed out.')), timeout);
    signal?.addEventListener('abort', cancel, { once: true });
    worker.once('message', (png) => finish(null, Buffer.from(png)));
    worker.once('error', (error) => finish(error));
    worker.once('exit', () => finish(new Error('Map renderer stopped.')));
  });
}
