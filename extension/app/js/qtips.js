/* Mẹo chiến lược theo DẠNG CÂU HỎI (IELTS Reading/Listening, TOEIC Part 1–7, TOEFL iBT 2026) + ghi nhận tiến bộ theo kỹ năng × dạng câu
 * (tỉ lệ đúng, thời gian ước tính/câu) + trang tổng quan #/qstats. Tải lười cùng qengine.js. Tên dạng câu giữ nguyên thuật ngữ đề thi (tiếng Anh). */
(function (g) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const code = o => String(o).split(' ')[0];
  const label = o => String(o).slice(code(o).length + 1);

  // ---------- Phân loại dạng câu IELTS từ dữ liệu nhóm câu ----------
  function kindOf(gr) {
    if (!gr) return 'mcq';
    if (gr.photo) return 'p1';
    const ins = (gr.instr || '') + ' ' + (gr.title || '');
    if (gr.type === 'tfng' || gr.type === 'ynng' || gr.type === 'mcq' || gr.type === 'multi') return gr.type;
    if (gr.type === 'match') {
      if (/heading/i.test(ins) || (gr.options || []).map(code).some(x => /^[ivx]+$/i.test(x))) return 'headings';
      if (/correct ending/i.test(ins)) return 'endings';
      if (/where is|located|\bmap\b|\bplan\b|diagram/i.test(ins)) return 'map';
      if (/which (paragraph|text|advertisement|plan|section)/i.test(ins)) return 'info';
      if (/from the (passage|text)|list of (people|researchers|res)/i.test(ins) || /Look at the following/i.test(ins)) return 'features';
      return (gr.options || []).every(o => !label(o)) ? 'info' : 'lmatch';
    }
    if (/\bmap\b|\bplan\b|diagram/i.test(ins)) return 'map';
    if (gr.type === 'summary') return 'summary';
    if (gr.type === 'sentence') return 'sentence';
    return /choose .*from the (passage|text)/i.test(ins) ? 'rnotes' : 'notes';
  }

  // Tên dạng câu: thuật ngữ chính thức (giữ nguyên tiếng Anh như đề thi)
  const NAME = {
    tfng: 'True / False / Not Given', ynng: 'Yes / No / Not Given', mcq: 'Multiple Choice', multi: 'Multiple Choice (2 answers)',
    headings: 'Matching Headings', info: 'Matching Information', features: 'Matching Features', endings: 'Matching Sentence Endings',
    map: 'Map / Plan Labelling', lmatch: 'Matching', notes: 'Form / Note / Table Completion', rnotes: 'Note / Table / Flow-chart Completion',
    summary: 'Summary Completion', sentence: 'Sentence Completion',
    p1: 'Part 1 · Photographs', p2: 'Part 2 · Question-Response', p3: 'Part 3 · Conversations', p4: 'Part 4 · Talks',
    p5: 'Part 5 · Incomplete Sentences', p6: 'Part 6 · Text Completion', p7: 'Part 7 · Reading Comprehension',
    cw: 'Complete the Words', daily: 'Read in Daily Life', academic: 'Read an Academic Passage', response: 'Listen and Choose a Response',
    conversation: 'Listen to a Conversation', announcement: 'Listen to an Announcement', talk: 'Listen to an Academic Talk',
    sentenceB: 'Build a Sentence', email: 'Write an Email', discussion: 'Write for an Academic Discussion', repeat: 'Listen and Repeat', interview: 'Take an Interview',
  };
  // Mẹo: ngắn, đúng định dạng đề chính thức; gọi t() lúc vẽ (không lúc nạp module)
  const TIP = k => ({
    tfng: () => t('TRUE: bài nói đúng như vậy (thường bằng từ đồng nghĩa). FALSE: bài nói ngược lại. NOT GIVEN: bài không có đủ thông tin để kết luận. Chú ý từ hạn định như all, some, only, always; không dùng hiểu biết bên ngoài. Đáp án theo thứ tự trong bài.'),
    ynng: () => t('Câu hỏi về quan điểm của tác giả, không phải sự thật chung. YES: tác giả đồng ý; NO: tác giả phản đối; NOT GIVEN: tác giả không nêu ý kiến về điều đó. Để ý từ thể hiện thái độ (argue, claim, unfortunately…). Đáp án theo thứ tự trong bài.'),
    mcq: () => t('Gạch chân từ khóa trong câu hỏi trước khi đọc/nghe. Phương án lặp đúng từ trong bài thường là bẫy; đáp án đúng thường được diễn đạt lại. Trong Listening, người nói hay nhắc nhiều phương án – chọn ý cuối cùng được khẳng định.'),
    multi: () => t('Chọn đủ 2 đáp án (thứ tự không quan trọng, mỗi đáp án đúng được 1 điểm). Đọc kỹ cả 5 phương án; loại phương án được nhắc tới nhưng bị phủ định hoặc thuộc về người/đối tượng khác.'),
    headings: () => t('Đọc danh sách tiêu đề trước, rồi đọc câu đầu và câu cuối mỗi đoạn. Tiêu đề đúng tóm được ý chính của cả đoạn, không chỉ một chi tiết; cảnh giác với tiêu đề lặp đúng từ trong bài. Làm đoạn dễ trước để loại dần – luôn có nhiều tiêu đề hơn số đoạn.'),
    info: () => t('Đáp án không theo thứ tự trong bài và một đoạn có thể dùng nhiều lần. Xác định loại thông tin cần tìm (ví dụ, lý do, số liệu, so sánh…) rồi quét. Nên làm sau các dạng khác của cùng bài, khi bạn đã quen nội dung.'),
    features: () => t('Tìm và đánh dấu các tên (người, tổ chức, mốc thời gian) trong bài trước, rồi đọc kỹ quanh mỗi tên và so với nhận định đã được diễn đạt lại. Đáp án không theo thứ tự bài; một lựa chọn có thể dùng nhiều lần hoặc không dùng.'),
    endings: () => t('Đọc phần đầu câu và đoán phần còn thiếu cần gì (về nghĩa và ngữ pháp). Phần kết đúng phải khớp cả ngữ pháp lẫn nội dung bài. Câu hỏi theo thứ tự trong bài; luôn có nhiều phần kết hơn số câu.'),
    map: () => t('Trước khi nghe: xác định điểm xuất phát, hướng (bắc/nam, trái/phải) và các địa điểm đã có tên. Nghe từ chỉ vị trí: opposite, next to, behind, at the end of, turn left… Dò theo từng bước di chuyển trên bản đồ; đáp án theo thứ tự bài nghe.'),
    lmatch: () => t('Đọc danh sách lựa chọn trước và nghĩ sẵn từ đồng nghĩa. Người nói thường nhắc vài lựa chọn cho mỗi mục – chờ ý được khẳng định cuối cùng. Các mục hỏi theo thứ tự bài nghe; có lựa chọn không dùng tới.'),
    notes: () => t('Dùng thời gian trước khi nghe để đọc câu hỏi và đoán loại thông tin cần điền (tên, số, ngày, giá…). Người nói hay tự sửa (“…no, sorry, it’s 15”) – ghi thông tin cuối cùng. Viết đúng chính tả và không vượt giới hạn số từ; đáp án theo thứ tự bài nghe.'),
    rnotes: () => t('Tiêu đề ghi chú/bảng cho biết phần nào của bài cần đọc; đáp án thường theo thứ tự. Đoán loại từ cho từng chỗ trống, chép nguyên từ trong bài (không đổi dạng từ) và không vượt giới hạn số từ.'),
    summary: () => t('Đọc lướt cả đoạn tóm tắt để biết nó ứng với phần nào của bài, rồi đoán loại từ cho từng chỗ trống. Nếu chọn từ trong hộp, đáp án thường là từ đồng nghĩa chứ không phải từ y hệt bài. Điền xong kiểm tra ngữ pháp (số ít/số nhiều).'),
    sentence: () => t('Đọc cả câu và đoán loại từ cần điền (danh từ, số, tính từ…). Chép đúng từ trong bài, đúng chính tả, không vượt giới hạn số từ; câu điền xong phải đúng ngữ pháp. Đáp án thường theo thứ tự trong bài.'),
    p1: () => t('Nhìn ảnh trước khi nghe: ai, đang làm gì, đồ vật nào, ở đâu. Loại câu nhắc vật không có trong ảnh hoặc dùng từ phát âm gần giống. Cần phân biệt “is being + V3” (đang được làm – phải có người làm) với “has been + V3” (trạng thái đã xong).'),
    p2: () => t('Nghe thật kỹ từ để hỏi ở đầu câu (Who, When, Where, Why, How…). Loại câu trả lời lặp từ hoặc dùng từ phát âm giống câu hỏi. Câu trả lời gián tiếp (“Let me check”, “Ask Mr. Kim”) thường là đáp án đúng; câu hỏi Wh- không trả lời bằng Yes/No.'),
    p3: () => t('Đọc trước 3 câu hỏi (và biểu đồ nếu có) trong lúc nghe hướng dẫn. Câu hỏi thường theo thứ tự hội thoại: chủ đề/nơi chốn → chi tiết → việc sẽ làm tiếp theo. Đáp án thường là cách diễn đạt khác của lời nói.'),
    p4: () => t('Đọc trước câu hỏi. Câu đầu thường hỏi mục đích hoặc người nghe là ai – đáp án nằm ở vài câu mở đầu. Chú ý lời yêu cầu, đề nghị, thay đổi lịch ở cuối bài nói.'),
    p5: () => t('Nhìn 4 phương án trước: khác dạng từ (danh/động/tính/trạng từ) → xét vị trí chỗ trống; khác thì → tìm mốc thời gian và chủ ngữ; khác nghĩa → đọc cả câu. Nhiều câu chỉ cần 20–30 giây – để dành thời gian cho Part 7.'),
    p6: () => t('Giống Part 5 nhưng phải đọc câu trước và sau chỗ trống, nhất là với từ nối, thì của động từ và đại từ. Câu điền cả câu: chọn câu nối mạch ý với cả câu đứng trước và câu đứng sau.'),
    p7: () => t('Đọc câu hỏi trước rồi quét bài tìm từ khóa. Với nhóm nhiều văn bản, có câu phải ghép thông tin từ 2 văn bản. Câu “NOT true” và câu chèn câu tốn thời gian – có thể làm sau. Mục tiêu khoảng 1 phút mỗi câu.'),
    cw: () => t('Đọc cả câu để đoán từ (loại từ, nghĩa) rồi điền phần chữ còn thiếu cho đúng chính tả. Chú ý đuôi ngữ pháp: -s số nhiều, -ed quá khứ, -ly trạng từ. Làm nhanh các từ dễ trước.'),
    daily: () => t('Xác định loại văn bản (thông báo, email, tin nhắn, quảng cáo) và mục đích của nó. Câu hỏi chủ yếu về chi tiết thực tế: thời gian, địa điểm, việc người đọc cần làm – quét tìm số, ngày, tên.'),
    academic: () => t('Đọc câu chủ đề mỗi đoạn để nắm ý chính, rồi tìm chi tiết theo câu hỏi. Câu suy luận: chọn ý bài ngụ ý, không phải ý chỉ lặp từ. Câu từ vựng: thay phương án vào câu xem có giữ đúng nghĩa không.'),
    response: () => t('Nhận ra loại câu nói (hỏi thông tin, đề nghị, lời mời, phàn nàn) rồi chọn câu đáp tự nhiên nhất. Loại câu lặp từ của người nói nhưng không đáp đúng ý.'),
    conversation: () => t('Theo dõi vấn đề của người nói và giải pháp hoặc việc họ quyết định làm. Ghi chú ngắn: ai, cần gì, làm gì tiếp theo.'),
    announcement: () => t('Nắm mục đích thông báo (thay đổi, nhắc nhở, sự kiện) và việc người nghe phải làm (hạn chót, địa điểm, cách đăng ký).'),
    talk: () => t('Ghi chú theo cấu trúc: chủ đề chính → các ý phụ → ví dụ. Câu hỏi thường về ý chính, chi tiết quan trọng và vì sao giảng viên nhắc tới một ví dụ.'),
    sentenceB: () => t('Xác định chủ ngữ và động từ chính trước, rồi đặt trợ động từ/từ để hỏi, sau đó các cụm còn lại. Câu hỏi gián tiếp giữ trật tự câu khẳng định (…where the library is).'),
    email: () => t('Trả lời đủ mọi ý đề yêu cầu, giọng văn hợp với người nhận; có mở – thân – kết rõ ràng. Dành 1–2 phút cuối soát ngữ pháp và chính tả.'),
    discussion: () => t('Nêu rõ quan điểm ngay câu đầu, đưa 1–2 lý do có ví dụ cụ thể, và nhắc tới ý của người khác trong thảo luận để góp ý mới thay vì lặp lại.'),
    repeat: () => t('Nghe trọn câu và nhớ theo cụm ý, không nhớ từng từ. Nhắc lại đúng thứ tự, giữ trọng âm và ngữ điệu; nói rõ ràng quan trọng hơn nói nhanh.'),
    interview: () => t('Trả lời thẳng câu hỏi trong 1–2 câu đầu, rồi thêm lý do và ví dụ của bản thân. Nói tự nhiên, không học thuộc; nếu vấp thì tự sửa và nói tiếp.'),
  }[k]);
  const tip = k => { const f = TIP(k); return f ? f() : ''; };
  // Ô mẹo thu gọn (mặc định đóng để không che đề; open = mở sẵn)
  const box = (k, open) => { const s = tip(k); return s ? `<details class="qtip"${open ? ' open' : ''}><summary>💡 ${t('Mẹo làm bài')}${NAME[k] ? ` · <span translate="no">${esc(NAME[k])}</span>` : ''}</summary><p>${esc(s)}</p></details>` : ''; };

  // ---------- Ghi nhận tiến bộ: state.game.qstat['<kỹ năng>:<dạng>'] = { r: đúng, t: tổng, s: giây, d: lần cuối } ----------
  const SKILL = () => ({ il: ['🎧', 'IELTS Listening', '#/listening'], ir: ['📖', 'IELTS Reading', '#/rtype'], tl: ['🎧', 'TOEIC Listening', '#/toeic'], tr: ['📖', 'TOEIC Reading', '#/toeic'], fr: ['📖', 'TOEFL Reading', '#/toefl'], fl: ['🎧', 'TOEFL Listening', '#/toefl'], fw: ['✍️', 'TOEFL Writing', '#/toefl'] });
  const RT = { notes: 'completion', rnotes: 'completion', summary: 'completion', sentence: 'completion', tfng: 'tfng', ynng: 'ynng', mcq: 'mcq', multi: 'multi', headings: 'headings', info: 'info', features: 'features', endings: 'features' };
  const practiceLink = (sk, k) => sk === 'ir' && RT[k] ? '#/rtype/' + RT[k] : sk[0] === 'f' && NAME[k] ? '#/toefl-p/' + (k === 'sentenceB' ? 'sentence' : k) : SKILL()[sk][2];
  // Thời gian làm: từ lúc QE.bind (data-qe-t0) tới lúc chấm, chặn 0–3 giờ
  const secsOf = root => { const t0 = root && +root.dataset.qeT0; return t0 ? Math.max(0, Math.min(10800, Math.round((Date.now() - t0) / 1000))) : 0; };
  // tally: { dạng: { r, t } }; secs chia theo số câu từng dạng
  async function save(sk, tally, secs) {
    const tot = Object.values(tally).reduce((a, v) => a + v.t, 0); if (!tot || !g.Game || !g.App) return;
    g.App.state.game = await Game.mutate(gs => {
      gs.qstat = gs.qstat || {};
      for (const [k, v] of Object.entries(tally)) { const key = sk + ':' + k, o = gs.qstat[key] || { r: 0, t: 0, s: 0 }; gs.qstat[key] = { r: o.r + v.r, t: o.t + v.t, s: (o.s || 0) + Math.round(secs * v.t / tot), d: Date.now() }; }
    });
  }
  // res: kết quả QE.collect (mỗi câu có .kind); kind cố định (TOEIC part/TOEFL task) đè lên
  function record(sk, res, root, kind) {
    const tally = {};
    Object.values(res || {}).forEach(r => { const k = (typeof kind === 'function' ? kind(r) : kind) || r.kind || 'mcq'; (tally[k] = tally[k] || { r: 0, t: 0 }); tally[k].t++; if (r.ok) tally[k].r++; });
    const r = Object.values(tally).reduce((a, v) => a + v.r, 0), n = Object.values(tally).reduce((a, v) => a + v.t, 0);
    if (n && g.dispatchEvent) g.dispatchEvent(new CustomEvent('lexkite:test-done', { detail: { sk, r, t: n } })); // lớp học (classroom.js) ghi bài được giao
    return save(sk, tally, secsOf(root));
  }
  // Thẻ kết quả theo dạng câu cho trang kết quả thi thử: tỉ lệ đúng từng dạng + mẹo cho dạng yếu nhất (< 75%)
  function summary(res, head, kind) {
    const by = {};
    Object.values(res || {}).forEach(r => { const k = kind ? kind(r) : r.kind || 'mcq'; (by[k] = by[k] || { r: 0, t: 0 }); by[k].t++; if (r.ok) by[k].r++; });
    const rows = Object.entries(by).sort((a, b) => a[1].r / a[1].t - b[1].r / b[1].t); if (!rows.length) return '';
    const weak = rows.find(([, v]) => v.r / v.t < 0.75);
    return `<div class="card"><h3 style="margin-top:0">📊 ${head ? `<span translate="no">${esc(head)}</span> · ` : ''}${t('Kết quả theo dạng câu hỏi')}</h3>${rows.map(([k, v]) => { const p = Math.round(v.r / v.t * 100); return `<div class="qs-row"><span><span translate="no">${esc(NAME[k] || k)}</span><div class="bar"><i class="${p >= 75 ? 'ok' : p < 50 ? 'no' : ''}" style="width:${p}%"></i></div></span><span class="num">${v.r}/${v.t}</span><span class="num"><b>${p}%</b></span></div>`; }).join('')}
      ${weak ? box(weak[0], true) : ''}<div class="tiny" style="margin-top:.5rem"><a href="#/qstats">📊 ${t('Xem tiến bộ theo kỹ năng và dạng câu hỏi')} →</a></div></div>`;
  }
  const recordRaw =(sk, kind, r, n, secs) => n ? save(sk, { [kind]: { r, t: n } }, secs || 0) : Promise.resolve();

  // ---------- CSS (tiêm khi tải – không làm nặng khung app) ----------
  if (g.document && !document.getElementById('qtipCss')) {
    const st = document.createElement('style'); st.id = 'qtipCss';
    st.textContent = `.qtip{margin:.45rem 0 .2rem;border:1px solid var(--line);border-left:3px solid var(--primary);border-radius:10px;background:var(--surface-2,var(--bg));font-size:.88rem}
.qtip summary{cursor:pointer;padding:.4rem .7rem;font-weight:700;list-style-position:inside}.qtip summary:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.qtip p{margin:0;padding:0 .7rem .55rem;line-height:1.5}
.qs-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))}
.qs-row{display:grid;grid-template-columns:minmax(0,1fr) 3.2rem 3.4rem;gap:.5rem;align-items:center;padding:.45rem 0;border-bottom:1px solid var(--line);font-size:.88rem}
.qs-row:last-child{border-bottom:0}.qs-row .bar{height:6px;border-radius:4px;background:var(--line);margin-top:.25rem;overflow:hidden}.qs-row .bar i{display:block;height:100%;background:var(--primary)}
.qs-row .bar i.ok{background:var(--good)}.qs-row .bar i.no{background:var(--again,#e5502f)}.qs-row .num{text-align:right;font-variant-numeric:tabular-nums}
.qs-kpi{display:flex;gap:1rem;flex-wrap:wrap;margin:.3rem 0 .6rem}.qs-kpi b{font-size:1.25rem;display:block}`;
    document.head.appendChild(st);
  }

  // ---------- Trang tổng quan #/qstats ----------
  if (g.App && g.App.routes) g.App.routes.qstats = function () {
    const view = g.App.view, q = (g.App.state.game || {}).qstat || {};
    const by = {};
    for (const [key, v] of Object.entries(q)) { const [sk, k] = key.split(':'); if (!SKILL()[sk] || !v.t) continue; (by[sk] = by[sk] || []).push({ k, ...v }); }
    const fmt = s => s >= 60 ? t('{m} phút {s} giây', { m: Math.floor(s / 60), s: s % 60 }) : t('{s} giây', { s });
    const cards = Object.keys(SKILL()).filter(sk => by[sk]).map(sk => {
      const rows = by[sk].sort((a, b) => a.r / a.t - b.r / b.t), R = rows.reduce((a, x) => a + x.r, 0), N = rows.reduce((a, x) => a + x.t, 0), S = rows.reduce((a, x) => a + (x.s || 0), 0), pct = Math.round(R / N * 100);
      const weak = rows.find(x => x.t >= 3 && x.r / x.t < 0.75);
      return `<div class="card"><h3 style="margin:0">${SKILL()[sk][0]} <span translate="no">${SKILL()[sk][1]}</span></h3>
        <div class="qs-kpi"><span><b>${pct}%</b><span class="tiny muted">${t('tỉ lệ đúng')}</span></span><span><b>${N}</b><span class="tiny muted">${t('câu đã làm')}</span></span>${S ? `<span><b>${fmt(Math.round(S / N))}</b><span class="tiny muted">${t('mỗi câu (ước tính)')}</span></span>` : ''}</div>
        <div role="table" aria-label="${esc(SKILL()[sk][1])}"><div class="qs-row tiny muted" role="row"><span role="columnheader">${t('Dạng câu hỏi')}</span><span class="num" role="columnheader">${t('Đúng')}</span><span class="num" role="columnheader">⏱</span></div>
        ${rows.map(x => { const p = Math.round(x.r / x.t * 100); return `<div class="qs-row" role="row"><span role="cell"><a href="${practiceLink(sk, x.k)}" translate="no">${esc(NAME[x.k] || x.k)}</a><span class="tiny muted"> · ${t('{n} câu', { n: x.t })}</span><div class="bar"><i class="${p >= 75 ? 'ok' : p < 50 ? 'no' : ''}" style="width:${p}%"></i></div></span><span class="num" role="cell"><b>${p}%</b></span><span class="num tiny muted" role="cell">${x.s ? fmt(Math.round(x.s / x.t)) : '–'}</span></div>`; }).join('')}</div>
        ${weak ? `<div style="margin-top:.6rem"><div class="small"><b>🎯 ${t('Nên luyện tiếp:')}</b> <a href="${practiceLink(sk, weak.k)}" translate="no">${esc(NAME[weak.k] || weak.k)}</a></div>${box(weak.k)}</div>` : ''}</div>`;
    });
    view.innerHTML = `<div class="page-head"><div><h1>📊 ${t('Tiến bộ theo kỹ năng và dạng câu hỏi')}</h1><p class="muted">${t('Tổng hợp từ các bài luyện và thi thử của bạn trên Lexkite. Đây là tỉ lệ đúng trong bài luyện của bạn – <b>không phải điểm thi chính thức</b>. Thời gian mỗi câu là ước tính: thời gian trên trang chia cho số câu.')}</p></div></div>
      ${cards.length ? `<div class="qs-grid">${cards.join('')}</div>` : `<div class="card empty"><div class="em">📭</div><p>${t('Chưa có dữ liệu. Làm một bài luyện Listening/Reading (IELTS, TOEIC hoặc TOEFL) để bắt đầu theo dõi.')}</p></div>`}
      <div class="row" style="margin-top:1rem;flex-wrap:wrap"><a class="btn" href="#/rtype">🎯 ${t('Luyện Reading theo dạng câu hỏi')}</a><a class="btn" href="#/listening">🎧 IELTS Listening</a><a class="btn" href="#/toeic">💼 TOEIC</a><a class="btn" href="#/toefl">🎓 TOEFL iBT</a></div>`;
  };

  g.QT = { kindOf, NAME, tip, box, record, recordRaw, secsOf, summary };
})(typeof self !== 'undefined' ? self : this);
