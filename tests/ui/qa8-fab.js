'use strict';
/* qa8(2026-11-25) 대표님 「학습자 웹 AI 버튼이 계속 움직여 산만 — 관리자처럼 고정, 처음엔 보이다가 스크롤 멈추면 뜨게」: 학습자 웹 1440 · 390, 앱 390에서 단추가 처음 보이고 · 스크롤 중 숨고 · 멈추면 같은 자리 같은 크기로 다시 보이는지 */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../../didisam');const fails=[];const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails.push(m)};
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
(async()=>{const srv=http.createServer((q,r)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(0);
await new Promise(o=>srv.once('listening',o));const base=`http://127.0.0.1:${srv.address().port}`;const br=await chromium.launch();
for(const [nm,w,u,classic] of [['web-classic',1440,'learner.html?demo=1',1],['web-default',1440,'learner.html?demo=1',0],['web-m',390,'learner.html?demo=1',1],['web-m-def',390,'learner.html?demo=1',0],['app',390,'learner.html?demo=1&app=1',0]]){
 const ctx=await br.newContext({viewport:{width:w,height:w>400?900:844}});const p=await ctx.newPage();await p.route(/^https?:\/\/(?!127\.0\.0\.1)/,x=>x.abort());
 await p.addInitScript(c=>{try{sessionStorage.setItem('didisam.learner.sample',JSON.stringify({sid:'20260001',dept:'',id:'20260001'}));localStorage.setItem('didisam.app.instx','1');if(c)localStorage.setItem('didisam.app.classic','1');}catch(e){}},classic);
 await p.goto(`${base}/${u}#courses`,{waitUntil:'load'});await p.waitForTimeout(1500);
 await p.evaluate(()=>{try{LR.lp.vision={skip:true,step:0};lrender();}catch(e){}});await p.waitForTimeout(600);
 const S=await p.evaluate(async()=>{const vis=e=>{if(!e)return 0;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&cs.display!=='none'&&cs.visibility!=='hidden'?+cs.opacity:0};
  const snap=t=>{const L=[...document.querySelectorAll('#tbFab,#ltut .lt-fab')].map(e=>{const r=e.getBoundingClientRect();return `${e.id||'lt'}:${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)} o${vis(e).toFixed(1)}`});return t+' '+L.join(' | ')+' body:'+[...document.body.classList].filter(c=>/^(tb-|lt-|lhs-|fab)/.test(c)).join(',')};
  const out=[snap('start')];const H=document.documentElement.scrollHeight;
  for(let i=1;i<=8;i++){scrollBy(0,120);await new Promise(r=>setTimeout(r,60));out.push(snap('scroll'+i))}
  await new Promise(r=>setTimeout(r,900));out.push(snap('stop'));for(let i=1;i<=3;i++){scrollBy(0,-150);await new Promise(r=>setTimeout(r,60));out.push(snap('up'+i))}
  await new Promise(r=>setTimeout(r,900));out.push(snap('stop2'));out.push('H='+H);return out});
 const pos=x=>(x.match(/:(\d+,\d+,\d+x\d+) o1\.0/)||[])[1];const P0=pos(S[0]);ok(!!P0,nm+' 처음에 보임 '+S[0]);ok(/o0\.0/.test(S[4].split('|').pop()),nm+' 스크롤하는 동안 숨김 '+S[4]);ok(pos(S[9])===P0,nm+' 멈추면 같은 자리에 다시 보임 '+S[9]);ok(pos(S[13])===P0,nm+' 위로 스크롤 후 멈춤에도 같은 자리 '+S[13]);await ctx.close();}
await br.close();srv.close();console.log(fails.length?'실패 '+fails.length:'모두 통과');process.exit(fails.length?1:0)})();
