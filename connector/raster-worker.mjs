import { parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { renderMap } from '../site/render.mjs';

const { plan, mapWays } = workerData;
const ways = mapWays ?? (plan.demo ? (await import('../site/data.mjs')).demoGraph().mapWays : []);
let svg = renderMap(plan, ways);
const font = { loadSystemFonts: process.env.WAITWALK_NO_SYSTEM_FONTS !== '1' };
if (plan.lang === 'bilingual') {
  font.fontFiles = [fileURLToPath(new URL('./fonts/WaitWalkCJK-Regular.ttf', import.meta.url))];
  const before = svg;
  svg = svg.replaceAll('Noto Sans CJK SC,', 'WaitWalk CJK, Noto Sans CJK SC,');
  if (before === svg) {
    // Keep text drawn if the renderer uses a different naming stack.
    font.defaultFontFamily = 'WaitWalk CJK';
  }
}
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1000 }, font }).render().asPng();
if (png.length > 1_048_576) throw new Error('Map exceeds limit.');
parentPort.postMessage(png);
