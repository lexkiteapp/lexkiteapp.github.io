// Phân loại sức khoẻ workflow (thuần, có test: scripts/test/health-board.mjs). Dùng chung cho workflow health-board.yml và máy cục bộ scripts/ops/health-board.mjs.
// Ba loại báo cáo: TẮT (disabled) · ĐỎ (lượt gần nhất không-PR đỏ) · QUÁ HẠN (cron lâu không chạy) · SẢN LƯỢNG (chạy "xanh" nhưng ra 0 / dưới sàn).
export const SEV = { critical: 3, high: 2, warn: 1 };
const FAIL = new Set(['failure', 'timed_out', 'startup_failure']);
const OK = new Set(['success']);

/** Chu kỳ gần đúng (giờ) của một biểu thức cron 5 trường (thuần). Lấy chu kỳ NGẮN NHẤT trong các cron của workflow. */
export function cronPeriodHours(expr) {
  const [mi, h, dom, , dow] = String(expr).trim().split(/\s+/);
  if (!h) return 24;
  const step = s => { const m = /\/(\d+)/.exec(s); return m ? +m[1] : 0; };
  const count = s => s === '*' ? 0 : s.split(',').length;
  if (dom !== '*' && !step(dom)) return 24 * 30;
  if (dow !== '*') return 168 / Math.max(1, dow.includes('-') ? (+dow.split('-')[1] - +dow.split('-')[0] + 1) : count(dow));
  if (step(h)) return step(h);
  if (h === '*') return step(mi) ? Math.max(step(mi) / 60, 0.25) : 1;
  return 24 / Math.max(1, count(h));
}
export const minPeriod = crons => crons.length ? Math.min(...crons.map(cronPeriodHours)) : 0;

/** Cron khai báo trong file workflow (thuần). */
export function crons(src) {
  return [...String(src).matchAll(/^\s*-\s*cron:\s*['"]([^'"]+)['"]/gm)].map(m => m[1]);
}

/**
 * Một workflow → danh sách phát hiện (thuần).
 * wf: { name, file, state }, runs: [{ conclusion, event, created_at, id }] mới → cũ (đã bỏ pull_request), cronList: string[],
 * floor: { floor, windowH, note } | undefined, yieldRuns: [{ t, n }] | undefined, off: { owner, due, why } | undefined.
 */
export function classify({ wf, runs = [], cronList = [], floor, yieldRuns, off, now = Date.now() }) {
  const out = [], push = (sev, kind, msg) => out.push({ sev, kind, wf: wf.file, name: wf.name, msg });
  if (wf.state !== 'active') {
    const when = off ? ` – chủ ${off.owner}, hạn ${off.due}: ${off.why}` : '';
    if (!off) push('high', 'tắt', `đang bị tắt (${wf.state}), chưa có người nhận/lý do trong infra/health-expected-off.json`);
    else if (Date.parse(off.due) < now) push('high', 'tắt', `tắt quá hạn xem lại${when}`);
    return out; // workflow tắt không xét tiếp đỏ/quá hạn
  }
  const done = runs.filter(r => r.conclusion && r.conclusion !== 'cancelled' && r.conclusion !== 'skipped');
  const last3 = done.slice(0, 3), reds = last3.filter(r => FAIL.has(r.conclusion)).length;
  if (done[0] && FAIL.has(done[0].conclusion)) {
    push(reds === 3 ? 'critical' : reds >= 2 ? 'high' : 'warn', 'đỏ', `lượt gần nhất đỏ (${reds}/${last3.length} lượt gần đây đỏ, run ${done[0].id})`);
  }
  const period = minPeriod(cronList);
  if (period && wf.state === 'active') {
    const lastAny = runs.find(r => r.created_at);
    const age = lastAny ? (now - Date.parse(lastAny.created_at)) / 36e5 : Infinity;
    const limit = Math.max(period * 2.5, period + 6);
    if (age > limit) push(age > limit * 2 ? 'high' : 'warn', 'quá hạn', `cron ${period} h/lượt nhưng ${lastAny ? Math.round(age) + ' h không chạy' : 'không thấy lượt nào trong 15 lượt gần nhất'}`);
  }
  if (floor) {
    const win = (floor.windowH || 48) * 36e5, rs = (yieldRuns || []).filter(y => now - Date.parse(y.t) <= win);
    const total = rs.reduce((s, y) => s + (+y.n || 0), 0), ran = runs.some(r => OK.has(r.conclusion) && now - Date.parse(r.created_at) <= win);
    if (!rs.length) push(ran ? 'high' : 'warn', 'sản lượng', `không có bản ghi sản lượng ${floor.windowH || 48} h qua (reports/yield/${wf.file.replace(/\.yml$/, '')}.json)${ran ? ' dù có lượt xanh – workflow chưa khai báo' : ''}`);
    else if (total <= 0) push('critical', 'sản lượng', `ra 0 ${floor.unit || 'mục'} trong ${floor.windowH || 48} h (${rs.length} lượt)`);
    else if (total < (floor.floor || 1)) push('high', 'sản lượng', `${total} < sàn ${floor.floor} ${floor.unit || 'mục'}/${floor.windowH || 48} h`);
  }
  return out;
}

/** Sắp xếp theo mức nghiêm trọng rồi tên (thuần). */
export const rank = list => [...list].sort((a, b) => SEV[b.sev] - SEV[a.sev] || a.wf.localeCompare(b.wf) || a.kind.localeCompare(b.kind));

const ICON = { critical: '🔴', high: '🟠', warn: '🟡' };
/** Thân issue Markdown (thuần). redCount = số mục critical/high → job đỏ. */
export function render(findings, { total = 0, when = new Date().toISOString(), run = '' } = {}) {
  const list = rank(findings), reds = list.filter(f => SEV[f.sev] >= SEV.high).length;
  const head = `# Sức khoẻ hệ thống\n\n_Cập nhật ${when} · ${total} workflow · ${reds ? `**${reds} mục đỏ**` : '✅ không mục đỏ'}${list.length - reds ? ` · ${list.length - reds} cảnh báo` : ''}${run ? ` · [lượt chạy](${run})` : ''}_\n\nLuật: [docs/HEALTH-BOARD.md](../blob/main/docs/HEALTH-BOARD.md). Mục tắt có chủ: \`infra/health-expected-off.json\`. Sàn sản lượng: \`infra/yield-floors.json\`.\n\n`;
  if (!list.length) return head + 'Mọi workflow xanh, đang bật, đúng lịch và có sản lượng.\n';
  const rows = list.map(f => `| ${ICON[f.sev]} ${f.sev} | ${f.kind} | \`${f.wf}\` | ${f.msg} |`);
  return head + '| Mức | Loại | Workflow | Chi tiết |\n|---|---|---|---|\n' + rows.join('\n') + '\n';
}
export const redCount = findings => findings.filter(f => SEV[f.sev] >= SEV.high).length;
