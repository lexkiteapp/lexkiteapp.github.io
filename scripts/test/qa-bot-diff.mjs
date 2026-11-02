// 🤖 qa-bot trước/sau: so ảnh cùng trạng thái giữa nhánh gốc (base) và PR (head) + so lỗi đầu dò (mới / đã sửa). docs/QA-BOT.md
// Dùng: node scripts/test/qa-bot-diff.mjs <base-out> <head-out> <out>   (mỗi thư mục là --out của qa-bot.mjs)
// Ra: <out>/diff-<trạng thái>.jpg (gốc | PR | điểm khác tô đỏ) cho ảnh khác > 0,3 % + <out>/summary.md. Không đỏ – chỉ báo (cổng nằm ở qa-bot.mjs).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [B, H, OUT = 'out/qa-bot-diff'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const rep = d => { try { return JSON.parse(fs.readFileSync(path.join(d, 'report.json'), 'utf8')); } catch { return { ui: [], journeys: [], fails: [] }; } };
const rb = rep(B), rh = rep(H);
const names = fs.readdirSync(path.join(H, 'shots')).filter(f => f.includes('@') && !f.startsWith('journey') && fs.existsSync(path.join(B, 'shots', f))).sort();
const browser = await chromium.launch(); const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
const rows = [];
for (const f of names) {
  const a = fs.readFileSync(path.join(B, 'shots', f)).toString('base64'), b = fs.readFileSync(path.join(H, 'shots', f)).toString('base64');
  const r = await page.evaluate(async ([a, b]) => {
    const load = s => new Promise((y, n) => { const i = new Image(); i.onload = () => y(i); i.onerror = n; i.src = 'data:image/png;base64,' + s; });
    const [A, Bm] = await Promise.all([load(a), load(b)]);
    const w = Math.max(A.width, Bm.width), h = Math.max(A.height, Bm.height);
    const px = img => { const c = new OffscreenCanvas(w, h), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h); };
    const da = px(A), db = px(Bm), dd = new ImageData(w, h); let diff = 0;
    for (let i = 0; i < da.data.length; i += 4) {
      const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
      if (d > 24) { diff++; dd.data[i] = 255; dd.data[i + 1] = 0; dd.data[i + 2] = 0; dd.data[i + 3] = 255; } else { const g = (db.data[i] + db.data[i + 1] + db.data[i + 2]) / 3; dd.data[i] = dd.data[i + 1] = dd.data[i + 2] = 200 + g / 5; dd.data[i + 3] = 255; }
    }
    const pct = diff / (w * h) * 100; if (pct < 0.3) return { pct };
    const s = Math.min(1, 480 / w), cw = Math.round(w * s), ch = Math.round(h * s), c = document.getElementById('c'); c.width = cw * 3 + 16; c.height = ch;
    const x = c.getContext('2d'); x.fillStyle = '#888'; x.fillRect(0, 0, c.width, ch);
    const dc = new OffscreenCanvas(w, h); dc.getContext('2d').putImageData(dd, 0, 0);
    x.drawImage(A, 0, 0, cw, ch * A.height / h); x.drawImage(Bm, cw + 8, 0, cw, ch * Bm.height / h); x.drawImage(dc, cw * 2 + 16, 0, cw, ch);
    return { pct, jpg: c.toDataURL('image/jpeg', 0.8).split(',')[1] };
  }, [a, b]).catch(e => ({ pct: -1, err: e.message }));
  if (r.jpg) fs.writeFileSync(path.join(OUT, 'diff-' + f.replace(/\.png$/, '.jpg')), Buffer.from(r.jpg, 'base64'));
  rows.push([f.replace(/\.png$/, ''), r.pct]);
}
await browser.close();
// so lỗi đầu dò theo (trạng thái, chữ ký)
const iss = r => new Map(r.ui.flatMap(u => u.issues.filter(i => i.sev === 'fail').map(i => [u.key + ' ' + i.sig, `${u.key}: [${i.k}] ${i.msg}`])));
const ib = iss(rb), ih = iss(rh), added = [...ih].filter(([k]) => !ib.has(k)).map(([, v]) => v), fixed = [...ib].filter(([k]) => !ih.has(k)).map(([, v]) => v);
const changed = rows.filter(r => r[1] >= 0.3);
const md = ['## 🤖 qa-bot trước / sau', '',
  `Ảnh: ${rows.length} trạng thái so sánh · **${changed.length} khác** (> 0,3 % điểm ảnh) · ảnh ghép gốc | PR | khác trong artifact \`qa-bot-diff\``, '',
  `Lỗi đầu dò: **+${added.length} mới** · **−${fixed.length} đã sửa** · gốc ${ib.size} → PR ${ih.size}`, '',
  changed.length ? '| Trạng thái | % khác |\n|---|---|\n' + changed.map(([n, p]) => `| ${n} | ${p.toFixed(1)} |`).join('\n') : '',
  '', added.length ? '<details open><summary>❌ Lỗi mới trong PR</summary>\n\n' + added.slice(0, 60).map(x => '- ' + x).join('\n') + '\n</details>' : '',
  fixed.length ? '<details><summary>✅ Lỗi đã sửa</summary>\n\n' + fixed.slice(0, 60).map(x => '- ' + x).join('\n') + '\n</details>' : '',
  '', `Hành trình: gốc ${rb.journeys.filter(j => j.ok).length}/${rb.journeys.length} xanh → PR ${rh.journeys.filter(j => j.ok).length}/${rh.journeys.length} xanh`];
fs.writeFileSync(path.join(OUT, 'summary.md'), md.join('\n') + '\n');
console.log(md.join('\n'));
