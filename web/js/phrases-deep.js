/* Giải thích sâu cho bảng "Dịch" (js/phrases.js): phân tích từ vựng tức thì + giải thích AI. Tải lười khi bấm 🤖 – ngoài khung app. */
(function () {
  const { $, esc } = UI;
  // ctx: { pop, info, L, place(el, rect) } – bảng đang mở, vùng chọn, ngôn ngữ người học, đặt lại vị trí bảng
  window.PhDeep = async function (btn, { pop, info, L, place }) {
    const out = $('[data-aiout]', pop); btn.disabled = true;
      // 1) Phân tích từ vựng tức thì, miễn phí (từ điển sẵn có) – luôn có kết quả, không phụ thuộc AI
      const STOP = new Set('the a an and or but of to in on at for with by from as is are was were be been being it its this that these those which who whom whose what when where why how than then there their they them we our you your he she his her i me my not no do does did have has had can could will would should may might must shall also very more most such into over under about after before between through during without within upon'.split(' '));
      const ws = [...new Set((info.text.match(/[A-Za-z][A-Za-z'-]{3,}/g) || []).map(x => x.toLowerCase()).filter(x => !STOP.has(x)))].slice(0, 8);
      out.innerHTML = `<div class="small muted">${UI.icon('hourglass')} ${t('Đang phân tích từ vựng…')}</div>`;
      // Nhanh & tiết kiệm: từ có trong thư viện → lấy ngay trên máy; từ còn lại → 1 lượt dịch gộp duy nhất (không gọi từng từ)
      const lem = w0 => (App.lemma && App.lemma(w0)) || w0;
      const local = ws.map(w0 => IELTS_DATA.INDEX[lem(w0)] || IELTS_DATA.INDEX[w0] || null);
      const miss = ws.filter((w0, i) => !local[i]);
      const tr = miss.length ? (await (L === 'vi' ? Dict.translateVi(miss.map(lem).join('\n')) : Dict.translateTo(miss.map(lem).join('\n'), L)).catch(() => '')).split('\n') : [];
      const looks = ws.map((w0, i) => { const loc = local[i]; if (loc) return { w: loc.word, vi: App.meanOf ? App.meanOf(loc) : loc.vi, ipa: loc.ipa || '', pos: loc.pos || '' }; const k = miss.indexOf(w0), vi = (tr[k] || '').trim(); return vi && vi.toLowerCase() !== lem(w0) ? { w: lem(w0), vi: L === 'vi' ? Dict.fixVi(vi) : vi, ipa: '', pos: '' } : null; });
      const vocab = looks.filter(Boolean);
      out.innerHTML = `${vocab.length ? `<div class="st-box"><b class="small">${UI.icon('library')} ${t('Từ vựng quan trọng')}</b>${vocab.map(v => `<div class="st-row"><b>${esc(v.w)}</b> <span class="muted small">${esc(v.ipa)} ${esc(v.pos)}</span><div class="small">${esc(v.vi)}</div></div>`).join('')}</div>` : ''}<div data-ai2></div>`;
      place(pop, info.rect);
      // 2) Giải thích sâu bằng AI miễn phí (không đòi khóa); mất mạng → báo rõ + đề nghị tải AI của Chrome
      const box = $('[data-ai2]', out);
      const run = async () => {
        box.innerHTML = `<div class="small muted">${UI.icon('hourglass')} ${t('AI đang phân tích…')}</div>`;
        try { box.innerHTML = AI.renderExplain(await AI.explain(info.text, info.sentence)); } catch (e) { box.innerHTML = `<div class="small">⚠️ ${esc(AI.errText(e))}</div>`; }
        place(pop, info.rect);
      };
      if (!window.AI) { btn.disabled = false; return; }
      const key = await AI.getKey(), st = key ? 'key' : await AI.nanoStatus();
      if (key || st === 'available' || navigator.onLine !== false) await run();
      else box.innerHTML = `<div class="tip small" style="margin-top:.5rem">${t('AI không dùng được khi ngoại tuyến – kết nối mạng rồi thử lại.')}
        ${st === 'downloadable' || st === 'downloading' ? `<div class="row" style="gap:.4rem;margin-top:.4rem"><button class="btn sm" data-dl>⬇️ ${t('Tải AI của Chrome (~2GB, 1 lần)')}</button></div>` : ''}</div>`;
      const dl = $('[data-dl]', box); if (dl) dl.onclick = () => { dl.disabled = true; AI.onNanoProgress && AI.onNanoProgress(p => { dl.textContent = `⬇️ ${Math.round(p * 100)}%`; }); run(); };
      btn.disabled = false;
  };
})();
