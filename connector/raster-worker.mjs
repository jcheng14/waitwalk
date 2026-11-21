import { parentPort, workerData } from 'node:worker_threads';
import { Resvg } from '@resvg/resvg-js';
import { renderMap } from '../site/render.mjs';

const { plan, mode } = workerData;
const ways = mode === 'demo' ? (await import('../site/data.mjs')).demoGraph().mapWays : [];
const svg = renderMap(plan, ways);
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1000 } }).render().asPng();
if (png.length > 1_048_576) throw new Error('Map exceeds limit.');
parentPort.postMessage(Buffer.from(png).toString('base64'));
