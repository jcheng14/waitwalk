import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer, request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const serverPath = fileURLToPath(new URL('./mcp.mjs', import.meta.url));
const env = { WAITWALK_SITE_URL: 'https://walk.example.org/demo/', PATH: process.env.PATH };
const newClient = () => new Client({ name: 'waitwalk-e2e', version: '0.1.0' });

test('SDK stdio browser link needs opt-in for coordinates; returns budget-only link otherwise', async t => {
  const c = newClient();
  await c.connect(new StdioClientTransport({ command: process.execPath, args: [serverPath], env }));
  t.after(() => c.close());
  const { tools } = await c.listTools();
  assert.deepEqual(tools.map(x => x.name).sort(), ['plan_walk', 'prepare_walk_link']);
  assert.ok(tools.every(x => x.annotations?.readOnlyHint));
  let result = await c.callTool({ name: 'prepare_walk_link', arguments: { minutes: 45, interest: 'photo' } });
  assert.equal(result.structuredContent.url, 'https://walk.example.org/demo/?minutes=45&interest=photo');
  result = await c.callTool({ name: 'prepare_walk_link', arguments: { minutes: 45, lat: 1, lon: 2 } });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /permission/);
  result = await c.callTool({ name: 'prepare_walk_link', arguments: { minutes: 45, lat: 1, lon: 2, label: 'A & B', acknowledge_link_location: true } });
  const u = new URL(result.structuredContent.url);
  assert.equal(u.searchParams.get('lat'), '1');
  assert.equal(u.searchParams.get('lon'), '2');
  assert.equal(u.searchParams.get('label'), 'A & B');
});

test('SDK stdio returns fixture walks inside budget and rejects live without consent', async t => {
  const c = newClient();
  await c.connect(new StdioClientTransport({ command: process.execPath, args: [serverPath], env }));
  t.after(() => c.close());
  const demo = await c.callTool({ name: 'plan_walk', arguments: { mode: 'demo', minutes: 45 } });
  assert.equal(demo.structuredContent.mode, 'demo');
  assert.equal(demo.structuredContent.plan.demo, true);
  assert.equal(demo.structuredContent.plan.minutes, 30);
  assert.deepEqual(demo.structuredContent.caps, [30,60]);
  assert.equal(demo.structuredContent.highlighted_minutes,30);
  assert.equal(demo.structuredContent.plan.choices,true);
  assert.deepEqual(demo.structuredContent.plan.options.map(x => x.cap),[30,60]);
  assert.ok(demo.structuredContent.plan.options.every(x => x.total <= x.cap && x.out >= 0 && x.back >= 0));
  assert.equal(demo.content.filter(x => x.type === 'image').length,1);
  const map = demo.content.find(x => x.type === 'image');
  assert.equal(map?.mimeType, 'image/png');
  assert.deepEqual([...Buffer.from(map.data, 'base64').subarray(0,8)], [137,80,78,71,13,10,26,10]);
  const tooShort = await c.callTool({ name: "plan_walk", arguments: { mode: "demo", minutes: 20 } });
  assert.equal(tooShort.structuredContent.highlighted_minutes, null);
  assert.deepEqual(tooShort.structuredContent.caps, [30,60]);
  const blocked = await c.callTool({ name: 'plan_walk', arguments: { mode: 'live', lat: 1, lon: 2, minutes: 45 } });
  assert.equal(blocked.isError, true);
  assert.match(blocked.content[0].text, /explicit permission/);
  const invalid = await c.callTool({ name: 'plan_walk', arguments: { mode: 'live', lat: 91, lon: 0, acknowledge_location_sharing: true } });
  assert.equal(invalid.isError, true);
});

test('SDK Streamable HTTP uses authenticated loopback, declines malicious origins, and returns a link', { timeout: 15_000 }, async t => {
  const token = 'test_token_xxxxxxxxxxxxxxxxxxxxxxxx';
  const child = execFile(process.execPath, [serverPath, '--http'], {
    env: {...process.env, ...env, WAITWALK_MCP_TOKEN: token, WAITWALK_MCP_PORT: '0'},
  });
  const exited = once(child, 'exit');
  t.after(async () => { child.kill(); await exited; });
  const [chunk] = await once(child.stderr, 'data');
  const url = new URL(/http:\/\/127\.0\.0\.1:\d+\/mcp/.exec(chunk.toString())?.[0]);
  const fetchPost = headers => fetch(url, { method: 'POST', headers: {'content-type':'application/json', ...headers}, body:'{}' });
  assert.equal((await fetchPost({})).status, 401);
  assert.equal((await fetchPost({ 'authorization': 'Bearer ' + token, origin: 'https://incorrect.example' })).status, 403);
  const hostStatus = await new Promise((resolve,reject) => {
    const r = request(url, { method: 'POST', headers: {'host':'unexpected.example','authorization': 'Bearer ' + token, 'content-type':'application/json'} }, res => {
      res.resume();
      resolve(res.statusCode);
    });
    r.once('error', reject);
    r.end('{}');
  });
  assert.equal(hostStatus,403);
  assert.equal((await fetch(url, { method: 'POST', headers: {'content-type':'application/json','authorization':'Bearer '+token}, body:'"'+ 'x'.repeat(17_000) +'"' })).status,413);
  const c = newClient();
  const transport = new StreamableHTTPClientTransport(url, { requestInit: { headers: { 'authorization': 'Bearer ' + token } } });
  try {
    await c.connect(transport);
    assert.equal((await c.listTools()).tools.length, 2);
    const res = await c.callTool({name:'prepare_walk_link',arguments:{minutes:15}});
    assert.equal(res.structuredContent.url, 'https://walk.example.org/demo/?minutes=15');
  } finally {
    await c.close();
  }
});

test('SDK stdio live uses opt-in and sends negative longitude only to the configured provider', async t => {
  let query = '';
  let hits = 0;
  const lat = 47.6, lon = -122.3;
  const provider = createServer(async (req,res) => {
    hits++;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    query = new URLSearchParams(Buffer.concat(chunks).toString()).get('data') ?? '';
    res.end(JSON.stringify({elements: [
      {type:'node', id:10, lat, lon},
      {type:'node', id:11, lat:lat+.001, lon, tags:{amenity:'cafe',name:'Test Coffee'}},
      {type:'node', id:12, lat:lat+.001, lon:lon+.001},
      {type:'node', id:13, lat, lon:lon+.001},
      {type:'way', id:20, nodes:[10,11,12,13,10], tags:{highway:'footway'}},
    ]}));
  });
  await once(provider.listen(0,'127.0.0.1'), 'listening');
  t.after(() => provider.close());
  const c = newClient();
  await c.connect(new StdioClientTransport({ command: process.execPath, args:[serverPath],
    env:{ ...env, WAITWALK_OVERPASS_URL: `http://127.0.0.1:${provider.address().port}/api` } }));
  t.after(() => c.close());
  const args = { mode:'live', lat, lon, minutes:45 };
  assert.ok((await c.callTool({name:'plan_walk',arguments:args})).isError);
  assert.equal(hits,0);
  const live = await c.callTool({name:'plan_walk',arguments:{...args,acknowledge_location_sharing:true}});
  assert.equal(hits,1);
  assert.match(query,/47\.60000,-122\.30000/);
  assert.equal(live.structuredContent.plan.demo,false);
  assert.deepEqual(live.structuredContent.plan.origin,[lat,lon]);
});
