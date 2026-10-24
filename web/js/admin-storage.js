/* Quản trị → 💾 Lưu trữ (tải lười): dung lượng repo chính + kho media (MB cây đầu nhánh, MB cả lịch sử theo API, số tệp),
 * dự báo khi kho từ đủ 20k (âm thanh từ mới → kho audio open), cảnh báo ≥ 70 %. Dữ liệu tĩnh /data/storage-forecast.json
 * (scripts/lexicon/expand/forecast.mjs --measure, storage-watch hằng tuần). admin.js gọi AdminStorage.render(container, L, { esc, num, lang }).
 * Tài liệu: docs/STORAGE.md */
(function () {
  const EN = {
    'Lưu trữ': 'Storage', 'Đang tải…': 'Loading…', 'Không tải được': 'Could not load', 'Làm mới': 'Refresh',
    'Dung lượng theo repo': 'Size per repo', 'Repo': 'Repo', 'Trạng thái': 'State', 'Cây đầu nhánh': 'Tip tree', 'Cả lịch sử (API)': 'With history (API)', 'Số tệp': 'Files',
    'Khi đủ {n} từ': 'At {n} words', 'mở': 'open', 'đầy (chỉ đọc)': 'full (read-only)', 'dự kiến': 'planned', 'repo chính': 'main repo',
    'Trần mềm {mb} MB/repo · cảnh báo ở 70 %. Âm thanh mới vào kho audio đang mở (round-robin theo hash, infra/media-repos.json). Lịch sử git repo chính không viết lại – chỉ chặn tăng thêm (size-guard: cây ≤ 600 MB, ≤ 20 MB nhị phân/commit).': 'Soft cap {mb} MB/repo · alert at 70%. New audio goes to the open audio repo (hash round-robin, infra/media-repos.json). Main repo git history is not rewritten – growth is blocked instead (size-guard: tree ≤ 600 MB, ≤ 20 MB binaries/commit).',
    '📈 Dự báo kho {n} từ': '📈 Forecast for {n} words', 'Từ hiện có': 'Words now', 'Cần thêm': 'To add', 'Âm thanh từ mới': 'New word audio', 'tệp': 'files',
    'Tệp Pages (kho từ) hiện tại → khi đủ': 'Pages files (lexicon) now → at target', 'cổng': 'gate', 'Ảnh mới': 'New images',
    '⚠️ Cảnh báo': '⚠️ Alerts', '✓ Không có cảnh báo (mọi repo < 70 %).': '✓ No alerts (every repo < 70%).', 'Đo lúc {d}': 'Measured {d}', 'chưa đo': 'not measured',
  };
  function render(box, L, { esc, num, lang }) {
    const S = (vi, vars) => { const s = lang() === 'en' && Object.prototype.hasOwnProperty.call(EN, vi) ? EN[vi] : vi; return vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : s; };
    const tab = document.querySelector('#tabs [data-tab="storage"] .nav-l'); if (tab) tab.textContent = S('Lưu trữ');
    const n = x => (x == null ? '—' : num ? num(x) : String(x));
    const ST = { open: 'mở', full: 'đầy (chỉ đọc)', planned: 'dự kiến' };
    const bar = (pct, lab) => { const p = Math.max(0, Math.min(100, +pct || 0)), c = p >= 90 ? 'var(--bad, #d64545)' : p >= 70 ? 'var(--warn, #e9a23b)' : 'var(--ok, #2a9d6f)';
      return `<div role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}" aria-label="${esc(lab)}" style="position:relative;height:8px;border-radius:4px;background:var(--line, #ddd);min-width:90px"><i style="position:absolute;left:0;top:0;bottom:0;width:${p}%;background:${c};border-radius:4px"></i><span aria-hidden="true" style="position:absolute;left:70%;top:-2px;bottom:-2px;border-left:1px dashed var(--warn, #e9a23b)"></span></div>`; };
    async function load() {
      box.innerHTML = `<section class="card"><h2>💾 ${esc(S('Lưu trữ'))}</h2><p class="small muted">${esc(S('Đang tải…'))}</p></section>`;
      let f;
      try { const r = await fetch('/data/storage-forecast.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); f = await r.json(); }
      catch (e) { box.innerHTML = `<section class="card"><h2>💾 ${esc(S('Lưu trữ'))}</h2><p class="bad-t small">${esc(S('Không tải được'))}: ${esc(e.message)}</p></section>`; return; }
      const repos = f.repos || [], T = f.target || 20000, soft = (repos[0] && repos[0].soft_mb) || 1000;
      const rows = repos.map(r => `<tr><td><b>${esc(r.id === 'main' ? S('repo chính') : r.id)}</b><br><span class="tiny muted">${esc(r.repo || '')}</span></td><td>${esc(S(ST[r.state] || r.state || ''))}</td>
        <td>${r.tree_mb == null ? esc(S('chưa đo')) : esc(String(r.tree_mb)) + ' MB'}</td><td>${r.api_mb == null ? '—' : esc(String(r.api_mb)) + ' MB'}</td><td>${n(r.files)}${r.soft_files ? `<span class="tiny muted"> / ${n(r.soft_files)}</span>` : ''}</td>
        <td style="min-width:120px">${bar(r.pct, r.id + ' ' + (r.pct ?? 0) + '%')}<span class="tiny">${esc(String(r.pct ?? 0))}%</span></td>
        <td style="min-width:120px">${bar(r.pct_target, r.id + ' ' + (r.pct_target ?? 0) + '%')}<span class="tiny">${esc(String(r.at_target_mb ?? '—'))} MB · ${esc(String(r.pct_target ?? 0))}%${r.at_target_files != null ? ' · ' + n(r.at_target_files) + ' ' + esc(S('tệp')) : ''}</span></td></tr>`).join('');
      const al = f.alerts || [], pf = f.pages_files || {}, md = f.media_mb || {};
      box.innerHTML = `<section class="card"><div class="row between"><h2>💾 ${esc(S('Dung lượng theo repo'))}</h2><button class="btn sm" type="button" id="stRe">${esc(S('Làm mới'))}</button></div>
        <p class="tiny muted">${esc(S('Đo lúc {d}', { d: f.at || '?' }))}</p>
        <div style="overflow-x:auto"><table class="tbl"><thead><tr><th scope="col">${esc(S('Repo'))}</th><th scope="col">${esc(S('Trạng thái'))}</th><th scope="col">${esc(S('Cây đầu nhánh'))}</th><th scope="col">${esc(S('Cả lịch sử (API)'))}</th><th scope="col">${esc(S('Số tệp'))}</th><th scope="col">%</th><th scope="col">${esc(S('Khi đủ {n} từ', { n: n(T) }))}</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="tiny muted">${esc(S('Trần mềm {mb} MB/repo · cảnh báo ở 70 %. Âm thanh mới vào kho audio đang mở (round-robin theo hash, infra/media-repos.json). Lịch sử git repo chính không viết lại – chỉ chặn tăng thêm (size-guard: cây ≤ 600 MB, ≤ 20 MB nhị phân/commit).', { mb: soft }))}</p></section>
        <section class="card"><h2>${esc(S('⚠️ Cảnh báo'))}</h2>${al.length ? `<ul>${al.map(a => `<li class="bad-t small">${esc(a)}</li>`).join('')}</ul>` : `<p class="small">${esc(S('✓ Không có cảnh báo (mọi repo < 70 %).'))}</p>`}</section>
        <section class="card"><h2>${esc(S('📈 Dự báo kho {n} từ', { n: n(T) }))}</h2><ul class="small">
          <li>${esc(S('Từ hiện có'))}: <b>${n(f.words_now)}</b> · ${esc(S('Cần thêm'))}: <b>${n(f.add)}</b></li>
          <li>${esc(S('Âm thanh từ mới'))}: <b>${esc(String(md.audio_new ?? '—'))} MB</b> · ${n(md.audio_files)} ${esc(S('tệp'))} · ${esc(S('Ảnh mới'))}: ${esc(String(md.images_new ?? '—'))} MB</li>
          <li>${esc(S('Tệp Pages (kho từ) hiện tại → khi đủ'))}: ${n(pf.lex_now)} → ${n(pf.lex_at_target)} (${esc(S('cổng'))} ${n(pf.gate)})</li></ul></section>`;
      const re = box.querySelector('#stRe'); if (re) re.onclick = load;
    }
    load();
  }
  window.AdminStorage = { render };
})();
