/* 📦 "Dữ liệu của bạn" [X1] – xuất sổ từ ra Excel (.xlsx thật, OpenXML), bản in / Lưu PDF, Anki · CSV (mở hộp Anki sẵn có) và sao lưu JSON.
 * Không thư viện ngoài: .xlsx nén bằng AnkiKit.zipWrite (js/anki.js – CRC32 + deflate-raw có sẵn của trình duyệt).
 * Nạp lười: App.need('anki', 'xport'); CSS & bản tiếng Anh (js/i18n/en/export.js) nạp khi mở. Lõi (buildXlsx, rowsOf) kiểm bằng scripts/test/unit.mjs. */
(function (g) {
  'use strict';
  const T = (k, v) => g.t ? g.t(k, v) : k;
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const escX = v => String(v == null ? '' : v).replace(/[^\x09\x0A\x0D\x20-퟿-�\u{10000}-\u{10FFFF}]/gu, '').slice(0, 32000).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const iso = ms => { if (!ms) return ''; const d = new Date(ms); return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const colName = i => (i >= 26 ? colName(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));

  // Cột bảng tính (dịch lúc gọi – không gọi t() lúc nạp module)
  const HEAD = () => [T('Từ vựng'), T('Phiên âm'), T('Từ loại'), T('Nghĩa của từ'), T('Định nghĩa tiếng Anh'), T('Ví dụ'), T('Ngữ cảnh đã lưu'), T('Chủ đề'), 'CEFR', T('Lần ôn tới'), T('Số lần ôn'), T('Mức độ nhớ')];
  function rowsOf(cards) {
    const A = g.App || {}, SRS = (g.Core && Core.SRS) || {}, M = [T('Chưa học'), T('Đang học'), T('Quen'), T('Đã thuộc')];
    return cards.map(c => {
      const s = c.srs || {}, ctx = (c.contexts || []).find(x => x && x.text), tp = A.topicOf && c.topic ? A.topicOf(c.topic) : null;
      const ret = SRS.retention && s.last ? SRS.retention(s) : null;
      return [c.word || '', c.ipa || '', c.pos || '', (A.meanOf ? A.meanOf(c) : c.vi) || '', c.def || '', c.ex || '',
        ctx ? ctx.text + (ctx.vi ? ` (${ctx.vi})` : '') : '', c.deck || (tp ? tp.name : c.topic === 'mine' ? '' : c.topic || ''), String(c.level || '').toUpperCase(),
        s.last ? iso(s.due) : '', +s.reps || 0, (SRS.mastery ? M[SRS.mastery(s)] || '' : '') + (ret != null ? ` · ${Math.round(ret * 100)}%` : '')];
    });
  }

  // .xlsx tối thiểu nhưng đúng chuẩn: [Content_Types], rels, workbook, styles, 1 sheet (dòng tiêu đề đậm, cố định, có lọc)
  async function buildXlsx(head, rows, sheetName = 'Lexkite') {
    const zip = g.AnkiKit && AnkiKit.zipWrite; if (!zip) throw new Error('zip');
    const cell = (v, r, i, st) => typeof v === 'number' ? `<c r="${colName(i)}${r}"${st}><v>${v}</v></c>` : `<c r="${colName(i)}${r}" t="inlineStr"${st}><is><t xml:space="preserve">${escX(v)}</t></is></c>`;
    const all = [head, ...rows], last = colName(head.length - 1) + all.length;
    const sheet = XML + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      + '<cols>' + head.map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${[18, 16, 10, 30, 34, 40, 40, 18, 8, 13, 10, 18][i] || 16}" customWidth="1"/>`).join('') + '</cols>'
      + '<sheetData>' + all.map((row, ri) => `<row r="${ri + 1}">${row.map((v, i) => cell(v, ri + 1, i, ri ? '' : ' s="1"')).join('')}</row>`).join('') + '</sheetData>'
      + `<autoFilter ref="A1:${last}"/></worksheet>`;
    const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
    const name = escX(String(sheetName).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || 'Lexkite');
    const files = {
      '[Content_Types].xml': XML + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${CT}.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${CT}.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${CT}.styles+xml"/></Types>`,
      '_rels/.rels': XML + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': XML + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${name.replace(/'/g, "''")}'!$A$1:$${colName(head.length - 1)}$${all.length}</definedName></definedNames></workbook>`,
      'xl/_rels/workbook.xml.rels': XML + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${R}/styles" Target="styles.xml"/></Relationships>`,
      'xl/styles.xml': XML + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F3D3E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
      'xl/worksheets/sheet1.xml': sheet,
    };
    const enc = new TextEncoder();
    return zip(Object.entries(files).map(([n, s]) => ({ name: n, data: enc.encode(s) })));
  }

  if (typeof document === 'undefined') { g.Export = { buildXlsx, rowsOf, HEAD }; return; }
  const d = document;
  let dictP = null;
  const dict = () => dictP || (dictP = (!g.I18N || I18N.lang() === 'vi' || (g.I18N_DICT && I18N_DICT.en && I18N_DICT.en['Dữ liệu của bạn'])) ? Promise.resolve() : new Promise(r => { const s = d.createElement('script'); s.src = 'js/i18n/en/export.js'; s.onload = s.onerror = () => r(); d.head.appendChild(s); }));
  const css = () => {
    if (d.getElementById('xp-css')) return;
    const st = d.createElement('style'); st.id = 'xp-css';
    st.textContent = `.xp{display:grid;gap:.8rem}.xp h2{margin:0}.xp-scope{display:flex;gap:.4rem;flex-wrap:wrap}.xp-scope label{display:flex;gap:.4rem;align-items:center;padding:.45rem .8rem;border:1.5px solid var(--line);border-radius:999px;cursor:pointer;font-weight:600;min-height:40px}.xp-scope label:has(input:checked){border-color:var(--accent);background:var(--accent-soft);color:var(--accent-text)}
.xp-grid{display:grid;gap:.6rem}.xp-t{display:flex;gap:.8rem;align-items:center;width:100%;text-align:start;padding:.8rem .9rem;border:1.5px solid var(--line);border-radius:16px;background:var(--surface);color:var(--text);font:inherit;cursor:pointer;min-height:56px}.xp-t:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
@media (hover:hover) and (pointer:fine){.xp-t:hover{border-color:var(--accent);background:var(--surface-2)}}
.xp-t .ic{font-size:1.6rem;flex:none}.xp-t b{display:block}.xp-t small{display:block;color:var(--muted);line-height:1.35}.xp-t[disabled]{opacity:.55;cursor:default}
#lkPrint{display:none}
@media print{html.lk-print body>*:not(#lkPrint){display:none!important}html.lk-print #lkPrint{display:block;color:#111;background:#fff;font:10pt/1.4 ${'"Be Vietnam Pro",Arial,sans-serif'}}
html.lk-print{background:#fff}#lkPrint .ph{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2pt solid #0F3D3E;padding-bottom:6pt;margin-bottom:8pt}
#lkPrint .lg{font-weight:800;font-size:16pt;color:#0F3D3E}#lkPrint .lg span{color:#E5502F}#lkPrint h1{font-size:14pt;margin:2pt 0 0}#lkPrint .mt{text-align:end;color:#444;font-size:9pt}
#lkPrint table{width:100%;border-collapse:collapse}#lkPrint thead{display:table-header-group}#lkPrint th{background:#0F3D3E;color:#fff;text-align:start;padding:4pt 5pt;font-size:9pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
#lkPrint td{border-bottom:.5pt solid #ccc;padding:4pt 5pt;vertical-align:top}#lkPrint tr{break-inside:avoid}#lkPrint .w{font-weight:800;font-size:11pt}#lkPrint .i{color:#555}#lkPrint .e{font-style:italic;color:#333}#lkPrint .n{color:#888;width:22pt}}`;
    d.head.appendChild(st);
  };
  const stamp = () => iso(Date.now());
  const slug = s => String(s || 'lexkite').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'lexkite';

  // Bản in A4 → hộp in của trình duyệt có "Lưu thành PDF" (máy tính, Android, iPhone)
  function print(cards, title) {
    const { esc } = g.UI, old = d.getElementById('lkPrint'); if (old) old.remove();
    const rows = rowsOf(cards), box = d.createElement('div'); box.id = 'lkPrint';
    box.innerHTML = `<div class="ph"><div><div class="lg">lex<span>kite</span></div><h1>${esc(title)}</h1></div><div class="mt">${esc(new Date().toLocaleDateString(I18N.lang(), { year: 'numeric', month: 'long', day: 'numeric' }))}<br>${T('{n} từ', { n: cards.length })} · lexkite.com</div></div>
      <table><thead><tr><th class="n">#</th><th>${T('Từ vựng')}</th><th>${T('Nghĩa của từ')}</th><th>${T('Ví dụ')}</th><th>${T('Mức độ nhớ')}</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td class="n">${i + 1}</td><td><div class="w">${esc(r[0])}</div><span class="i">${esc(r[1])}${r[2] ? ' · ' + esc(r[2]) : ''}</span></td><td>${esc(r[3])}</td><td class="e">${esc(r[6] || r[5])}</td><td>${esc(r[11])}</td></tr>`).join('')}</tbody></table>`;
    d.body.appendChild(box);
    const root = d.documentElement, done = () => { root.classList.remove('lk-print'); box.remove(); pg.remove(); removeEventListener('afterprint', done); removeEventListener('hashchange', done); };
    const pg = d.createElement('style'); pg.textContent = '@page{size:A4;margin:14mm 12mm}'; d.head.appendChild(pg); // chỉ lúc in sổ từ – không đổi lề khi in trang khác
    root.classList.add('lk-print');
    addEventListener('afterprint', done); addEventListener('hashchange', done); // đăng ký TRƯỚC print() (Chrome chặn luồng tới khi đóng hộp in)
    setTimeout(() => { try { g.print(); } catch (e) { done(); } }, 60);
  }

  function backup() {
    const s = (g.App && App.state) || {};
    g.UI.download(new Blob([JSON.stringify({ app: 'ielts-lexi', version: 2, exported: new Date().toISOString(), cards: s.cards, stats: s.stats, game: s.game, settings: s.settings }, null, 2)], { type: 'application/json' }), `lexkite-backup-${stamp()}.json`);
  }

  async function open(opts = {}) {
    await dict(); css();
    const { modal, closeModal, toast, download, esc } = g.UI, all = Object.values((g.App && App.state && App.state.cards) || {});
    const shown = opts.shown && opts.shown.length && opts.shown.length !== all.length ? opts.shown : null;
    let scope = shown ? 'shown' : 'all';
    const cards = () => scope === 'shown' ? shown : all, title = () => scope === 'shown' && opts.name ? opts.name : T('Sổ từ của bạn');
    const tile = (id, ic, b, s) => `<button type="button" class="xp-t" id="${id}"${all.length || id === 'xpJson' ? '' : ' disabled'}><span class="ic" aria-hidden="true">${ic}</span><span><b>${b}</b><small>${s}</small></span></button>`;
    const box = modal(`<div class="xp"><div><h2 id="xpTitle">📦 ${T('Dữ liệu của bạn')}</h2><p class="small muted" style="margin:.25rem 0 0">${T('Dữ liệu là của bạn – xuất bất cứ lúc nào, không bị giam giữ.')}</p></div>
      ${shown ? `<div class="xp-scope" role="radiogroup"><label><input type="radio" name="xpS" value="shown" checked> ${T('Đang lọc: {name} ({n})', { name: esc(opts.name || ''), n: shown.length })}</label><label><input type="radio" name="xpS" value="all"> ${T('Toàn bộ sổ từ ({n})', { n: all.length })}</label></div>` : `<p class="small muted" style="margin:0">📚 ${T('{n} từ', { n: all.length })}</p>`}
      <div class="xp-grid">${tile('xpXlsx', '📗', T('Bảng tính Excel (.xlsx)'), T('Từ, phiên âm, nghĩa, ví dụ, ngữ cảnh, cấp CEFR, lịch ôn – mở bằng Excel, Google Sheets, Numbers'))}
      ${tile('xpPdf', '📄', T('In / Lưu PDF'), T('Danh sách từ khổ A4 – trong hộp in chọn “Lưu thành PDF”'))}
      ${tile('xpAnki', '🃏', T('Anki · CSV'), T('Gói .apkg, văn bản Anki hoặc CSV'))}
      ${tile('xpJson', '💾', T('Sao lưu đầy đủ (.json)'), T('Mọi thẻ, tiến độ FSRS, chuỗi ngày và XP – nhập lại được ở Cài đặt'))}</div>
      <div class="row end"><button type="button" class="btn ghost" data-close>${T('Đóng')}</button></div></div>`);
    box.setAttribute('aria-labelledby', 'xpTitle');
    box.querySelectorAll('input[name=xpS]').forEach(i => i.onchange = () => { scope = i.value; });
    const $ = id => box.querySelector('#' + id);
    $('xpXlsx').onclick = async () => {
      const b = $('xpXlsx'); b.disabled = true;
      try { const cs = cards(), bytes = await buildXlsx(HEAD(), rowsOf(cs), title()); download(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `lexkite-${slug(title())}-${stamp()}.xlsx`); toast(T('Đã xuất {n} từ', { n: cs.length })); }
      catch (e) { toast(T('Không tải được – thử lại sau')); }
      b.disabled = false;
    };
    $('xpPdf').onclick = () => { const cs = cards(), tt = title(); closeModal(); print(cs, tt); };
    $('xpAnki').onclick = () => App.anki('export', { cards: all, shown: shown || undefined, name: shown ? opts.name : T('Sổ từ') });
    $('xpJson').onclick = () => { backup(); toast(T('Đã tải bản sao lưu')); };
  }

  g.Export = { open, buildXlsx, rowsOf, HEAD, print, backup };
})(typeof self !== 'undefined' ? self : this);
