import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../plan-walk.mjs', import.meta.url));

function rgbaRows(png) {
  assert.equal(png.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png[24],8); // 8-bit
  assert.equal(png[25],6); // RGBA
  assert.equal(png[28],0); // non-interlaced
  const w=png.readUInt32BE(16), h=png.readUInt32BE(20);
  const idat = [];
  for (let off=8; off+12<=png.length;) {
    const size=png.readUInt32BE(off);
    if (png.toString('ascii',off+4,off+8)==='IDAT') idat.push(png.subarray(off+8,off+8+size));
    off+=12+size;
  }
  const data=inflateSync(Buffer.concat(idat));
  const out=[], stride=w*4;
  const paeth=(a,b,c)=>{
    const p=a+b-c, ap=Math.abs(p-a), bp=Math.abs(p-b), cp=Math.abs(p-c);
    return ap<=bp&&ap<=cp?a:bp<=cp?b:c;
  };
  let off=0;
  for (let y=0; y<h; y++) {
    const type=data[off++];
    const row=Buffer.alloc(stride), prev=out[y-1];
    for (let x=0; x<stride; x++) {
      const a=x>=4?row[x-4]:0,b=prev?.[x]??0,c=x>=4?(prev?.[x-4]??0):0;
      const bias=type===0?0:type===1?a:type===2?b:type===3?Math.floor((a+b)/2):paeth(a,b,c);
      row[x]=(data[off++]+bias)&255;
    }
    out.push(row);
  }
  return out;
}

test('offline native bilingual PNG has five distinct Chinese title glyphs without any system fonts', {timeout: 8_000}, async () => {
  const { stdout:png } = await exec(process.execPath,[cli,'--demo','--choices','--minutes','30','--lang','bilingual','--png'], {
    encoding:'buffer',maxBuffer:1024*1024,env:{...process.env,WAITWALK_NO_SYSTEM_FONTS:'1'},
  });
  const rows=rgbaRows(png);
  // Title text 散步寻宝图 (x=350 at 800 SVG units, rasterized to 1000px).
  // Signature/size alone would pass with missing glyphs or a repeated tofu box.
  const dark=(x,y)=>Math.max(...rows[y].subarray(4*x,4*x+3))<140;
  const runs=[];
  let from=null;
  for(let x=432;x<=581;x++){
    const ink=Array.from({length:29},(_,i)=>dark(x,36+i)).some(Boolean);
    if(ink && from===null) from=x;
    if(!ink && from!==null){runs.push([from,x]);from=null;}
  }
  assert.equal(runs.length,5);
  const shapes=runs.map(([x0,x1])=>Array.from({length:29},(_,i)=>{
    let line='';
    for(let x=x0;x<x1;x++)line+=dark(x,36+i)?'1':'0';
    return line;
  }).join('/'));
  assert.equal(new Set(shapes).size,5);
  assert.ok(shapes.every(s=>(s.match(/1/g)||[]).length>100));
});
