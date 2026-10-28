/* 🧩 Bài học trộn bài tập nhỏ (#/lesson) – giao diện. Lõi: js/lesson/engine.js · giáo viên: js/lesson/teacher.js · thiết kế: docs/LESSON-ENGINE.md.
 * Cờ `lesson_mix` (App.lessonOn). Demo: #/lesson?demo=1 (bộ từ mẫu, KHÔNG ghi FSRS/XP). 0 tim, 0 năng lượng, không giới hạn số bài.
 * Ghi FSRS cuối bài (LessonEngine.results): sai → Quên (grade 0, chưa có thẻ thì thêm thẻ) · đến hạn + đúng ngay → Nhớ (grade 2). */
(function () {
  const { $, esc } = UI;
  const App = window.App, { state, routes } = App, view = App.view, E = window.LessonEngine;
  const OFF_KEY = 'lk.lsn.off', HOUR = 36e5;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* riêng tư */ } } };
  const offNow = () => { try { const o = JSON.parse(ls.get(OFF_KEY) || '{}'), now = Date.now(); return { listen: (o.listen || 0) > now, speak: (o.speak || 0) > now }; } catch (e) { return {}; } };
  const setOff = k => { let o = {}; try { o = JSON.parse(ls.get(OFF_KEY) || '{}'); } catch (e) { /* hỏng → mới */ } o[k] = Date.now() + HOUR; ls.set(OFF_KEY, JSON.stringify(o)); };
  const learnVi = () => (window.I18N && I18N.learnLang ? I18N.learnLang() : 'vi') === 'vi';
  const meanOf = c => (App.meanOf ? App.meanOf(c) : '') || c.vi || c.def || '';

  // Bộ khởi đầu (người mới, chưa có thẻ) và bộ demo cho anh duyệt: từ có ảnh đúng từ#loại + gold bank. Nghĩa vi; ngôn ngữ khác → App.meanOf / gói nghĩa.
  const now0 = Date.now();
  const SRS = (due, reps) => ({ ef: 2.5, interval: reps ? 3 : 0, reps: reps || 0, lapses: 0, due, last: reps ? due - 3 * 864e5 : null, step: 0, S: reps ? 3 : null, D: reps ? 5 : null });
  const DEMO = () => [
    { word: 'consider', pos: 'verb', ipa: '/kənˈsɪd.ər/', ipaUS: '/kənˈsɪd.ɚ/', vi: 'cân nhắc, xem xét', def: 'to think carefully about something', ctx: "We're considering moving to a new city.", src: 'news.example.com', sentences: [{ en: "We're considering moving to a new city.", vi: 'Chúng tôi đang cân nhắc chuyển tới một thành phố mới.' }], srs: SRS(now0 - 864e5, 2) },
    { word: 'afraid', pos: 'adjective', ipa: '/əˈfreɪd/', ipaUS: '/əˈfreɪd/', vi: 'sợ', def: 'feeling fear', ex: "She's afraid of the dark.", sentences: [{ en: "She's afraid of the dark.", vi: 'Cô ấy sợ bóng tối.' }], srs: SRS(now0 - 2 * 864e5, 3) },
    { word: 'salary', pos: 'noun', ipa: '/ˈsæl.ər.i/', ipaUS: '/ˈsæl.ɚ.i/', vi: 'tiền lương', def: 'money you get every month for your job', ex: 'Her salary is paid every month.', sentences: [{ en: 'Her salary is paid every month.', vi: 'Lương của cô ấy được trả hằng tháng.' }], srs: SRS(now0, 0) },
    { word: 'key card', pos: 'noun', ipa: '/ˈkiː ˌkɑːd/', ipaUS: '/ˈkiː ˌkɑːrd/', vi: 'thẻ từ (mở cửa phòng)', def: 'a plastic card that opens a door', ex: "My key card doesn't work.", srs: SRS(now0, 0) },
    { word: 'decide', pos: 'verb', ipa: '/dɪˈsaɪd/', ipaUS: '/dɪˈsaɪd/', vi: 'quyết định', def: 'to choose after thinking', ctx: 'We decided to stay at home tonight.', src: 'blog.example.com', sentences: [{ en: 'We decided to stay at home.', vi: 'Chúng tôi quyết định ở nhà.' }], srs: SRS(now0 + 5 * 864e5, 2) },
    { word: 'listen', pos: 'verb', ipa: '/ˈlɪs.ən/', ipaUS: '/ˈlɪs.ən/', vi: 'lắng nghe', def: 'to pay attention to sound', ex: 'I like listening to music.', srs: SRS(now0 - 864e5, 1) },
  ].map(c => (learnVi() ? c : Object.assign({}, c, { sentences: [] }))); // câu song ngữ mẫu chỉ có tiếng Việt → ngôn ngữ khác bỏ dạng dịch
  const STARTER = () => DEMO().map(c => Object.assign({}, c, { ctx: '', src: '', srs: SRS(now0, 0) }));

  // Ảnh đúng từ#loại (cùng chỉ mục của VImg; bài học có cờ riêng nên tự tra chỉ mục nhỏ, SW đệm)
  let imgIdx = null;
  const imgP = () => imgIdx ? Promise.resolve(imgIdx) : fetch('js/lexicon-img.json').then(r => (r.ok ? r.json() : null)).then(j => (imgIdx = j && j.m ? j : { m: {} })).catch(() => (imgIdx = { m: {} }));
  const POSK = p => (window.VImg ? VImg.pos(p) : String(p || '').slice(0, 3).replace('nou', 'n').replace('ver', 'v'));
  const imgKey = (w, p) => String(w).toLowerCase() + '#' + POSK(p);
  const imgUrl = (w, p) => { const h = imgIdx && imgIdx.m[imgKey(w, p)]; return h ? imgIdx.base + h + '.webp' : ''; };

  function css() {
    if ($('#lsnCss')) return;
    const st = document.createElement('style'); st.id = 'lsnCss';
    st.textContent = `.lsn{max-width:640px;margin:0 auto;display:flex;flex-direction:column;padding:0 1rem calc(var(--lsn-fh,8rem) + 1.5rem)}
/* 🎨 Giao diện câu hỏi/tấm phản hồi = class Tailwind của mẫu Stitch (web/js/st/lesson.js · css/st-lesson.css); dưới đây chỉ bố cục + trạng thái */
.lsn-combo{visibility:hidden}.lsn-combo.on{visibility:visible}
.lsn-av.tch{position:relative}.tch-rig{position:absolute;inset:0}.tch-rig img,.tch-rig canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%}.tch-rig.live img{visibility:hidden}
.lsn-av .tch-rig img,.lsn-av .tch-rig canvas{object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))}
.lsn-tile.used{visibility:hidden}.lsn-opt.done{opacity:.35}.lsn-opt.miss{background:rgb(var(--st-error-container))}
.lsn-foot{position:fixed;left:0;right:0;bottom:0;z-index:30;max-height:80vh;overflow-y:auto;padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom))}
.lsn-foot>*{max-width:608px;margin-inline:auto}.lsn-foot.sheet{display:flex;flex-direction:column;gap:1rem;padding-bottom:calc(1.5rem + env(safe-area-inset-bottom))}.lsn-foot.sheet>*{width:100%}
.lsn.st-end .lsn-ask,.lsn.st-end .lsn-meta{display:none}.lsn.st-dim::after{content:"";position:fixed;inset:0;z-index:25;background:rgb(var(--st-surface)/.6);animation:st-fade .18s ease both;pointer-events:none} /* tấm phản hồi: phần câu hỏi lùi sau lớp phủ (mẫu Stitch) */
.lsn-end{text-align:center}@media (max-width:420px){.lsn-stats{grid-template-columns:repeat(2,1fr)!important}}.lsn-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin:1rem 0}.lsn-stats div{background:var(--surface-2);border-radius:14px;padding:.7rem .3rem}.lsn-stats b{display:block;font-size:1.4rem}
.lsn-duo{position:relative;display:flex;justify-content:center;gap:1rem}.lsn-duo .tch{width:110px;height:146px;position:relative;transition:transform .2s ease,filter .2s ease}
.lsn-duo .tch.talk{transform:scale(1.06);filter:drop-shadow(0 0 5px var(--primary))}.lsn-air{position:absolute;top:-.6rem;left:50%;transform:translateX(-50%);z-index:2;font-size:.7rem;font-weight:800;color:#fff;background:var(--again);border-radius:99px;padding:.1rem .5rem}
.lsn-chat{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.4rem;max-height:38vh;overflow:auto}.lsn-ln{background:var(--surface-2);border-radius:14px;padding:.45rem .7rem;max-width:85%}.lsn-ln.carlos{align-self:flex-end;background:var(--primary-soft)}.lsn-ln b{display:block;font-size:.75rem;color:var(--muted)}
/* bản đồ */
.lsn-map .lsn-path{list-style:none;margin:1rem 0;padding:0;display:flex;flex-direction:column;align-items:center;gap:1.4rem}
.lsn-map .lsn-node{position:relative;transform:translateX(var(--x));display:flex;flex-direction:column;align-items:center}
.lsn-map .lsn-dot{width:76px;height:70px;border-radius:50%;display:grid;place-items:center;background:var(--surface-3);color:var(--muted);box-shadow:0 6px 0 var(--line);text-decoration:none}
.lsn-map .lsn-dot svg{width:32px;height:32px}.lsn-map .lsn-node.done .lsn-dot{background:var(--done);color:var(--on-done);box-shadow:0 6px 0 var(--done-ink)}
.lsn-map .lsn-node.next .lsn-dot{width:92px;height:84px;background:var(--primary);color:#fff;box-shadow:0 7px 0 var(--primary-ink);animation:lsnGlow 1.6s ease-in-out infinite}
.lsn-map .lsn-start{margin-bottom:.7rem;min-width:180px;animation:lsnBob 1.6s ease-in-out infinite}
@keyframes lsnGlow{0%,100%{filter:drop-shadow(0 0 0 transparent)}50%{filter:drop-shadow(0 0 14px var(--primary))}}
@keyframes lsnBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.lsn-tw{position:relative;flex:none}.lsn-emo{position:absolute;right:-8px;top:-8px;font-size:1.2rem;opacity:0}.lsn-emo.on{animation:lsnEmo .9s ease forwards}
@keyframes lsnEmo{0%{opacity:0}25%{opacity:1}70%{opacity:1}100%{opacity:0}}
/* Chuyển động tiết chế (chủ 28/10): chỉ mờ dần 150–200 ms, không nảy/rung/phát sáng/pháo giấy */
.lsn-combo.on,.lsn-tile.pop,.tch.nod,.tch.shake,.lsn-bar.glow i,.lsn-node.next .lsn-dot,.lsn-start,.lsn-big:active{animation:none;transform:none}
.lsn-emo{display:none}.lsn-bar i{transition:width .18s ease}
.lsn-foot.ok,.lsn-foot.bad{animation:lsnFade .18s ease-out}@keyframes lsnFade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.lsn-bar i,.lsn-combo.on,.lsn-node.next .lsn-dot,.lsn-start,.lsn-tile.pop,.lsn-emo.on,.tch.nod,.tch.shake,.lsn-bar.glow i,.lsn-foot.ok,.lsn-foot.bad{transition:none;animation:none}.lsn-emo.on{opacity:1;transform:none}}`;
    document.head.appendChild(st);
  }

  let L = null; // bài đang chạy
  App.lessonState = () => L; // cho test CI (scripts/test/lesson.mjs) – chỉ đọc
  const cleanup = () => { if (L) { if (L.teacher) L.teacher.destroy(); if (L.rec && L.rec.stop) try { L.rec.stop(); } catch (e) { /* đã dừng */ } L.dead = true; } L = null; if (footRO) { footRO.disconnect(); footRO = null; } const f = $('#lsnFoot'); if (f) f.remove(); };
  let footRO = null; // chân bài học cố định: đo chiều cao thật (phiếu đúng/sai + "Vì sao?") → chừa đủ chỗ cuối trang, không che nội dung

  // Tiến độ bản đồ: số nút đã xong (bền, không theo ngày – như lộ trình). Demo dùng khóa riêng.
  const PKEY = demo => (demo ? 'lk.lsn.path.demo' : 'lk.lsn.path');
  const pathN = demo => Math.max(0, parseInt(ls.get(PKEY(demo)) || '0', 10) || 0);
  const Q = demo => (demo ? '?demo=1' : '');
  const KICON = { lesson: 'star', listen: 'headphones', speak: 'mic', review: 'repeat', story: 'book-open', radio: 'audio-lines' };
  const KNAME = k => ({ lesson: t('Bài học'), listen: t('Nghe'), speak: t('Nói'), review: t('Ôn lỗi'), story: t('Truyện'), radio: 'Radio' }[k]);
  const STORIES = kind => (window.LESSON_STORIES || []).filter(s => s.kind === kind);
  const meanLang = () => { try { return (I18N.meanLang && I18N.meanLang()) || I18N.lang() || 'en'; } catch (e) { return 'en'; } };

  routes.lesson = async function (arg) {
    css(); cleanup();
    const demo = /[?&]demo=1\b/.test(location.hash);
    if (!demo && !(App.lessonOn && App.lessonOn())) { view.innerHTML = `<div class="card center"><p>${t('Bài học trộn đang thử nghiệm, sắp ra mắt.')}</p><a class="btn primary" href="#/home">${t('Quay về trang chủ')}</a></div>`; return; }
    if (window.I18N && I18N.whenReady) await I18N.whenReady();
    const cards = demo ? DEMO() : Object.values(state.cards || {});
    const ux = !!(window.Ux1 && App.ux1On && App.ux1On()), has = { story: STORIES('story').length, radio: STORIES('radio').length }, n = pathN(demo); // 🧭 cờ ux1: chặng theo mục tiêu + trình độ (docs/LEARNING-PATH.md)
    const plan = ux ? Ux1.plan(E, cards, has, n) : E.pathPlan(cards, Date.now(), has), node = plan[n % plan.length];
    if (arg !== 'go') return ux ? Ux1.map({ demo, plan, n }) : map(demo, plan, n);
    if (node.kind === 'exam') { ls.set(PKEY(demo), String(n + 1)); location.hash = Ux1.check(n).href; return; } // nút kiểm tra kỹ năng thi → module thi có sẵn
    await imgP();
    // Truyện / Radio: bài tiếp theo chưa nghe (xoay vòng), Ama ↔ Carlos đọc bằng giọng Kokoro sinh sẵn
    const SK = 'lk.lsn.s.' + node.kind + (demo ? '.demo' : ''), sl = STORIES(node.kind), story = sl.length ? sl[(parseInt(ls.get(SK) || '0', 10) || 0) % sl.length] : null;
    const picks = story ? [] : E.pickWords(cards, { n: 4, starter: ux ? Ux1.words(n, plan.length).map(w => Object.assign({}, w, { ctx: '', src: '', srs: SRS(now0, 0) })).concat(STARTER()) : STARTER(), mode: node.kind }); // ux1: từ chủ đề vừa sức (i+1) // 4 từ ≈ 9 bài ≈ 2–3 phút
    const items = story ? E.storyItems(story, meanLang(), n + 1) : E.build(picks, { seed: demo ? 7 + n : Date.now(), pool: cards.concat(STARTER()), hasImg: (w, p) => !!imgUrl(w, p), off: offNow(), only: E.KIND[node.kind], calm: ux });
    const prev = ls.get('lk.lsn.who'), who = prev === 'ama' ? 'carlos' : 'ama'; ls.set('lk.lsn.who', who); // xen kẽ Ama / Carlos mỗi bài
    L = { demo, items, sess: new E.Session(items, { ease: ux }), picks, who: story ? 'ama' : who, t0: Date.now(), spoken: 0, kind: node.kind, story, SK };
    if (demo) App._lsn = L; // bài thử: gác bố cục CI (scripts/test/ux1-guard.mjs) đọc câu hiện tại để trả lời đúng/sai có chủ đích
    App.onCleanup(cleanup);
    const X = (App.EXAMS || {})[App.exam ? App.exam() : ''], tg = (state.settings || {}).examTarget; // chip kỳ thi trên thẻ câu hỏi: "IELTS · Mục tiêu 7.5"
    document.body.classList.add('st'); App.onCleanup(() => document.body.classList.remove('st'));
    view.innerHTML = ST.lsnShell({ close: `#/lesson${Q(demo)}`, closeLabel: t('Thoát bài học'), title: KNAME(node.kind) || t('Bài học'), icon: { lesson: 'star', listen: 'headphones', speak: 'mic', review: 'replay', story: 'auto_stories', radio: 'radio' }[node.kind] || 'star', barLabel: t('Tiến độ bài học'), chip: X ? X.short + (tg ? ' · ' + t('Mục tiêu {s}', { s: tg }) : '') : '', who: TNAME(L.who) + ' · ' + t('Giáo viên của bạn'),
      story: story ? ST.lsnStory(story.kind === 'radio' ? '● ON AIR' : '') : '' }); // 🎨 mẫu Stitch "Speaking Micro-Drill" (web/js/st/lesson.js)
    const foot = document.createElement('div'); foot.className = ST.FOOT; foot.id = 'lsnFoot'; document.body.appendChild(foot);
    if (window.ResizeObserver) { footRO = new ResizeObserver(() => view.style.setProperty('--lsn-fh', foot.offsetHeight + 'px')); footRO.observe(foot); }
    try { L.teacher = window.LessonTeacher ? LessonTeacher.mount($('#lsnTch'), L.who) : null; if (story && L.teacher) L.teachers = { ama: L.teacher, carlos: LessonTeacher.mount($('#lsnTch2'), 'carlos') }; } catch (e) { L.teacher = null; L.teachers = null; }
    next();
  };

  // 🗺️ Bản đồ chặng: MỘT nút "tiếp theo" phát sáng + nút BẮT ĐẦU to; nút đã xong ✓, nút sau mờ. Không menu, không phải chọn.
  function map(demo, plan, n) {
    const unit = Math.floor(n / plan.length) + 1, at = n % plan.length;
    const nodes = plan.map((p, i) => {
      const st = i < at ? 'done' : i === at ? 'next' : 'lock', x = [0, 34, 0, -34, 0, 34][i % 6];
      return `<li class="lsn-node ${st}" style="--x:${x}px">${st === 'next' ? `<a class="btn primary lg lsn-start" href="#/lesson/go${Q(demo)}">${t('Bắt đầu')}</a>` : ''}
        ${st === 'next' ? `<a class="lsn-dot" href="#/lesson/go${Q(demo)}" aria-label="${esc(KNAME(p.kind))}">` : `<span class="lsn-dot" role="img" aria-label="${esc(KNAME(p.kind))}${st === 'done' ? ' ✓' : ''}">`}${st === 'done' ? UI.icon('circle-check') : UI.icon(KICON[p.kind])}${st === 'next' ? '</a>' : '</span>'}</li>`;
    }).join('');
    view.innerHTML = `<div class="lsn lsn-map"><div class="lsn-top"><a class="icon-btn lsn-x" href="#/home?all=1" aria-label="${t('Quay về trang chủ')}">${UI.icon('layout-grid')}</a><b class="grow center">${t('Chặng học {n}', { n: unit })}</b><span class="chip">${at}/${plan.length}</span></div>
      ${demo ? `<p class="tiny muted center" style="margin:0">${t('Bài thử (không lưu tiến độ)')}</p>` : ''}
      <ol class="lsn-path">${nodes}</ol><p class="tiny muted center">${t('Miễn phí, không giới hạn')}</p></div>`;
  }

  const say = (text, slow, who, onEnd) => {
    if (!L) return;
    const T = (L.teachers && who && L.teachers[who]) || L.teacher, rate = slow ? 0.7 : 0.95;
    if (L.teachers) { ['ama', 'carlos'].forEach(k => { const el = $(k === 'ama' ? '#lsnTch' : '#lsnTch2'); if (el) el.classList.toggle('talk', k === who); }); }
    if (T) T.say(text, { rate, voice: L.story && who && window.LessonTeacher ? LessonTeacher.VOICE[who] : null, onEnd }); else { UI.tts(text, 'en-US', rate, { onEnd }); }
  };
  // Chip kỳ thi trên thẻ câu hỏi (Tactile): "IELTS · Mục tiêu 7.5" – lấy từ mục tiêu đã chọn, không có thì ẩn
  const examChip = () => { const s = state.settings || {}, X = (App.EXAMS || {})[App.exam ? App.exam() : ''], tg = s.examTarget; return X ? `<div class="lsn-ex"><span class="tk-chip gold">${esc(X.short)}${tg ? ' · ' + esc(t('Mục tiêu {s}', { s: tg })) : ''}</span></div>` : ''; };
  const TNAME = w => (w === 'carlos' ? 'Carlos' : 'Ama');
  const TITLE = it => ({
    gap: t('Chọn từ còn thiếu'),
    build: t('Xếp thành câu'),
    say: t('Nói câu này'),
    pic: it.choice ? t('Đây là gì?') : t('Nói tên hình'),
    tr: t('Dịch câu này'),
    mean: t('Chọn từ đúng'),
    type: it.noAudio ? t('Gõ từ tiếng Anh') : t('Gõ từ bạn nghe'),
    match: t('Ghép cặp'),
    q: t('Trả lời câu hỏi'),
    line: '',
  }[it.type]);
  const LISTENS = it => !it.noAudio && (it.type === 'gap' || it.type === 'build' || it.type === 'say' || it.type === 'type');
  const SPEAKS = it => it.type === 'say' || (it.type === 'pic' && !it.choice);

  function bar() {
    const s = L.sess, b = $('.lsn-bar'); if (!b) return;
    const nS = Math.max(1, Math.min(12, s.total)); b.innerHTML = ST.lsnSegs(nS, Math.round(s.progress * nS)); b.setAttribute('aria-valuenow', Math.round(s.progress * 100)); // thanh chia đoạn = số câu (mẫu Stitch: viên thuốc)
    const qn = $('#lsnQn'), pc = $('#lsnPct'); if (qn) qn.textContent = t('Câu {a}/{b}', { a: Math.min(s.solved + 1, s.total), b: s.total }); if (pc) pc.textContent = Math.round(s.progress * 100) + '%';
    const c = $('#lsnCombo'); if (c) { c.textContent = s.combo >= 3 ? '🔥 ' + t('COMBO ×{n}', { n: s.combo }) : ''; c.classList.toggle('on', s.combo >= 3); }
  }

  function next() {
    if (!L || L.dead) return;
    bar();
    const it = L.sess.cur;
    if (!it) return finish();
    L.pick = null; L.tiles = []; L.checked = false;
    const bub = $('#lsnBub'), body = $('#lsnBody');
    const tag = it.retry ? ST.lsnTag('↺ ' + t('Lỗi cũ')) : (it.own && (it.type === 'gap' || it.type === 'build') ? ST.lsnTag('🔎 ' + t('Từ bạn đã tra'), true) : '');
    const lv = view.querySelector('#lsn'); if (lv) lv.classList.remove('st-dim');
    let sub = '';
    if (it.type === 'tr') sub = it.prompt;
    else if (it.type === 'mean') sub = meanOf(it.card);
    else if (it.type === 'type' && it.noAudio) sub = meanOf(it.card);
    else if (it.type === 'build' && it.noAudio) sub = it.prompt || meanOf(it.card);
    bub.innerHTML = tag + esc(TITLE(it)) + (sub ? ST.lsnSub(sub, it.type === 'mean' || it.type === 'tr' || it.noAudio ? '' : 'en') : '');
    const snd = LISTENS(it) ? ST.lsnSnd({ play: t('Nghe lại'), slow: t('Nghe chậm hơn'), label: t('Mẫu âm thanh'), name: TNAME(it.who || L.who) }) : '';
    const audioText = it.type === 'gap' || it.type === 'build' ? it.sent : it.answer;
    if (it.type === 'line') return line(it);
    const chat = $('#lsnChat'); if (chat) chat.hidden = true; // bài kiểm giữa truyện: ẩn lời thoại (không lộ đáp án)
    if (it.type === 'q') {
      bub.innerHTML = tag + esc(TITLE(it)) + ST.lsnSub(it.prompt, 'en');
      body.innerHTML = ST.lsnOpts(it.options);
    } else if (it.type === 'gap') {
      const T = it.blank.toks, sent = T.map((w, i) => (i === it.blank.i ? ST.GAP : i > it.blank.i && i < it.blank.i + it.blank.n ? '' : esc(w))).filter(Boolean).join(' ');
      body.innerHTML = snd + ST.lsnSent(sent) + ST.lsnOpts(it.options);
    } else if (it.type === 'type') {
      body.innerHTML = snd + ST.lsnIn(t('Câu trả lời của bạn'));
    } else if (it.type === 'match') {
      const L1 = E.shuffle(it.pairs.map((c, i) => i), Math.random), L2 = E.shuffle(it.pairs.map((c, i) => i), Math.random);
      body.innerHTML = ST.lsnMatch(L1.map(i => ({ i, t: it.pairs[i].word })), L2.map(i => ({ i, t: it.pairs[i].mean || meanOf(it.pairs[i]) })));
    } else if (it.type === 'mean' || (it.type === 'pic' && it.choice)) {
      body.innerHTML = (it.type === 'pic' ? ST.lsnPic(imgUrl(it.word, it.card.pos), t('Ảnh minh họa')) : '') + ST.lsnOpts(it.options);
    } else if (it.type === 'build' || it.type === 'tr') {
      body.innerHTML = snd + ST.lsnBuild(it.tiles); $('#lsnAns').setAttribute('aria-label', t('Câu trả lời của bạn'));
    } else {
      body.innerHTML = (it.type === 'pic' ? ST.lsnPic(imgUrl(it.word, it.card.pos), t('Ảnh minh họa')) : snd + ST.lsnSent(`<b>${esc(it.answer)}</b>`, true)) + ST.lsnMic('🎤 ' + t('Chạm để nói'));
    }
    // chân trang: bỏ qua nghe/nói + Kiểm tra
    const foot = $('#lsnFoot'); foot.className = ST.FOOT;
    foot.innerHTML = ST.lsnFoot({ skips: [LISTENS(it) ? ['lsnNoL', t('Không nghe được lúc này')] : null, SPEAKS(it) ? ['lsnNoS', t('Không nói được lúc này')] : null].filter(Boolean), check: SPEAKS(it) ? '' : t('Kiểm tra') });
    const slot = $('#lsnSndSlot'), sn = body.querySelector('.lsn-snd'); if (slot) { slot.innerHTML = ''; if (sn) slot.appendChild(sn); } // mẫu v2: 2 nút loa nằm trong bong bóng lời
    bindItem(it, audioText);
    if (LISTENS(it)) setTimeout(() => say(audioText, false, it.who), 250);
  }

  // Một câu thoại của truyện/radio: người nói sáng lên + đọc (giọng Kokoro), truyện hiện chữ (radio chỉ nghe), chạm Tiếp tục
  function line(it) {
    const name = it.who === 'carlos' ? 'Carlos' : 'Ama';
    $('#lsnBub').innerHTML = `<b>${name}</b>` + (it.radio ? ` <span aria-hidden="true">🔊 · · ·</span>` : ST.lsnSub(it.sent, 'en'));
    const log = $('#lsnChat'); $('#lsnBody').innerHTML = ''; log.hidden = false;
    if (!it.radio) { const li = document.createElement('li'); li.className = 'lsn-ln ' + it.who; li.lang = 'en'; li.innerHTML = `<b>${name}</b> ${esc(it.sent)}`; log.appendChild(li); li.scrollIntoView({ block: 'nearest' }); }
    const foot = $('#lsnFoot'); foot.className = ST.FOOT;
    foot.innerHTML = ST.lsnGo(t('Nghe lại'), t('Tiếp tục'));
    $('#lsnPlay').onclick = () => say(it.sent, false, it.who);
    $('#lsnGo').onclick = () => { if (L.teacher) L.teacher.stop(); if (L.teachers) L.teachers.carlos.stop(); L.sess.answer(true); next(); };
    setTimeout(() => say(it.sent, false, it.who), 200);
  }

  function bindItem(it, audioText) {
    const chk = $('#lsnCheck');
    const on = (id, fn) => { const b = $('#' + id); if (b) b.onclick = fn; };
    on('lsnPlay', () => say(audioText, false, it.who)); on('lsnSlow', () => say(audioText, true, it.who));
    on('lsnNoL', () => { setOff('listen'); L.sess.replace(x => E.adapt(x, offNow())); next(); });
    on('lsnNoS', () => { setOff('speak'); L.sess.replace(x => E.adapt(x, offNow())); next(); });
    if (chk) chk.onclick = () => submit(it.type === 'build' || it.type === 'tr' ? L.tiles.map(i => it.tiles[i]) : it.type === 'type' ? ($('#lsnIn') || {}).value : L.pick);
    const inp = $('#lsnIn');
    if (inp) { inp.oninput = () => { chk.disabled = !inp.value.trim(); }; inp.onkeydown = e => { if (e.key === 'Enter' && inp.value.trim()) chk.click(); }; setTimeout(() => inp.focus(), 50); }
    if (it.type === 'match') {
      // chạm 1 ô trái + 1 ô phải; đúng → cả 2 mờ đi, sai → rung và tính 1 lỗi; ghép xong cả 4 → chấm (0 lỗi = đúng)
      let sel = null, miss = 0, done = 0;
      if (chk) chk.hidden = true;
      document.querySelectorAll('.lsn-match .lsn-opt').forEach(b => { b.onclick = () => {
        if (L.checked || b.disabled) return;
        if (!sel || sel.dataset.s === b.dataset.s) { if (sel) sel.setAttribute('aria-pressed', 'false'); sel = b; b.setAttribute('aria-pressed', 'true'); if (b.dataset.s === 'w') say(b.textContent); return; }
        if (sel.dataset.m === b.dataset.m) { [sel, b].forEach(x => { x.disabled = true; x.setAttribute('aria-pressed', 'false'); x.classList.add('done'); }); done++; }
        else { miss++; [sel, b].forEach(x => { x.classList.add('miss'); setTimeout(() => x.classList.remove('miss'), 400); }); sel.setAttribute('aria-pressed', 'false'); }
        sel = null;
        if (done === it.pairs.length) setTimeout(() => submit(miss === 0), 250);
      }; });
    }
    document.querySelectorAll('.lsn-opts .lsn-opt').forEach(b => { b.onclick = () => { if (L.checked) return; document.querySelectorAll('.lsn-opts .lsn-opt').forEach(x => x.setAttribute('aria-pressed', String(x === b))); L.pick = b.dataset.o; const g = $('#lsnGap'); if (g) g.textContent = L.pick; if (chk) chk.disabled = false; }; });
    const ans = $('#lsnAns'), bank = $('#lsnBank');
    if (bank) {
      const draw = () => { ans.innerHTML = L.tiles.map(i => ST.lsnTile(it.tiles[i], `data-a="${i}"`)).join(''); bank.querySelectorAll('.lsn-tile').forEach(b => b.classList.toggle('used', L.tiles.includes(+b.dataset.i))); if (chk) chk.disabled = !L.tiles.length; };
      bank.onclick = e => { const b = e.target.closest('.lsn-tile'); if (!b || L.checked || L.tiles.includes(+b.dataset.i)) return; L.tiles.push(+b.dataset.i); L.popLast = true; if (window.Sfx) Sfx.pop(); draw(); L.popLast = false; };
      ans.onclick = e => { const b = e.target.closest('.lsn-tile'); if (!b || L.checked) return; L.tiles = L.tiles.filter(i => i !== +b.dataset.a); draw(); };
    }
    on('lsnMic', () => {
      const out = $('#lsnHeard'), mic = $('#lsnMic'); if (L.checked) return;
      mic.disabled = true; out.textContent = t('Đang nghe bạn nói…');
      L.rec = UI.recognize(it.answer, 'en-US', {
        result: ({ heard, score }) => { mic.disabled = false; out.textContent = t('Bạn nói: {s}', { s: heard || '…' }); L.spoken++; if (score >= 70) submit(score / 100, heard); else { L.tries = (L.tries || 0) + 1; if (L.tries >= 2) { L.tries = 0; submit(score / 100, heard); } else out.textContent += ' · ' + t('Chưa rõ – thử lại nhé'); } },
        error: code => { mic.disabled = false; out.textContent = code === 'unsupported' ? t('Thiết bị này chưa nhận được giọng nói.') : t('Chưa rõ – thử lại nhé'); if (code === 'unsupported') { setOff('speak'); L.sess.replace(x => E.adapt(x, offNow())); setTimeout(next, 900); } },
      });
      if (!L.rec) { mic.disabled = false; }
    });
  }

  function submit(ans, heard) {
    if (!L || L.checked) return; L.checked = true;
    const it = L.sess.cur, ok = E.check(it, ans), r = L.sess.answer(ok);
    document.querySelectorAll('#lsnBody button, #lsnIn').forEach(x => { x.disabled = true; }); // đã chấm: khóa đáp án (luật QA)
    bar();
    react(ok, r.combo);
    feedback(it, ok, heard);
  }

  // 🎮 Phản hồi kiểu game: âm + rung (Sfx dùng chung, tắt theo Cài đặt › Hiệu ứng âm thanh / giảm chuyển động) + giáo viên phản ứng mỗi câu
  const OK_LINES = ['Nice!', 'Great!', 'Yes!', 'Perfect!', 'Well done!'], NO_LINES = ['Almost!', 'Not quite.', "Let's try again."];
  function react(ok, combo) {
    try { if (window.Sfx) { if (ok && combo >= 3 && combo % 3 === 0 && Sfx.combo) Sfx.combo(combo); else (ok ? Sfx.correct : Sfx.wrong)(); } } catch (e) { /* bỏ qua */ }
    const el = $('#lsnTch'), pop = $('#lsnEmo');
    if (el) { el.classList.remove('nod', 'shake'); void el.offsetWidth; el.classList.add(ok ? 'nod' : 'shake'); }
    if (pop) { pop.textContent = ok ? (combo >= 3 ? '🔥' : '✓') : '↺'; pop.classList.remove('on'); void pop.offsetWidth; pop.classList.add('on'); } // ký hiệu, KHÔNG emoji nhân vật (luật: chỉ Ama/Carlos bank v2)
    const lines = ok ? OK_LINES : NO_LINES;
    if (L.teacher) L.teacher.say(lines[(L.sess.n + (combo || 0)) % lines.length], { rate: 1 });
    const b = $('.lsn-bar'); if (b && ok) { b.classList.remove('glow'); void b.offsetWidth; b.classList.add('glow'); }
  }

  // Dải chip đầu tấm phản hồi (Tactile): đúng/sai + XP câu này + chuỗi ngày (không có "tim/mạng" – luật chủ app)
  const chips = ok => ST.lsnChips({ ok, face: ST.tFace(L.who === 'carlos' ? 'carlos' : 'ama', ok ? 'happy' : 'encourage', 'w-16 h-16 max-w-none object-cover object-top'), okText: t('Đúng rồi!') + (L.sess.log.slice(-1)[0] && L.sess.log.slice(-1)[0].retry ? '' : ' +2 XP'), badText: t('Chưa đúng'), streak: App.streak && App.streak() ? t('{n} ngày liên tiếp', { n: App.streak() }) : '' });
  // 🎨 Tấm phản hồi = mẫu Stitch "Instant Feedback & Band Booster": chip đúng/sai + chuỗi · thẻ giáo viên 2D · Tăng điểm · Vì sao? + Tiếp tục
  function feedback(it, ok, heard) {
    const foot = $('#lsnFoot'), lv = view.querySelector('#lsn');
    foot.className = ST.SHEET + ' ' + (ok ? ST.SHEET_OK : ST.SHEET_BAD); if (lv) lv.classList.add('st-dim'); // phần câu hỏi lùi lại sau tấm (mẫu: opacity 40 %)
    const c = it.card, w = L.who === 'carlos' ? 'carlos' : 'ama';
    const coach = c ? ST.lsnCoach({ why: t('Vì sao?'), name: TNAME(L.who), role: t('Giáo viên của bạn'), head: ok ? t('Tuyệt!') : t('Đáp án'),
      body: `${ok ? '' : `<p class="m-0 font-body-md text-body-md text-primary font-bold"><b lang="en">${esc(it.answer)}</b></p>`}<p class="m-0 font-headline-sm text-headline-sm text-on-surface leading-snug"><b lang="en">${esc(c.word)}</b> <span class="font-body-sm text-body-sm">${UI.pronHtml(c, { noEx: true })}</span></p><p class="m-0 font-body-md text-body-md text-on-surface-variant">${esc(meanOf(c))}</p>` }) : ''; // mẫu v2: từ (to) · phát âm · nghĩa (nhạt)
    foot.innerHTML = ST.lsnSheet({ ok, chips: chips(ok), coach, card: !!c, head: ok ? '✓ ' + t('Tuyệt!') : '✗ ' + (it.type === 'match' ? t('Có cặp ghép nhầm') : t('Chưa đúng')), answer: !c && !ok && it.type !== 'match' ? it.answer : '',
      why: c ? t('Vì sao?') : '', next: t('Tiếp tục') });
    if (c) $('#lsnWhy').onclick = () => explain(it);
    $('#lsnNext').onclick = () => next();
    $('#lsnNext').focus();
    if (c) booster(it);
  }

  // ⚡ "Tăng điểm": lỗi hay gặp → cách nói tốt hơn (gold bank, 0 AI), chạm cụm để nghe. Từ chưa có cặp sai/đúng → ẩn
  async function booster(it) {
    try { await App.need('lgold'); } catch (e) { return; }
    const box = $('#lsnBoost'); if (!box || !L || L.sess.cur !== it) return;
    const x = ((window.LESSON_GOLD || {})[E.norm(it.card.word)] || []).find(g => g.w && g.r); if (!x) return;
    box.innerHTML = ST.lsnBoost({ title: t('Tăng điểm'), bad: t('Hay sai'), good: t('Nói hay hơn'), w: x.w, r: x.r });
    box.hidden = false; box.querySelector('.lsn-say').onclick = e => say(e.currentTarget.dataset.say, false, L.who);
  }

  // "Giải thích" từ dữ liệu sẵn có, 0 lượt AI: gold bank (vì sao + sai → đúng + mẹo) → định nghĩa + ví dụ + câu của chính người học
  async function explain(it) {
    const box = $('#lsnXp'); if (!box) return;
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false; box.textContent = '…';
    try { await App.need('lgold'); } catch (e) { /* ngoại tuyến → phần từ điển bên dưới */ }
    const c = it.card, G = (window.LESSON_GOLD || {})[E.norm(c.word)] || [];
    const own = c.ctx ? c.ctx : ((c.contexts || [])[0] || {}).text;
    let h = '';
    const st = E.stress(c.ipaUS || c.ipa), uu = E.usuk(c);
    if (st) h += `<p class="small">${t('Trọng âm rơi vào âm tiết {n}/{m}', { n: st.syl, m: st.of })}</p>`;
    if (uu) h += `<p class="small">${t('Anh – Mỹ đọc khác:')} UK <span class="ipa">${esc(uu.uk)}</span> · US <span class="ipa">${esc(uu.us)}</span></p>`;
    G.forEach(x => {
      h += `<p lang="en"><b>${esc(x.why)}</b></p>`;
      if (x.w) h += `<p class="small">✗ <s lang="en">${esc(x.w)}</s><br>✓ <span lang="en">${esc(x.r)}</span></p>`;
      if (x.mem) h += `<p class="small">🧠 ${t('Mẹo nhớ:')} <span lang="en">${esc(x.mem)}</span></p>`;
    });
    if (!G.length && c.def) h += `<p><span class="tiny muted">${t('Định nghĩa:')}</span> <span lang="en">${esc(c.def)}</span></p>`;
    const ex = (G[0] && G[0].ex || []).concat(c.ex ? [c.ex] : []).filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 2);
    if (ex.length) h += `<p class="small"><span class="tiny muted">${t('Ví dụ:')}</span> ${ex.map(x => `<span lang="en">${esc(x)}</span>`).join(' · ')}</p>`;
    if (own) h += `<p class="small"><span class="tiny muted">🔎 ${t('Từ bạn đã tra')}:</span> <span lang="en">${esc(own)}</span></p>`;
    box.innerHTML = h || `<p class="small">${t('Chưa có giải thích riêng cho từ này.')}</p>`;
  }

  async function finish() {
    const s = L.sess, res = E.results(s, L.items, L.demo ? {} : state.cards), foot = $('#lsnFoot');
    if (foot) foot.remove();
    if (L.teacher) L.teacher.say(s.accuracy >= 80 ? 'Great job!' : 'Good work. Keep going!', { rate: 1 });
    if (!L.demo) try { const k = 'lk.ux1.st', m = JSON.parse(ls.get(k) || '{}'), i = pathN(false); m[i] = s.accuracy >= 90 ? 3 : s.accuracy >= 70 ? 2 : 1; Object.keys(m).filter(x => +x < i - 60).forEach(x => delete m[x]); ls.set(k, JSON.stringify(m)); } catch (e) { /* bỏ qua */ } // sao thật của nút vừa xong (bản đồ ux1)
    ls.set(PKEY(L.demo), String(pathN(L.demo) + 1));
    ls.set('lk.lsn.acc', String(s.accuracy)); // nút kế tiếp thích nghi theo bài này (ux1)
    if (L.story) ls.set(L.SK, String((parseInt(ls.get(L.SK) || '0', 10) || 0) + 1)); // truyện/radio kế tiếp lần sau // nút bản đồ xong (demo: khóa riêng)
    try { if (window.Sfx) Sfx.win(); /* không pháo giấy: chuyển động tiết chế (chủ 28/10) */ } catch (e) { /* bỏ qua */ }
    let added = 0; const xp = 10 + s.ok1 * 2 + (s.wrong.size ? 0 : 5); // XP hiện cả ở bài thử (không ghi)
    if (!L.demo) {
      for (const r of res) {
        try {
          if (r.add) { const e = r.entry; await App.addWord({ word: e.word, pos: e.pos, ipa: e.ipa, ipaUS: e.ipaUS, vi: e.vi, def: e.def, ex: e.ex, sentences: e.sentences }, null, { silent: true }); added++; }
          const k = Core.keyOf(r.word), c = state.cards[k];
          if (c) { c.srs = Core.SRS.review(c.srs, r.grade); await Core.Cards.update(c); state.cards[k] = c; }
        } catch (e) { /* một thẻ lỗi không làm hỏng màn kết */ }
      }
      try { await App.reward({ quizzes: 1, spoken: L.spoken, perfect: s.wrong.size ? 0 : 1, xp }); } catch (e) { /* bỏ qua */ }
    }
    const weak = [...s.wrong.keys()].filter(k => k[0] !== '#');
    view.querySelector('#lsnBody').innerHTML = '';
    $('#lsnBub').textContent = s.accuracy >= 80 ? t('Tuyệt vời!') : t('Làm tốt lắm, cứ tiếp tục nhé!');
    const lv = view.querySelector('#lsn'); if (lv) lv.classList.add('st-end'); // 🎨 màn hoàn thành = khoảnh khắc ăn mừng (web/js/st/lesson.js lsnEnd)
    const w = L.who === 'carlos' ? 'carlos' : 'ama', mins = Math.max(1, Math.round((Date.now() - L.t0) / 60000));
    view.querySelector('#lsnBody').innerHTML = ST.lsnEnd({ face: ST.tFace(w, s.accuracy >= 80 ? 'happy' : 'encourage', 'absolute inset-0 w-full h-full object-contain object-bottom'),
      title: t('Hoàn thành bài học!'), sub: s.accuracy >= 80 ? t('Tuyệt vời!') : t('Làm tốt lắm, cứ tiếp tục nhé!'),
      stats: [{ icon: 'bolt', val: '+' + xp + ' XP', label: 'XP', tone: 'gold' }, { icon: 'target', val: s.accuracy + '%', label: t('Tỉ lệ trả lời đúng'), tone: 'teal' }, { icon: 'local_fire_department', val: String(s.best), label: t('COMBO cao nhất'), tone: 'coral' }, { icon: 'timer', val: mins + '′', label: t('Thời gian') }],
      learnedL: t('Bạn đã học:'), learned: (L.picks || []).map(p => p.card.word).join(' · '), weak: weak.join(', '), perfect: t('Không sai câu nào!'), again: t('Bài khác'), mapHref: `#/lesson${Q(L.demo)}`, mapL: t('Bản đồ bài học') });
    bar();
    $('#lsnAgain').onclick = () => routes.lesson('go');
    $('#lsnAgain').focus();
  }
})();
