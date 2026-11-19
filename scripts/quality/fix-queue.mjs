// Hàng sửa của quality-sweep (2/11): báo cáo đỏ → MỖI nhóm lỗi 1 issue nhãn `qs-fix` + `area:*` (khử trùng bằng dấu ẩn theo khoá nhóm),
// cập nhật tại chỗ mỗi đêm, tự đóng khi đêm sau nguồn đó chạy đủ mà nhóm không còn. Trước đó chỉ có 1 issue gộp "quality-sweep"
// đỏ 3 đêm liền mà không ai nhận → màn hình theo dõi mù. Thứ tự xử lý: điểm = mức nghiêm trọng × độ phủ (số route/chế độ/ngôn ngữ).
// Dùng: node scripts/quality/fix-queue.mjs qs-report/items.json   (env GITHUB_TOKEN, REPO; DRY=1 chỉ in kế hoạch)
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LABEL = 'qs-fix';
const SEV_W = { critical: 8, high: 4, medium: 2, low: 1 };
// Khu vực → nhãn + phiên/chủ sở hữu (docs/CODEMAP.md). Luật đầu tiên khớp thắng.
export const AREAS = [
  { re: /^addon\b/, area: 'addon', owner: 'add-on (extension/, scripts/build-extension.sh)' },
  { re: /#\/(lesson|learn|path|exam|quiz)\b|choice|exit-guard/i, area: 'learn-flow', owner: 'phiên learn-flow-nav (điều hướng bài học, choice-kit, exit-guard)' },
  { re: /#\/(call|tutor)\b|teacher/i, area: 'call', owner: 'phiên lipsync-live (call/*, lesson/teacher.js)' },
  { re: /^lighthouse\b|longtask|cls\b/i, area: 'perf', owner: 'hiệu năng (perf-*.yml, docs/PERF*.md)' },
  { re: /color-contrast|link-in-text-block|overflow|clip|overlap|tap-target/i, area: 'ui', owner: 'phiên qc-sweep-ui (giao diện / token Stitch – docs/DESIGN-SYSTEM.md)' },
  { re: /^axe|aria|label/i, area: 'a11y', owner: 'a11y (web/js – thuộc tính ARIA, nhãn)' },
  { re: /i18n|missing-key|lẫn tiếng/i, area: 'i18n', owner: 'i18n (docs/I18N-PIPELINE.md)' },
  { re: /console|pageerror|promise|request|4\d\d|5\d\d/i, area: 'js', owner: 'JS/route (web/js)' },
  { re: /./, area: 'app', owner: 'app (web/js)' },
];
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
export const marker = k => `<!-- qs-fix:key=${k} -->`;

/** items.json → nhóm (thuần): web theo type+khoá (đã gộp mọi ngôn ngữ), add-on theo tên kiểm (gộp vi/en/ar), trang nặng, Lighthouse. */
export function groups(items) {
  const out = [];
  for (const r of items.web || []) out.push({ src: 'web', key: hash('web|' + r.type + '|' + r.key), sev: r.sev || 'medium', type: r.type, title: `${r.type}: ${String(r.key).slice(0, 70)}`, reach: (r.where || []).length || 1,
    tag: `${r.type} ${r.key} ${(r.where || []).join(' ')}`, lines: [`- Thông báo: ${String(r.msg || '').slice(0, 300)}`, `- Ở đâu (${(r.where || []).length}): ${(r.where || []).slice(0, 12).join(', ')}`, r.link ? `- Ảnh: ${r.link}` : ''] });
  const ext = new Map();
  for (const e of items.addon || []) { const x = ext.get(e.check) || ext.set(e.check, { langs: [], detail: e.detail }).get(e.check); x.langs.push(e.lang); }
  for (const [check, x] of ext) out.push({ src: 'addon', key: hash('addon|' + check), sev: 'high', type: 'addon', title: `add-on: ${check.slice(0, 80)}`, reach: x.langs.length * 4,
    tag: `addon ${check} ${x.detail}`, lines: [`- Ngôn ngữ: ${x.langs.join(', ')}`, `- Chi tiết: ${String(x.detail || '').slice(0, 300) || '(trống)'}`, '- Tái hiện: `node scripts/test/ext-e2e.mjs` (workflow ext-e2e.yml)'] });
  for (const h of items.heavy || []) out.push({ src: 'heavy', key: hash('heavy|' + h.replace(/\d+/g, '#')), sev: 'medium', type: 'addon-heavy', title: `add-on trang nặng: ${h.slice(0, 80)}`, reach: 1, tag: `addon ${h}`, lines: [`- ${h}`] });
  for (const l of items.lighthouse || []) out.push({ src: 'lighthouse', key: hash('lh|' + l.page), sev: 'medium', type: 'lighthouse', title: `Lighthouse ${l.page}: ${(l.error || l.fails.join('; ')).slice(0, 70)}`, reach: 1, tag: `lighthouse ${l.page}`, lines: [`- ${l.error || l.fails.join('; ')}`] });
  for (const g of out) { const a = AREAS.find(x => x.re.test(g.tag)); g.area = a.area; g.owner = a.owner; g.score = (SEV_W[g.sev] || 1) * g.reach; }
  return out.sort((a, b) => b.score - a.score);
}

/** Kế hoạch đồng bộ (thuần): mở mới (≤ maxNew/đêm, điểm cao trước), cập nhật mục còn, đóng mục hết lỗi CHỈ khi nguồn của nó chạy đủ. */
export function plan(gs, open, sources, { maxNew = 15 } = {}) {
  const byKey = new Map(); for (const i of open) { const m = String(i.body || '').match(/<!-- qs-fix:key=(\w+) -->/); if (m) byKey.set(m[1], i); }
  const seen = new Set(gs.map(g => g.key)), create = [], update = [], close = [];
  for (const g of gs) (byKey.has(g.key) ? update.push({ issue: byKey.get(g.key), g }) : create.push(g));
  for (const [k, i] of byKey) { const src = (String(i.body).match(/<!-- qs-fix:src=(\w+) -->/) || [])[1]; if (!seen.has(k) && src && sources[src === 'heavy' ? 'heavy' : src]) close.push(i); }
  return { create: create.slice(0, maxNew), deferred: create.slice(maxNew).length, update, close };
}
export function body(g, run, firstSeen) {
  return `${marker(g.key)}\n<!-- qs-fix:src=${g.src} -->\n**${g.sev}** · khu vực **${g.area}** · điểm ${g.score} (mức × độ phủ ${g.reach}) · chủ sở hữu: ${g.owner}\n\n` +
    g.lines.filter(Boolean).join('\n') + `\n\n- Lần đầu: ${firstSeen} · lượt mới nhất: ${run}\n- Sửa gốc + test hồi quy; issue tự đóng khi đêm sau quality-sweep không còn nhóm này (docs/QUALITY-SWEEP.md).\n`;
}

async function main() {
  const items = JSON.parse(fs.readFileSync(process.argv[2] || 'qs-report/items.json', 'utf8'));
  const REPO = process.env.REPO || 'lexkiteapp/lexkiteapp.github.io', API = `https://api.github.com/repos/${REPO}`, DRY = process.env.DRY === '1';
  const gh = async (p, method = 'GET', b) => { const r = await fetch(API + p, { method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-qs-fix' }, body: b ? JSON.stringify(b) : undefined });
    if (!r.ok) throw new Error(`GitHub ${method} ${p} → ${r.status}`); return r.status === 204 ? {} : r.json(); };
  const gs = groups(items), open = [];
  for (let page = 1; page <= 5 && !DRY; page++) { const w = await gh(`/issues?state=open&labels=${LABEL}&per_page=100&page=${page}`); open.push(...w.filter(i => !i.pull_request)); if (w.length < 100) break; }
  const p = plan(gs, open, items.sources || {}), today = new Date().toISOString().slice(0, 10);
  console.log(`qs-fix: ${gs.length} nhóm · mở ${p.create.length} (hoãn ${p.deferred}) · cập nhật ${p.update.length} · đóng ${p.close.length}`);
  if (DRY) { for (const g of gs) console.log(`  ${g.score}\t${g.area}\t${g.title}`); return; }
  for (const lab of [LABEL, ...new Set(gs.map(g => 'area:' + g.area))]) await gh('/labels', 'POST', { name: lab, color: lab === LABEL ? 'd93f0b' : 'c5def5' }).catch(() => {});
  for (const g of p.create) await gh('/issues', 'POST', { title: `[qs] ${g.title}`, labels: [LABEL, 'area:' + g.area], body: body(g, items.run, today) });
  for (const { issue, g } of p.update) { const first = (String(issue.body).match(/Lần đầu: (\d{4}-\d\d-\d\d)/) || [])[1] || today; await gh(`/issues/${issue.number}`, 'PATCH', { body: body(g, items.run, first) }); }
  for (const i of p.close) await gh(`/issues/${i.number}`, 'PATCH', { state: 'closed', state_reason: 'completed', body: i.body + `\n\n✅ Hết lỗi ở quality-sweep ${today}: ${items.run}` });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.log(`::error::qs-fix: ${e.message}`); process.exitCode = 1; });
