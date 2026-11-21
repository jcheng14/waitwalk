import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { planWalk, planChoices, toGeoJSON } from './site/engine.mjs';
import { demoGraph, demoOrigin, loadGraph } from './site/data.mjs';
import { renderMap } from './site/render.mjs';

const usage = `node plan-walk.mjs --demo [--minutes 30] [--choices] [--interest any|coffee|nature|photo]
node plan-walk.mjs --live --lat LAT --lon LON [--minutes 30] [--label NAME]
Both modes accept [--lang en|bilingual] [--geojson|--svg|--png] [--output FILE].
PNG requires 'npm ci --ignore-scripts --prefix connector' once. Demo runs offline.`;

try {
  const start = performance.now();
  // Node parseArgs treats separate negative coordinates as options. Normalize them to --lon=-122.
  const args = process.argv.slice(2).reduce((a, v, i, l) => {
    if (/^-[0-9.]/.test(v) && ['--lat', '--lon'].includes(l[i - 1])) a[a.length - 1] += '=' + v;
    else a.push(v);
    return a;
  }, []);
  const { values: v } = parseArgs({ args, options: {
    demo: { type: 'boolean' }, live: { type: 'boolean' },
    lat: { type: 'string' }, lon: { type: 'string' },
    minutes: { type: 'string', default: '30' }, interest: { type: 'string', default: 'any' },
    lang: { type: 'string', default: 'en' }, label: { type: 'string' },
    geojson: { type: 'boolean' }, choices: { type: 'boolean' }, svg: { type: 'boolean' },
    png: { type: 'boolean' }, output: { type: 'string' }, help: { type: 'boolean' },
  } });
  if (v.help) {
    console.log(usage);
  } else {
    if (Boolean(v.demo) === Boolean(v.live)) throw new Error('Choose --demo or explicitly consent to the Overpass coordinate request with --live.');
    if (!v.demo && (!v.lat?.trim() || !v.lon?.trim())) throw new Error('Live planning requires --lat and --lon.');
    if (!['en', 'bilingual'].includes(v.lang)) throw new Error('Language must be en or bilingual.');
    if ([v.geojson, v.svg, v.png].filter(Boolean).length > 1) throw new Error('Choose only one format: --geojson, --svg or --png.');
    if (v.output !== undefined && !v.output.trim()) throw new Error('Provide a path for --output.');
    const minutes = Number(v.minutes), origin = v.demo ? demoOrigin : [Number(v.lat), Number(v.lon)];
    const graph = v.demo ? demoGraph() : await loadGraph(origin, v.choices ? 60 : minutes, {
      url: process.env.WAITWALK_OVERPASS_URL, signal: AbortSignal.timeout(24_000),
    });
    const plan = (v.choices ? planChoices : planWalk)(graph, {
      origin, minutes, interest: v.interest, label: v.demo ? 'Alder & Main (sample)' : String(v.label || 'Starting point').slice(0, 120),
    });
    plan.demo = Boolean(v.demo);
    plan.lang = v.lang;

    let data;
    if (v.png) {
      const { rasterize } = await import('./connector/raster-image.mjs');
      try {
        data = await rasterize(plan, { mapWays: graph.mapWays, timeout: Math.min(3_000, 28_000 - (performance.now() - start)) });
      } catch (e) {
        if (e.code === 'ERR_MODULE_NOT_FOUND') throw new Error("PNG renderer not installed. Run npm ci --ignore-scripts --prefix connector, or use --svg.");
        throw e;
      }
    } else {
      data = (v.svg ? renderMap(plan, graph.mapWays) : JSON.stringify(v.geojson ? toGeoJSON(plan) : plan)) + '\n';
    }
    if (v.output !== undefined) await writeFile(v.output, data);
    else process.stdout.write(data);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
