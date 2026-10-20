// Gộp kết quả kiểm thử iOS (mỗi máy 1 results.json) → report.md (tóm tắt GitHub) + report.html (kèm ảnh chụp).
// Dùng: node scripts/test/ios-e2e/report.mjs <dir chứa các thư mục <tag>/results.json>
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.resolve(process.argv[2] || 'e2e-out');
const tags = fs.readdirSync(DIR).filter(t => fs.existsSync(path.join(DIR, t, 'results.json')));
const R = Object.fromEntries(tags.map(t => [t, JSON.parse(fs.readFileSync(path.join(DIR, t, 'results.json'), 'utf8'))]));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const GROUP = s => /^(launch|toapp|onboard)/.test(s) ? '1 Khởi động & thiết lập' : /^lang/.test(s) ? '6 Ngôn ngữ (15)' : /^(route|sub)/.test(s) ? '2 Trang & trang con' : /^(dark|offline|deeplink)/.test(s) ? '5 Hệ thống (dark/offline/deep link)' : /^real/.test(s) ? '4 Plugin gốc thật (share/thông báo)' : '3 Luồng tính năng';
// bỏ qua lỗi không thuộc app: dịch vụ ngoài trả 4xx khi không có khóa, hủy tải khi chuyển trang
const NOISE = /(ResizeObserver|AbortError|cancelled|Load cancelled)/i;
const steps = {}; // step → tag → issues
for (const [t, r] of Object.entries(R)) for (const e of r.events.filter(e => e.type === 'step')) { (steps[e.step] ||= {})[t] ||= []; steps[e.step][t].push(...(e.issues || []).filter(i => !NOISE.test(i.msg))); }
const info = t => Object.fromEntries(R[t].events.filter(e => e.type === 'info').map(e => [e.key, e]));
const kinds = {}; for (const s of Object.values(steps)) for (const iss of Object.values(s)) for (const i of iss) kinds[i.kind] = (kinds[i.kind] || 0) + 1;
const order = Object.keys(steps).sort((a, b) => GROUP(a).localeCompare(GROUP(b)));
const status = s => Object.values(steps[s]).some(x => x.length) ? 'FAIL' : 'PASS';
const nFail = order.filter(s => status(s) === 'FAIL').length;
let md = `## Kiểm thử app iOS trên Simulator (${tags.map(t => `${t}: ${R[t].device} · ${R[t].runtime.replace(/.*SimRuntime\./, '')}`).join(' · ')})\n\n`;
md += `Phương pháp: harness chạy **bên trong WKWebView thật** của app (Capacitor, bản Debug giả lập) – điều khiển từng trang/tính năng, máy chủ chụp màn hình bằng \`simctl io\`, đổi Dark mode bằng \`simctl ui\`, deep link bằng \`simctl openurl\`. Offline = giả lập trong trang (chặn fetch/XHR). Xoay màn hình: không phủ (simctl không xoay được).\n\n`;
md += `**${order.length - nFail}/${order.length} bước PASS** · ${nFail} FAIL · chạy xong: ${tags.map(t => `${t}=${R[t].done ? 'có' : 'KHÔNG'} (mở lại ${R[t].relaunches}, crash ${R[t].crashes.length})`).join(', ')}\n\n`;
md += `Loại lỗi: ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ') || '–'}\n\n`;
for (const t of tags) { const l = info(t).launch; if (l) md += `- ${t}: mở app tại \`${l.path}${l.hash}\` · ${l.w}×${l.h}@${l.dpr} · safe ${JSON.stringify(l.safe)} · SpeechRecognition=${l.speech} · getUserMedia=${l.gum} · plugins: ${(l.plugins || []).join(', ')}\n`; }
md += `\n| Nhóm | Bước | ${tags.join(' | ')} | Lỗi |\n|---|---|${tags.map(() => '---').join('|')}|---|\n`;
for (const s of order) {
  const all = []; for (const t of tags) for (const i of steps[s][t] || []) all.push(`[${t}] ${i.kind}: ${i.msg}`);
  const uniq = [...new Set(all.map(x => x.replace(/^\[\w+\] /, '')))];
  md += `| ${GROUP(s).slice(2)} | ${s} | ${tags.map(t => steps[s][t] ? (steps[s][t].length ? '❌' : '✅') : '–').join(' | ')} | ${esc(uniq.slice(0, 4).join(' ‖ ').slice(0, 600)).replace(/\|/g, '\\|')} |\n`;
}
// liên kết rời app
const ext = new Map(); for (const t of tags) for (const e of R[t].events.filter(e => e.type === 'links')) for (const l of e.links || []) if (!ext.has(l.h)) ext.set(l.h, `${l.h} (target=${l.tg || '–'}, "${l.tx}", trang ${e.route})`);
if (ext.size) md += `\n### Liên kết không phải #route trong app (${ext.size})\n${[...ext.values()].slice(0, 60).map(x => '- ' + esc(x)).join('\n')}\n`;
for (const t of tags) { const i = info(t); md += `\n### ${t}: thông tin thêm\n- TTS: ${JSON.stringify(i.tts || {}).slice(0, 400)}\n- Share: ${JSON.stringify(i.share || {}).slice(0, 400)}\n- Thông báo: ${JSON.stringify(i.notify || {}).slice(0, 400)}\n- Speech: ${JSON.stringify(i.speech || {})}\n- Gợi ý tra từ: ${JSON.stringify(i.suggest || {})}\n- Mạng trong app (theo máy chủ): ${JSON.stringify((i.net || {}).hosts || {}).slice(0, 900)}\n- Mạng từ máy CI (curl): ${JSON.stringify(R[t].netdiag || {})}\n`; }
fs.writeFileSync(path.join(DIR, 'report.md'), md);
// HTML: bảng + ảnh từng bước
let html = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Lexkite iOS E2E</title><style>body{font:14px/1.45 -apple-system,system-ui,sans-serif;margin:16px;color:#111;background:#fff}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:4px 6px;vertical-align:top;text-align:left}.F{background:#fde8e8}.shots{display:flex;flex-wrap:wrap;gap:8px}.shots figure{margin:0;width:180px}.shots img{width:180px;border:1px solid #ccc;border-radius:6px}.shots figcaption{font-size:11px;word-break:break-all}.bad{outline:3px solid #e33}</style>`;
html += `<h1>Lexkite iOS E2E</h1><pre style="white-space:pre-wrap">${esc(md.split('\n| Nhóm')[0])}</pre><table><tr><th>Nhóm</th><th>Bước</th>${tags.map(t => `<th>${t}</th>`).join('')}</tr>`;
for (const s of order) html += `<tr class="${status(s)[0]}"><td>${esc(GROUP(s).slice(2))}</td><td>${esc(s)}</td>${tags.map(t => `<td>${(steps[s][t] || []).map(i => `<div><b>${esc(i.kind)}</b> ${esc(i.msg)}</div>`).join('') || (steps[s][t] ? '✅' : '–')}</td>`).join('')}</tr>`;
html += '</table>';
for (const t of tags) {
  const badSteps = new Set(order.filter(s => (steps[s][t] || []).length));
  html += `<h2>${esc(t)} – ${esc(R[t].device)} (${R[t].shots.length} ảnh)</h2><div class=shots>` + R[t].shots.map(s => `<figure><a href="${t}/shots/${s.file}"><img loading=lazy class="${badSteps.has(s.step) ? 'bad' : ''}" src="${t}/shots/${s.file}"></a><figcaption>${esc(s.name)} · ${esc(s.lang || '')}</figcaption></figure>`).join('') + '</div>';
}
fs.writeFileSync(path.join(DIR, 'report.html'), html);
console.log(md);
