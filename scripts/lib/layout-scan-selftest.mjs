// Tự kiểm máy dò layout-scan.mjs trên trang mẫu (Chromium thật): mỗi máy dò PHẢI bắt ca lỗi và PHẢI im ở ca đúng.
// Ca lỗi tái hiện nguyên CSS gây lỗi #users của owner 5/11 (1900 px): td:first-child{min-width:15rem} trúng cột ô chọn,
// overflow-wrap:anywhere ở ô tên, td.u-badges{display:flex}; hàng lọc trộn nhãn "pill" bên cạnh với nhãn ngày bên trên ("to" tách dòng).
// Gọi từ web-sweep.mjs (và được admin-guard dùng gián tiếp qua scan) – máy dò hỏng thì cổng đỏ trước khi quét trang thật.
import { isMain } from './is-main.mjs';
import { scan } from './layout-scan.mjs';

const CSS = `body{margin:0;font:14px/1.4 system-ui;background:#fff;color:#111} section{padding:16px} #bad{width:1100px} #good{width:1700px}
table{width:100%;border-collapse:separate} th,td{padding:8px 10px;text-align:left;vertical-align:middle;white-space:nowrap}
.chip{display:inline-block;padding:2px 8px;border-radius:9px;background:#dfe} .btn{display:inline-block;padding:6px 10px;border:1px solid #999;border-radius:8px}
.who{display:flex;gap:8px;align-items:center} .who>span:last-child{min-width:0;overflow-wrap:anywhere;white-space:normal}
#bad td:first-child{min-width:15rem} #bad td.badges{display:flex;gap:4px}
#good table{table-layout:fixed} #good col.c-ck{width:44px} #good col.c-who{width:auto} #good td.badges .bw{display:flex;gap:4px}
.tools{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;width:900px} .sel{display:flex;flex-direction:column;gap:4px;font-size:12px}
.tools .sel:has(select){flex-direction:row;align-items:center;gap:6px;border:2px solid #ccc;border-radius:99px;padding:0 6px 0 12px}
.cjk{width:320px} .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:normal}`;
const ROW = `<td class="ck"><input type="checkbox" aria-label="pick"></td>
<td><div class="who"><span>Q</span><span><b>Quyen Khieu</b><br>anhquyenbk1239@gmail.com</span></div></td>
<td><span class="chip">Admin</span></td><td class="badges"><span class="chip">Active</span><span class="chip">Beta</span></td>
<td>Web</td><td>Vietnam</td><td>20 days ago</td><td>1h ago</td><td>48</td>
<td><span class="btn">Details</span> <span class="btn">📣 Send notification</span> <span class="btn">Delete user data permanently</span> <span class="btn">Export</span></td>`;
const HEAD = `<tr><th><input type="checkbox" aria-label="all"></th><th>Users</th><th>Role</th><th>Status</th><th>Platform</th><th>Country</th><th>Created</th><th>Last active</th><th>Visits</th><th><span class="sr">Actions</span></th></tr>`;
const FILTERS = dated => `<div class="tools">${['Role', 'Status', 'Platform', 'Country', 'Last active', 'Visits', 'Tag', 'Access', 'Sync block'].map(n => `<label class="sel"><span>${n}</span><select><option>All</option></select></label>`).join('')}
${dated ? `<label class="sel"><span>Joined from</span><input type="date"></label><label class="sel"><span>to</span><input type="date"></label>` : `<label class="sel"><span>Joined from</span><select><option>Any</option></select></label><label class="sel"><span>to</span><select><option>Any</option></select></label>`}</div>`;
const HTML = `<style>${CSS}</style>
<section id="bad"><table><thead>${HEAD}</thead><tbody><tr>${ROW}</tr></tbody></table>${FILTERS(true)}<div><label for="lone">Lonely label</label><div style="height:120px"></div><input id="lone"></div></section>
<section id="good"><table><colgroup><col class="c-ck"><col class="c-who"><col span="7" style="width:110px"><col style="width:540px"></colgroup><thead>${HEAD}</thead><tbody><tr>${ROW.replace('<td class="badges">', '<td class="badges"><div class="bw">').replace('<span class="chip">Beta</span></td>', '<span class="chip">Beta</span></div></td>')}</tr></tbody></table>${FILTERS(false)}
<div class="fld" style="width:360px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;align-items:baseline"><label for="rate">Sampling rate</label><span class="chip">Default: 1</span><span class="chip">Edited 2h ago by admin</span><span class="chip">Reset to default</span></div><div style="display:flex;gap:12px"><input type="range" style="flex:1" aria-label="rate"><input id="rate" type="number" style="width:80px"></div></div>
<p class="cjk">日本語の説明文はスペースがなくても普通の幅で読めます。中文段落也一样，不应被误报为逐字换行。</p><span class="sr">Screen reader only long text here</span></section>`;

export async function selftest(browser) {
  const page = await browser.newPage({ viewport: { width: 1900, height: 1000 } });
  try {
    await page.setContent(HTML); await page.waitForTimeout(50);
    const bad = await page.evaluate(scan, { root: '#bad', sel: 'table' }), good = await page.evaluate(scan, { root: '#good', sel: 'table' });
    const fail = [];
    if (!bad.stack.length) fail.push('stack: không bắt tên xếp dọc từng chữ');
    if (!bad.cell.some(x => /display:flex/.test(x))) fail.push('cell: không bắt td display:flex');
    if (!bad.cell.some(x => /cột thừa/.test(x))) fail.push('cell: không bắt cột ô chọn rộng thừa');
    if (!bad.orphan.some(x => /trộn kiểu nhãn/.test(x))) fail.push('orphan: không bắt nhóm lọc trộn nhãn bên cạnh/bên trên');
    if (!bad.orphan.some(x => /Lonely label/.test(x))) fail.push('orphan: không bắt nhãn for= cách xa control');
    for (const k of ['stack', 'cell', 'orphan']) if (good[k].length) fail.push(`${k}: báo nhầm ca đúng – ${good[k][0]}`);
    return { ok: !fail.length, fail, bad: { stack: bad.stack, cell: bad.cell, orphan: bad.orphan } };
  } finally { await page.close(); }
}

if (isMain(import.meta.url)) { // node scripts/lib/layout-scan-selftest.mjs (cần playwright – chạy trên CI)
  const { chromium } = await import('playwright'); const b = await chromium.launch();
  const r = await selftest(b); await b.close(); console.log(JSON.stringify(r, null, 1)); process.exit(r.ok ? 0 : 1);
}
