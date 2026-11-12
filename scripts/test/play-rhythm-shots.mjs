// 🥁 Nhịp điệu – ảnh dựng thật + kiểm bố cục (docs/specs/play-community-1211.md): 375 px sáng / tối / RTL × màn mở đầu, đang chơi, kết quả.
// Trang thử = web/css/style.css + chính file game (cpack/play-app/play-rhythm.js) + dữ liệu mẫu; không cần máy chủ.
// Chặn: lỗi JS, tràn ngang, từ ra ngoài khung, chồng lên nhau. Chạy: node scripts/test/play-rhythm-shots.mjs [out=out/play-rhythm] [web=web]  (cần playwright; PW_CHROME=đường dẫn Chrome nếu có sẵn)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('play-rhythm-shots: playwright chưa cài – bỏ qua'); process.exit(0); }
const out = path.resolve(process.argv[2] || 'out/play-rhythm'), web = path.resolve(process.argv[3] || 'web');
fs.mkdirSync(out, { recursive: true });
const W = pathToFileURL(web).href;
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>rh</title>
<link rel="stylesheet" href="${W}/css/style.css"></head><body><main id="view" class="view" style="max-width:520px;margin:0 auto;padding:1rem"></main>
<script src="${W}/js/pron/coach.js"></script><script src="${W}/cpack/play-app/play-blitz.js"></script><script src="${W}/cpack/play-app/play-rhythm.js"></script>
<script>
window.t=(s,v)=>v?s.replace(/\\{(\\w+)\\}/g,(m,k)=>v[k]):s;
const card=(word,ex,due)=>({word,ex,vi:'x',srs:{reps:1,last:1,due,lapses:0}});
const deck={apple:card('apple','We need to buy the apple for the party.',100),happy:card('happy','She was happy to see the family again.',200),river:card('river','They walked along the river after the lunch.',100),eat:card('eat','I like to eat fruit in the morning.',100),blue:card('blue','He bought a blue bag at the market.',100)};
window.Core={Cards:{update:async()=>{}},SRS:{review:s=>s},Stats:{logReview:async()=>({})},endOfToday:()=>5000};
window.App={view:document.getElementById('view'),state:{cards:deck,settings:{sfx:false},game:{best:{}}},reward:async()=>{},cleanup:null,backHref:()=>'#'};
window.UI={$:(s,r)=>(r||document).querySelector(s),esc:s=>String(s).replace(/[<>&"]/g,''),speak(){},WEAK:{to:['t','t',''],the:['d','d',''],a:['a','a',''],for:['f','f',''],was:['w','w',''],at:['a','a',''],in:['i','i',''],after:['a','a',''],of:['v','v','']}};
window.Sfx={correct(){},wrong(){},finish(){},haptic(){}};
const head=(title,i,n,extra)=>'<div class="study-top"><a class="icon-btn" href="#">✕</a><div class="progress"><i style="width:'+(i/Math.max(1,n)*100)+'%"></i></div><span class="small muted" style="white-space:nowrap">'+(extra||'')+'</span></div><div class="small muted" style="margin:-.4rem 0 .8rem">'+title+'</div>';
const H={accent:()=>'en-GB',emptySource(){},norm:x=>x,practiceDone(){},head,pool:s=>s==='due'?Object.values(deck):[]};
PlayRhythm.run(H,'deck');
// robot: chạm đúng lúc từ NHẤN sáng (mô phỏng người chơi giỏi)
let last=-1; setInterval(()=>{const on=document.querySelector('#rhW .rh-w.on'); if(!on) return; const k=[...on.parentNode.children].indexOf(on); if(k!==last){last=k; if(window.__robot&&on.classList.contains('st')) document.dispatchEvent(new KeyboardEvent('keydown',{key:' '}));}},4);
</script></body></html>`;
const file = path.join(out, 'harness.html'); fs.writeFileSync(file, html);
const errs = [], fails = [];
const launch = process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {};
const browser = await pw.chromium.launch(launch);
for (const [name, scheme, rtl] of [['light', 'light', false], ['dark', 'dark', false], ['rtl', 'light', true]]) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, colorScheme: scheme });
  await ctx.addInitScript(() => { const o = performance.now.bind(performance); performance.now = () => o() * 3; }); // 3× nhanh để vòng đầy đủ chạy trong vài giây
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(name + ': ' + e.message));
  await page.addInitScript(r => { document.documentElement.dir = r ? 'rtl' : 'ltr'; document.documentElement.setAttribute('data-theme', 'x'); }, rtl);
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(s => document.documentElement.setAttribute('data-theme', s), scheme);
  await page.waitForSelector('#rhGo'); await page.screenshot({ path: path.join(out, `${name}-1-intro.png`) });
  const layout = async step => {
    const r = await page.evaluate(() => {
      const vw = innerWidth, bad = []; const cs = [...document.querySelectorAll('#rhW .rh-w')].map(e => e.getBoundingClientRect());
      cs.forEach((a, i) => { if (a.left < 0 || a.right > vw + 0.5) bad.push('chip ' + i + ' ngoài khung'); cs.forEach((b, j) => { if (j > i && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push('chip ' + i + ' đè ' + j); }); });
      if (document.documentElement.scrollWidth > vw + 1) bad.push('tràn ngang ' + document.documentElement.scrollWidth + ' > ' + vw);
      const t = document.querySelector('#rhT'); if (t) { const b = t.getBoundingClientRect(); if (b.height < 44 || b.bottom > innerHeight + 200) bad.push('nút chạm cao ' + b.height); }
      return bad;
    });
    r.forEach(x => fails.push(`${name}/${step}: ${x}`));
  };
  await page.click('#rhGo'); await page.waitForSelector('#rhT');
  await page.evaluate(() => { window.__robot = true; });
  await page.waitForSelector('#rhW .rh-w.on', { timeout: 15000 }); await page.waitForFunction(() => document.querySelectorAll('#rhW .rh-w.perfect,#rhW .rh-w.good').length > 0, null, { timeout: 15000 });
  await page.screenshot({ path: path.join(out, `${name}-2-play.png`) }); await layout('play');
  await page.waitForSelector('.celebrate', { timeout: 60000 }); await page.screenshot({ path: path.join(out, `${name}-3-result.png`) }); await layout('result');
  await ctx.close();
}
await browser.close();
if (errs.length) fails.push(...errs.map(e => 'JS: ' + e));
if (fails.length) { console.error('✗ play-rhythm-shots:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('✓ play-rhythm-shots: 3 chế độ × 3 màn, không tràn/đè, không lỗi JS → ' + out);
