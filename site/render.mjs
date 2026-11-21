import {distance,choiceCaps} from './engine.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const icon={coffee:'<path d="M-8-6H4v7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zm12 1h3a3 3 0 1 1 0 6H4M-9 9H8M-5-9l1-3m4 3 1-3"/>',nature:'<path d="M0 9V1m-7 5H7L4 1h2L0-10-6 1h2z"/>',photo:'<path d="M-10-5h5l2-3h6l2 3h5v13h-20z"/><circle r="4" cy="1"/>',culture:'<path d="M0-5q-5-5-10-3v13Q-4 3 0 8q4-5 10-3V-8Q5-10 0-5zm0 0V8"/>'};
const names={coffee:'Coffee',nature:'Green space',photo:'Photo spot',culture:'Culture'};
const palette=['#22664b','#9a452b','#2b647d','#6f477f'];
const caps=choiceCaps;
const star=(x,y,s=1)=>`<path d="M0 -8 2 -2 8 0 2 2 0 8 -2 2 -8 0 -2 -2Z" transform="translate(${x} ${y}) scale(${s})" fill="#e4a542" stroke="#754229" stroke-width=".9"/>`;
export function renderMap(plan,mapWays=[],selected=-1) {
 const W=800,H=plan.choices?610:539,left=57,right=744,top=103,bottom=417,origin=plan.origin,opts=plan.options||[];
 const active=i=>plan.choices?opts[i].cap===plan.minutes:(selected===i);
 const colorFor=i=>palette[plan.choices?Math.max(0,caps.indexOf(opts[i].cap)):i];
 const all=[origin,...opts.flatMap(p=>[p.coords,...p.waypoints,...p.returnWaypoints])];
 const wrapped=lon=>((lon-origin[1]+540)%360)-180, cos=Math.max(.09,Math.cos(origin[0]*Math.PI/180));
 const project0=p=>[wrapped(p[1])*cos,p[0]-origin[0]];
 const flat=all.map(project0), x0=Math.min(...flat.map(p=>p[0])),x1=Math.max(...flat.map(p=>p[0])),y0=Math.min(...flat.map(p=>p[1])),y1=Math.max(...flat.map(p=>p[1]));
 const scale=Math.min((right-left)/Math.max(x1-x0,.0038),(bottom-top)/Math.max(y1-y0,.0038))*.75;
 const point=p=>{const [x,y]=project0(p); return [(left+right)/2+(x-(x0+x1)/2)*scale,(top+bottom)/2-(y-(y0+y1)/2)*scale];};
 const string=p=>p.map(x=>x.toFixed(1)).join(',');
 const lines=coords=>coords.map(p=>string(point(p))).join(' ');
 const ordered=[...mapWays].sort((a,b)=>Number(b.closed)-Number(a.closed));
 let drawing='';
 for(const w of ordered) {
  if(!w.coords||w.coords.length<2||w.coords.length>15000)continue;
  const cords=w.coords.map(point), xs=cords.map(p=>p[0]),ys=cords.map(p=>p[1]);
  if(Math.max(...xs)<12||Math.min(...xs)>788||Math.max(...ys)<75||Math.min(...ys)>458)continue;
  if(w.closed&&['park','water'].includes(w.kind)){
   drawing+=`<polygon points="${cords.map(string).join(' ')}" fill="${w.kind==='park'?'#c7d8ac':'#bbd9db'}" stroke="${w.kind==='park'?'#b2c59e':'#8db5ba'}" stroke-width="1.6"/>`;
   if(w.kind==='park'){
    const x=xs.reduce((a,b)=>a+b,0)/xs.length,y=ys.reduce((a,b)=>a+b,0)/ys.length;
    drawing+=`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" fill="none" stroke="#75935f" stroke-width="1.4" stroke-linecap="round">${[-11,3,16].map((k,i)=>`<path transform="translate(${k} ${i%2*6})" d="M0 7V1m-6 3H6L3 0h1L0-7-4 0h1z"/>`).join('')}</g>`;
   }
  }else drawing+=`<polyline points="${cords.map(string).join(' ')}" fill="none" stroke="${w.kind==='water'?'#a6cbd2':w.kind==='minor'?'#d3ccac':'#ddd0aa'}" stroke-width="${w.kind==='water'?4:2.25}" stroke-linecap="round"/>`;
 }
 const same=(a,b)=>distance(a,b)<.08;
 const route=opts.map((p,i)=>[p,i]).sort((a,b)=>Number(active(a[1]))-Number(active(b[1]))).map(([p,i])=>{
  const color=colorFor(i),a=p.waypoints,b=p.returnWaypoints,flatReturn=a.length===b.length&&a.every((d,j)=>same(d,b[b.length-1-j]));
  return `<g opacity="${plan.choices?active(i)?1:.76:(selected<0||selected===i?1:.45)}" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="${lines(a)}" stroke="#fff9e5" stroke-width="${active(i)?14:9}"/><polyline points="${lines(a)}" stroke="${color}" stroke-width="${active(i)?7:4.5}" stroke-dasharray="${plan.choices ? ['7 5','9 5','4 4','10 4 2 4'][caps.indexOf(p.cap)] : '8 7'}"/>
  ${flatReturn?'':`<polyline points="${lines(b)}" stroke="${color}" stroke-width="4" stroke-dasharray="1 8"/>`}
  ${same(origin,p.mappedStart)?'':`<polyline points="${lines([origin,p.mappedStart])}" stroke="#6a6453" stroke-width="2" stroke-dasharray="2 5"/>`}
  ${same(p.coords,p.mappedStop)?'':`<polyline points="${lines([p.mappedStop,p.coords])}" stroke="#6a6453" stroke-width="2" stroke-dasharray="2 5"/>`}</g>`;
 }).join('');
 const [sx,sy]=point(origin);
 const check=p=>p.checkpoints?.length?p.checkpoints:[...(p.along||[]).map(a=>({...a,plannedStop:false})),{id:p.id,name:p.name,category:p.category,coords:p.coords,atMinute:p.out,plannedStop:true}].sort((a,b)=>(a.atMinute??0)-(b.atMinute??0)).map((a,index)=>({...a,sequence:index+1}));
 const tagFor=(i,seq)=>plan.choices?(opts[i].cap===caps[0]?'A':'B')+seq:String(seq);
 const along=opts.flatMap((p,i)=>check(p).filter(a=>!a.plannedStop).map(a=>({...a,i})));
 const shiftHome=along.some(a=>{const [x,y]=point(a.coords);return Math.abs(x-sx)<65&&y>sy-60&&y<sy-15})?-70:0;
 const taken=[[sx+shiftHome-58,sy-45,sx+shiftHome+58,sy-20],[sx-16,sy-24,sx+16,sy+10],[701,83,760,139],...along.map(a=>{const [x,y]=point(a.coords);return [x-12,y-12,x+12,y+12]})];
 const label=(p,i)=>{
  const [x,y]=point(p.coords),color=colorFor(i), sequence=check(p).find(a=>a.plannedStop)?.sequence??1,tag=`${p.total} min ${p.kind==='loop'?'loop':'out & back'} · ${names[p.category]||'Stop'}`, name=p.name.length>(plan.choices?22:31)?p.name.slice(0,plan.choices?20:29)+'…':p.name;
  const width=Math.max(plan.choices?165:205,Math.min(plan.choices?245:310,Math.max(name.length*(plan.choices?8.2:9.4),tag.length*(plan.choices?6.6:7.8))+(plan.choices?58:33))); 
  const proposals=[[x+25,y-28],[x-width-25,y-28],[x-width/2,y-84],[x-width/2,y+27],[x+25,y+48],[x-width-25,y+48],[x+25,y-90],[x-width-25,y-90]];
  const place=proposals.map(([a,b])=>[Math.max(21,Math.min(779-width,a)),Math.max(87,Math.min(397,b))]);
  const clash=(a,b)=>taken.some(([l,t,r,bottom])=>a<r+7&&a+width>l-7&&b<bottom+7&&b+52>t-7)||a<x+24&&a+width>x-24&&b<y+24&&b+52>y-24;
  const [lx,ly]=place.find(([a,b])=>!clash(a,b))??place[0];taken.push([lx,ly,lx+width,ly+52]);
  return `<g><line x1="${x}" y1="${y}" x2="${Math.max(lx,Math.min(lx+width,x))}" y2="${Math.max(ly+2,Math.min(ly+49,y))}" stroke="${color}" stroke-width="1.8" stroke-dasharray="3 3"/><g transform="translate(${x} ${y})"><circle r="18" fill="#fff7da" stroke="${color}" stroke-width="2.8"/><g fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon[p.category]||icon.culture}</g></g><g transform="translate(${lx} ${ly})"><rect x="2.5" y="3" width="${width}" height="48" rx="12" fill="#7f644528"/><rect width="${width}" height="48" rx="12" fill="#fff8df" stroke="${color}" stroke-width="1.6"/><text x="11" y="19" font-weight="700" font-size="${plan.choices?10.8:14}" fill="${color}">${plan.choices?p.cap+'m ·':(i+1)+'.'} ${plan.choices?tagFor(i,sequence)+'  ':''}${esc(name)}</text><text x="11" y="37" font-size="${plan.choices?10:12}" fill="#544832">${esc(tag)}</text></g></g>`;
 };
 const labels=opts.map(label).join('');
 const alongMarkers=along.map(a=>{
  const before=along.slice(0,along.indexOf(a)).filter(n=>n.id===a.id).length;
  const [x0,y0]=point(a.coords),x=x0+before*12,y=y0-before*12,color=colorFor(a.i),caption=a.name.length>23?a.name.slice(0,21)+'…':a.name;
  const width=Math.min(145,Math.max(55,caption.length*6.15+13));
  const candidates=[[x+11,y+7],[x-width-11,y+7],[x-width-11,y-28],[x+11,y-27],[x-width/2,y+18]];
  const fits=(a,b)=>a>=21&&a+width<=780&&b>=86&&b+16<=449&&!taken.some(([l,t,r,bot])=>a<r+4&&a+width>l-4&&b<bot+4&&b+16>t-4);
  const pos=candidates.find(([a,b])=>fits(a,b));
  if(pos)taken.push([pos[0],pos[1],pos[0]+width,pos[1]+16]);
  return `<g opacity="${selected<0||selected===a.i?1:.45}"><title>${esc(a.name)} · pass-by</title><g transform="translate(${x} ${y})"><circle r="10" fill="#fff8df" stroke="${color}" stroke-width="1.8"/><g transform="scale(.54)" fill="none" stroke="${color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${icon[a.category]||icon.culture}</g>${plan.choices?`<text x="10" y="-7" fill="${color}" stroke="#fff8df" stroke-width="2.3" paint-order="stroke" font-size="9.5" font-weight="700">${tagFor(a.i,a.sequence)}</text>`:''}</g>${pos&&!plan.choices?`<g transform="translate(${pos.join(' ')})"><rect width="${width}" height="16" rx="6" fill="#fff7e1" stroke="${color}" stroke-width=".6"/><text x="6" y="11.8" font-size="10.3" fill="${color}">${esc(caption)}</text></g>`:''}</g>`;
 }).join('');

 const summary=opts.length?opts.map((p,i)=>`${i+1}  ${p.total} min ${p.kind==='loop'?'loop':'out & back'}`).join('   •   '):'No reachable stops matched this time.';
 const checkpointRows=opts.map((p,i)=>[i,(p.along||[]).map(a=>a.name.length>20?a.name.slice(0,18)+'…':a.name).join(' · ')]);
 const choiceLegend=plan.choices?caps.map((cap,i)=>{const pick=opts.find(p=>p.cap===cap),x=31+387*i,isActive=cap===plan.minutes;return `<g transform="translate(${x} 468)"><rect width="355" height="30" rx="9" fill="${isActive?palette[i]:'#fff7df'}" stroke="${palette[i]}" stroke-width="${isActive?2.2:1.2}"/><text x="10" y="19" fill="${isActive?'#fff':palette[i]}" font-size="12" font-weight="700">${i===0?'A':'B'} · ${cap} min window · ${pick?(pick.kind==='loop'?pick.total+' min loop':pick.total+' min out/back'):'No fit'}</text></g>`}).join(''):'';
 const mapNote=plan.demo?'Illustrated sample · fictional neighborhood':'Map © OpenStreetMap contributors · Estimates, not navigation';
 const titleName=String(plan.label||'').trim();
 const deck=titleName?titleName.length>45?titleName.slice(0,43)+'…':titleName:'Starting point';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="WaitWalk walking treasure map" font-family="Trebuchet MS,DejaVu Sans,sans-serif"><title>WaitWalk · ${esc(deck)}</title>
 <defs><pattern id="paper" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#f6ebce"/><circle cx="3" cy="3" r="0.65" fill="#a7824b" opacity=".27"/><circle cx="9" cy="8" r="0.45" fill="#aa8148" opacity=".29"/></pattern><clipPath id="inner"><rect x="15" y="77" width="770" height="377" rx="10"/></clipPath></defs>
 <rect width="800" height="${H}" fill="#f6e9c7"/><rect x="8" y="8" width="784" height="${H-16}" rx="18" fill="url(#paper)" stroke="#694d30" stroke-width="2.8"/><rect x="14" y="14" width="772" height="${H-28}" rx="15" fill="none" stroke="#976c39" stroke-width="1.2" stroke-dasharray="3 5"/>
 <text x="37" y="51" fill="#603f2b" font-family="Georgia,DejaVu Serif,serif" font-weight="700" font-style="italic" font-size="35">Your little walk</text><text x="39" y="69" fill="#6e593a" font-size="12">${esc(deck)}</text>
 <g transform="translate(602 28)"><path d="M6 1h137q10 0 10 11v12q0 12-10 12H7q-7 0-7-7V8q0-7 6-7z" fill="#fed998" stroke="#855937" stroke-width="1.8"/><text x="77" y="24" text-anchor="middle" fill="#573825" font-size="14" font-weight="700">${plan.minutes} MIN TO GO</text></g>
 ${star(353,44,1.25)}${star(372,59,.66)}<path d="M387 52q72 24 134-4 31-13 65 1" fill="none" stroke="#b28750" stroke-width="1.3" stroke-dasharray="2 5"/>
 <g clip-path="url(#inner)">${drawing}${star(106,122,.7)}${star(682,383,.84)}${route}${alongMarkers}${labels}
 <g transform="translate(${sx} ${sy})"><path d="M0 8 13-4h-26z" fill="#75392b"/><ellipse cy="-8" rx="13" ry="14" fill="#ad4d33" stroke="#75392b" stroke-width="2"/><circle cy="-8" r="4" fill="#fff7df"/><rect x="${-52+shiftHome}" y="-44" width="104" height="20" rx="10" fill="#ad4d33" stroke="#75392b" stroke-width="1.4"/><text x="${shiftHome}" y="-29" text-anchor="middle" fill="white" font-size="12" font-weight="700">YOU ARE HERE</text></g>
 <g transform="translate(731 113)" fill="none" stroke="#896b3e" stroke-width="1.2"><circle r="19"/><path d="M0 -20 4 -4 20 0 4 4 0 20 -4 4 -20 0 -4 -4z" fill="#e8cea0"/><path d="M0-20 4-4 0 0-4-4z" fill="#896b3e"/><text x="0" y="-25" stroke="none" fill="#745d37" text-anchor="middle" font-size="11" font-weight="700">N</text></g>
 </g><line x1="28" y1="457" x2="772" y2="457" stroke="#b29560" stroke-dasharray="2 5"/>
 ${plan.choices?choiceLegend:`<text x="31" y="475" fill="#59442b" font-size="13" font-weight="700">${esc(summary)}</text><text x="770" y="475" text-anchor="end" fill="#59442b" font-size="13">${plan.buffer} min pickup buffer included</text>`}
 ${!plan.choices?checkpointRows.map(([i,n])=>n?`<text x="${i%2===0?31:418}" y="${plan.choices?518+Math.floor(i/2)*17:496}" fill="${colorFor(i)}" font-size="11">${plan.choices?opts[i].cap+'m':i+1} · PASS BY: ${esc(n)}</text>`: '').join(''):''}
 ${plan.choices?opts.map((p,i)=>check(p).slice(0,4).map((a,j)=>`<text x="${31+387*Math.max(0,caps.indexOf(p.cap))}" y="${514+j*16}" fill="${colorFor(i)}" font-size="11.3" font-weight="${a.plannedStop?700:400}">${tagFor(i,a.sequence)} · ${esc(a.name.length>38?a.name.slice(0,37)+'…':a.name)}${a.plannedStop?' · '+p.stay+' min stop':''}</text>`).join('')).join(''):''}
 <text x="31" y="${H-22}" fill="#6e593a" font-size="10">${esc(mapNote)}${plan.choices?' · '+plan.buffer+' min buffer included':''}</text><text x="770" y="${H-22}" text-anchor="end" fill="#6e593a" font-size="10" letter-spacing="1.1">WAITWALK  ✳  THE IN-BETWEEN HOURS</text></svg>`;
}
export {names as categoryNames};
