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
/* 🧩 Stitch v2.1 lesson-question (khung tự sinh: brand/stitch/v2/bind/lesson-question.json) – Ama đứng SAU thẻ đề bài đục; không vòng/hào quang/khung/mặt nạ */
.lsn-v2 [hidden]{display:none}.lsn-v2 .lsn-fv2{margin:0 0 1rem}.lsn-v2 .tch-rig.posed img.tch-still{visibility:visible}.lsn-v2 .tch-rig.posed canvas,.lsn-v2 .tch-rig.posed img.tch-poster{visibility:hidden}.lsn-v2 .tch,.lsn-v2 .tch-rig{position:absolute;inset:0}.lsn-v2 .tch-rig img,.lsn-v2 .tch-rig canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%}.lsn-v2 .tch-rig.live img{visibility:hidden}
.lsn-v2.st-dim::after{content:"";position:fixed;inset:0;z-index:25;background:rgb(var(--st-surface)/.6);pointer-events:none}.lsn-v2.st-end .lsn-tchw,.lsn-v2.st-end .lsn-qcard,.lsn-v2.st-end .lsn-qfoot,.lsn-v2.st-end .lsn-qchips{display:none}.lsn-v2.lsn-end .lsn-tchw.lsn-endt{display:flex}
.lsn-ask{display:flex;align-items:flex-end;gap:.7rem}.lsn-ask .tch{flex:none;width:112px;height:138px;position:relative;margin-bottom:-6px;z-index:1}
.tch-rig{position:absolute;inset:0;filter:drop-shadow(0 4px 5px rgb(0 0 0 / .22))}.tch::after{content:"";position:absolute;left:18%;right:18%;bottom:-3px;height:8px;border-radius:50%;background:radial-gradient(rgb(0 0 0 / .18),transparent 70%);z-index:-1}.tch-rig img,.tch-rig canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%}.tch-rig.live img{visibility:hidden}
/* bán thân: đầu + vai + áo tươi (áo gánh độ nổi trên nền tối như Duolingo, tóc giữ đen); eo mờ dần (không khung, không ô) – docs/CHARACTERS.md */
.lsn-ask .tch,.lsn-duo .tch{-webkit-mask-image:linear-gradient(#000 80%,transparent 100%);mask-image:linear-gradient(#000 80%,transparent 100%)}.lsn-ask .tch .tch-rig,.lsn-duo .tch .tch-rig{overflow:hidden}.lsn-ask .tch-rig img,.lsn-ask .tch-rig canvas,.lsn-duo .tch-rig img,.lsn-duo .tch-rig canvas{inset:auto;left:50%;top:-2%;width:172%;height:auto;object-fit:fill;transform:translateX(-50%)}
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
.lsn-combo.on,.lsn-tile.pop,.tch.nod,.tch.shake,.lsn-bar.glow i,.lsn-node.next .lsn-dot,.lsn-start{animation:none} /* nút nhún khi bấm do lớp active: (Stitch) – chủ mở luật 28/10 */
.lsn-emo{display:none}.lsn-bar i{transition:width .18s ease}
.lsn-foot.ok,.lsn-foot.bad{animation:lsnFade .18s ease-out}@keyframes lsnFade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.lsn-bar i,.lsn-combo.on,.lsn-node.next .lsn-dot,.lsn-start,.lsn-tile.pop,.lsn-emo.on,.tch.nod,.tch.shake,.lsn-bar.glow i,.lsn-foot.ok,.lsn-foot.bad{transition:none;animation:none}.lsn-emo.on{opacity:1;transform:none}}`;
    document.head.appendChild(st);
  }

  let L = null; // bài đang chạy
  App.lessonState = () => L; // cho test CI (scripts/test/lesson.mjs) – chỉ đọc
  const cleanup = () => { if (L) { if (L.teacher) L.teacher.destroy(); if (L.teachers && L.teachers.carlos) L.teachers.carlos.destroy(); if (L.rec && L.rec.stop) try { L.rec.stop(); } catch (e) { /* đã dừng */ } L.dead = true; } L = null; if (footRO) { footRO.disconnect(); footRO = null; } const f = $('#lsnFoot'); if (f) f.remove(); };
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
    const prev = ls.get('lk.lsn.who'), V2 = !story && v2On(), DUO = !!story && duoOn(), who = V2 ? 'ama' : prev === 'ama' ? 'carlos' : 'ama'; if (!V2) ls.set('lk.lsn.who', who); // xen kẽ Ama / Carlos mỗi bài
    L = { v2: V2, duo: DUO, demo, items, sess: new E.Session(items, { ease: ux }), picks, who: story ? 'ama' : who, t0: Date.now(), spoken: 0, kind: node.kind, story, SK };
    if (demo) App._lsn = L; // bài thử: gác bố cục CI (scripts/test/ux1-guard.mjs) đọc câu hiện tại để trả lời đúng/sai có chủ đích
    App.onCleanup(cleanup);
    const X = (App.EXAMS || {})[App.exam ? App.exam() : ''], tg = (state.settings || {}).examTarget; // chip kỳ thi trên thẻ câu hỏi: "IELTS · Mục tiêu 7.5"
    document.body.classList.add('st'); App.onCleanup(() => document.body.classList.remove('st'));
    const sh = { close: `#/lesson${Q(demo)}`, closeLabel: t('Thoát bài học'), title: KNAME(node.kind) || t('Bài học'), icon: { lesson: 'star', listen: 'headphones', speak: 'mic', review: 'replay', story: 'auto_stories', radio: 'radio' }[node.kind] || 'star', barLabel: t('Tiến độ bài học'), chip: X ? X.short + (tg ? ' · ' + t('Mục tiêu {s}', { s: tg }) : '') : '', who: TNAME(L.who) + ' · ' + t('Giáo viên của bạn') };
    L.title = sh.title; L.chip = sh.chip; // màn kết (lesson-complete) dùng lại
    L.sh = sh;
    if (V2) v2shell(sh);
    else if (DUO) { /* khung truyện dựng ở frame() theo từng bước */ }
    else view.innerHTML = ST.lsnShell(Object.assign(sh, { story: story ? ST.lsnStory(story.kind === 'radio' ? '● ON AIR' : '') : '' })); // 🎨 mẫu Stitch "Speaking Micro-Drill" (web/js/st/lesson.js) – dự phòng khi chưa bật cờ ux1
    const foot = document.createElement('div'); foot.className = ST.FOOT; foot.id = 'lsnFoot'; foot.hidden = V2 || DUO; document.body.appendChild(foot); L.foot = foot;
    if (window.ResizeObserver) { footRO = new ResizeObserver(() => view.style.setProperty('--lsn-fh', foot.offsetHeight + 'px')); footRO.observe(foot); }
    if (!DUO) try { L.teacher = window.LessonTeacher ? LessonTeacher.mount($('#lsnTch'), L.who) : null; if (story && L.teacher) L.teachers = { ama: L.teacher, carlos: LessonTeacher.mount($('#lsnTch2'), 'carlos') }; } catch (e) { L.teacher = null; L.teachers = null; }
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

  // 🧩 Stitch v2.1 lesson-question (cờ ux1): khung tự sinh, Ama (Chars+LessonTeacher, 2D) đứng sau thẻ đề bài đục; trang cũ (ST.lsnShell) giữ làm dự phòng + cho Truyện/Radio (2 giáo viên)
  const v2On = () => !!(window.ST2 && window.ST2['lesson-question'] && window.Chars && window.LessonTeacher && App.ux1On && App.ux1On());
  const GRID = 'grid grid-cols-2 gap-[1rem] mb-[1rem] lsn-opts', FLOW = 'flex flex-col gap-3 mb-[1rem]', LET = 'ABCDEFGH';
  const SLOW = 'w-full mb-3 min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-4 rounded-[9999px] active:translate-y-[2px] transition-transform lt:bg-[#FFFFFF] lt:border lt:border-[#EADEC8] lt:text-[#4A5F65] dk:bg-[#142328] dk:border dk:border-[#233942] dk:text-[#A9BFC1] motion-reduce:transition-none';
  function v2shell(sh) {
    const d = { close: sh.close, title: sh.title, pct: 0, combo: '', chip: sh.chip, play: t('Nghe lại'), who: sh.who,
      teacher: '<div class="lsn-tchw relative z-0 -mb-14 h-[172px] w-full flex justify-center pointer-events-none" aria-hidden="true"><div id="lsnTch" class="relative w-[200px] h-[172px] max-w-full"></div></div>',
      slow: `<button id="lsnSlow" type="button" class="${SLOW}" hidden aria-label="${esc(t('Nghe chậm hơn'))}"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">slow_motion_video</span><span class="text-[13px] leading-[18px] font-extrabold uppercase tracking-wider">${esc(t('Nghe chậm hơn'))}</span></button>`,
      opts: ['off', 'on', 'off', 'off'].map((v, i) => ({ v, o: '', k: LET[i], t: '' })) };
    const root = ST2.mount(view, 'lesson-question', d, null); root.id = 'lsn'; root.classList.add('lsn-v2');
    const g = root.querySelector('#lsnBody'); L.tpl = { off: g.children[0], on: g.children[1] }; g.textContent = ''; // khuôn thẻ đáp án (chưa chọn / đã chọn) lấy từ khung Stitch
    if (!sh.chip) root.querySelector('.lsn-combo').nextElementSibling.hidden = true;
  }
  const v2opt = (state, i, o) => { const n = L.tpl[state].cloneNode(true); n.removeAttribute('id'); n.dataset.o = o; n.lang = 'en'; n.querySelector(':scope > div > span').textContent = LET[i]; n.querySelector(':scope > span').textContent = o; return n; };
  function v2foot(it, foot) {
    foot.className = ST.FOOT; foot.innerHTML = ''; foot.hidden = true; // chân cố định chỉ dành cho tấm phản hồi
    const q = view.querySelector('.lsn-qfoot'); q.hidden = false;
    $('#lsnPlay').hidden = $('#lsnSlow').hidden = !LISTENS(it);
    view.querySelectorAll('.lsn-skip2').forEach(x => x.remove());
    const sk = q.querySelector('.lsn-skipb'), list = [LISTENS(it) && ['lsnNoL', t('Không nghe được lúc này'), 'hearing_disabled'], SPEAKS(it) && ['lsnNoS', t('Không nói được lúc này'), 'mic_off']].filter(Boolean);
    const set = (b, [id, lb, ic]) => { b.id = id; b.setAttribute('aria-label', lb); b.title = lb; b.querySelector('.material-symbols-outlined').textContent = ic; };
    sk.hidden = !list.length; if (list[0]) set(sk, list[0]);
    if (list[1]) { const c = sk.cloneNode(true); c.classList.add('lsn-skip2'); set(c, list[1]); sk.after(c); }
    const chk = $('#lsnCheck'); chk.hidden = SPEAKS(it); chk.disabled = true;
    $('#lsnRep').onclick = () => { const cid = 'lesson:' + it.type + ':' + String(it.word || (it.card && it.card.word) || '').slice(0, 40); if (window.LexReportLoad) LexReportLoad().then(R => R.open({ cat: 'content', cid })).catch(() => {}); else window.open('#/report/new', '_blank'); };
  }
  const VOICE = w => (window.Chars && Chars.voice ? Chars.voice(w || (L && L.who) || 'ama') : null); // giọng đúng của giáo viên đang nói (registry Chars) – thiếu file mp3 → giọng máy

  const say = (text, slow, who, onEnd) => {
    if (!L) return;
    const T = (L.teachers && who && L.teachers[who]) || L.teacher, rate = slow ? 0.7 : 0.95;
    if (L.teachers) { ['ama', 'carlos'].forEach(k => { const el = $(k === 'ama' ? '#lsnTch' : '#lsnTch2'); if (el) el.classList.toggle('talk', k === who); }); }
    if (T) T.say(text, { rate, voice: VOICE(who), onEnd }); else { UI.tts(text, 'en-US', rate, { onEnd }); }
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
    if (L.duo && L.frame === 'duo') { const pc = Math.round(s.progress * 100), fl = $('#lsnFill'), pe = $('#lsnPct'); if (fl) fl.style.width = pc + '%'; b.setAttribute('aria-valuenow', pc); if (pe) pe.textContent = pc + '%'; if (window.Feel && Feel.on && Feel.fill) Feel.fill(b, pc); return; } // khung story-duo: 1 dải liền + %
    if (L.v2) { // khung Stitch: 1 thanh đầy dần + % + chip COMBO
      const pc = Math.round(s.progress * 100), fl = $('#lsnFill'), pe = $('#lsnPct'), qn2 = $('#lsnQn'), cb = $('#lsnCombo'), ct = $('#lsnComboT');
      if (fl) fl.style.width = pc + '%'; b.setAttribute('aria-valuenow', pc); if (pe) pe.textContent = pc + '%';
      if (qn2) qn2.textContent = t('Câu {a}/{b}', { a: Math.min(s.solved + 1, s.total), b: s.total });
      if (ct) ct.textContent = s.combo >= 3 ? t('COMBO ×{n}', { n: s.combo }) : ''; if (cb) cb.classList.toggle('on', s.combo >= 3);
      if (window.Feel && Feel.on) { if (Feel.fill) Feel.fill(b, pc); if (Feel.combo && s.combo >= 3 && cb) Feel.combo(cb, s.combo); }
      return;
    }
    const nS = Math.max(1, Math.min(12, s.total)); b.innerHTML = ST.lsnSegs(nS, Math.round(s.progress * nS)); b.setAttribute('aria-valuenow', Math.round(s.progress * 100)); // thanh chia đoạn = số câu (mẫu Stitch: viên thuốc)
    const qn = $('#lsnQn'), pc = $('#lsnPct'); if (qn) qn.textContent = t('Câu {a}/{b}', { a: Math.min(s.solved + 1, s.total), b: s.total }); if (pc) pc.textContent = Math.round(s.progress * 100) + '%';
    const c = $('#lsnCombo'); if (c) { c.textContent = s.combo >= 3 ? '🔥 ' + t('COMBO ×{n}', { n: s.combo }) : ''; c.classList.toggle('on', s.combo >= 3); }
  }

  function next() {
    if (!L || L.dead) return;
    if (L.duo && L.sess.cur) frame(L.sess.cur);
    bar();
    if (L.teacher && L.teacher.pose) L.teacher.pose(null); // ra khỏi tư thế phản hồi (cheer/concern) → lại nghe/nói sống
    const it = L.sess.cur;
    if (!it) return finish();
    L.pick = null; L.tiles = []; L.checked = false;
    if (it.type === 'line' && L.frame === 'duo') return lineDuo(it);
    const bub = $('#lsnBub'), body = $('#lsnBody');
    const tag = it.retry ? ST.lsnTag('↺ ' + t('Lỗi cũ')) : (it.own && (it.type === 'gap' || it.type === 'build') ? ST.lsnTag('🔎 ' + t('Từ bạn đã tra'), true) : '');
    const lv = view.querySelector('#lsn'); if (lv) lv.classList.remove('st-dim');
    let sub = '';
    if (it.type === 'tr') sub = it.prompt;
    else if (it.type === 'mean') sub = meanOf(it.card);
    else if (it.type === 'type' && it.noAudio) sub = meanOf(it.card);
    else if (it.type === 'build' && it.noAudio) sub = it.prompt || meanOf(it.card);
    bub.innerHTML = tag + esc(TITLE(it)) + (sub ? ST.lsnSub(sub, it.type === 'mean' || it.type === 'tr' || it.noAudio ? '' : 'en') : '');
    const V = L.v2, snd = LISTENS(it) && !V ? ST.lsnSnd({ play: t('Nghe lại'), slow: t('Nghe chậm hơn'), label: t('Mẫu âm thanh'), name: TNAME(it.who || L.who) }) : '';
    const fill = (html, grid) => { if (V) body.className = grid ? GRID : FLOW; body.innerHTML = V && grid ? '' : html; }; // v2: lưới 2 cột cho trắc nghiệm (bindItem vẽ thẻ), dạng khác = cột dọc cùng ô
    const audioText = it.type === 'gap' || it.type === 'build' ? it.sent : it.answer;
    if (it.type === 'line') return L.frame === 'duo' ? lineDuo(it) : line(it);
    const chat = $('#lsnChat'); if (chat) chat.hidden = true; // bài kiểm giữa truyện: ẩn lời thoại (không lộ đáp án)
    if (it.type === 'q') {
      bub.innerHTML = tag + esc(TITLE(it)) + ST.lsnSub(it.prompt, 'en');
      fill(ST.lsnOpts(it.options), true);
    } else if (it.type === 'gap') {
      const T = it.blank.toks, sent = T.map((w, i) => (i === it.blank.i ? ST.GAP : i > it.blank.i && i < it.blank.i + it.blank.n ? '' : esc(w))).filter(Boolean).join(' ');
      if (V) bub.insertAdjacentHTML('beforeend', ST.lsnSent(sent)); // câu có chỗ trống nằm trong thẻ đề bài
      fill(V ? '' : snd + ST.lsnSent(sent) + ST.lsnOpts(it.options), true);
    } else if (it.type === 'type') {
      fill(snd + ST.lsnIn(t('Câu trả lời của bạn')), false);
    } else if (it.type === 'match') {
      const L1 = E.shuffle(it.pairs.map((c, i) => i), Math.random), L2 = E.shuffle(it.pairs.map((c, i) => i), Math.random);
      fill(ST.lsnMatch(L1.map(i => ({ i, t: it.pairs[i].word })), L2.map(i => ({ i, t: it.pairs[i].mean || meanOf(it.pairs[i]) }))), false);
    } else if (it.type === 'mean' || (it.type === 'pic' && it.choice)) {
      const pic = it.type === 'pic' ? ST.lsnPic(imgUrl(it.word, it.card.pos), t('Ảnh minh họa')) : '';
      if (V) bub.insertAdjacentHTML('beforeend', pic); // ảnh nằm trong thẻ đề bài
      fill(V ? '' : pic + ST.lsnOpts(it.options), true);
    } else if (it.type === 'build' || it.type === 'tr') {
      fill(snd + ST.lsnBuild(it.tiles), false); $('#lsnAns').setAttribute('aria-label', t('Câu trả lời của bạn'));
    } else {
      fill((it.type === 'pic' ? ST.lsnPic(imgUrl(it.word, it.card.pos), t('Ảnh minh họa')) : snd + ST.lsnSent(`<b>${esc(it.answer)}</b>`, true)) + ST.lsnMic('🎤 ' + t('Chạm để nói')), false);
    }
    // chân trang: bỏ qua nghe/nói + Kiểm tra
    const foot = $('#lsnFoot'); foot.className = ST.FOOT;
    if (V) v2foot(it, foot); else foot.innerHTML = ST.lsnFoot({ skips: [LISTENS(it) ? ['lsnNoL', t('Không nghe được lúc này')] : null, SPEAKS(it) ? ['lsnNoS', t('Không nói được lúc này')] : null].filter(Boolean), check: SPEAKS(it) ? '' : t('Kiểm tra') });
    const slot = $('#lsnSndSlot'), sn = body.querySelector('.lsn-snd'); if (slot) { slot.innerHTML = ''; if (sn) slot.appendChild(sn); } // mẫu v2: 2 nút loa nằm trong bong bóng lời
    bindItem(it, audioText);
    if (LISTENS(it)) setTimeout(() => say(audioText, false, it.who), 250);
  }

  // 🧩 Stitch v2.1 story-duo (cờ ux1): câu thoại = khung 'story-duo' (Ama trái + Carlos phải, cả hai Chars/LessonTeacher đứng SAU khung chat đục); bài kiểm giữa truyện = khung lesson-question (người nói của câu đó + thẻ đáp án + tấm phản hồi).
  const duoOn = () => v2On() && !!ST2['story-duo'], RADIO = '🔊 · · ·';
  function frame(it) {
    const want = it.type === 'line' ? 'duo' : 'q-' + (it.who || 'ama'); if (L.frame === want) return;
    [L.teacher, L.teachers && L.teachers.carlos].forEach(x => { if (x) { try { x.destroy(); } catch (e) { /* bỏ qua */ } } }); L.teacher = null; L.teachers = null; L.frame = want;
    if (L.foot) { L.foot.hidden = true; L.foot.innerHTML = ''; L.foot.className = ST.FOOT; document.body.appendChild(L.foot); } // tấm phản hồi nằm trong khung cũ → đưa về body trước khi dựng khung mới
    if (want === 'duo') return duoMount();
    L.v2 = true; L.who = it.who || 'ama'; v2shell(L.sh);
    try { L.teacher = window.LessonTeacher ? LessonTeacher.mount($('#lsnTch'), L.who) : null; } catch (e) { L.teacher = null; }
  }
  function duoMount() {
    L.v2 = false; L.log = L.log || [];
    const row = x => ({ v: x.who === 'carlos' ? 'carlos' : 'ama', name: TNAME(x.who), en: x.radio ? RADIO : x.sent, play: t('Nghe lại') + ' · ' + TNAME(x.who) });
    const box = id => `<div class="lsn-tchw relative z-0 h-[160px] w-[150px] flex justify-center pointer-events-none" aria-hidden="true"><div id="${id}" class="relative w-[150px] h-[160px]"></div></div>`;
    const d = { close: L.sh.close, title: L.sh.title, pct: '0%', mid: L.story.kind === 'radio' ? '● ON AIR' : t('Đối thoại'), duo: `<div class="lsn-duo2 relative z-0 flex justify-between items-end">${box('lsnTch')}${box('lsnTch2')}</div>`,
      log: [{ who: 'ama' }, { who: 'carlos' }].concat(L.log).map(row) };
    d.log[0].v = 'ama'; d.log[1].v = 'carlos';
    const root = ST2.mount(view, 'story-duo', d, null); root.id = 'lsn'; root.classList.add('lsn-v2', 'lsn-story');
    const chat = $('#lsnChat'); L.tl = { ama: chat.children[0], carlos: chat.children[1] }; L.tl.ama.remove(); L.tl.carlos.remove(); // 2 bong bóng mẫu = khuôn cho câu thoại mới
    chat.querySelectorAll('.lsn-ln button').forEach((b, i) => { b.onclick = () => say(L.log[i].sent, false, L.log[i].who); });
    try { const ama = window.LessonTeacher ? LessonTeacher.mount($('#lsnTch'), 'ama') : null; L.teacher = ama; L.teachers = ama ? { ama, carlos: LessonTeacher.mount($('#lsnTch2'), 'carlos') } : null; } catch (e) { L.teacher = null; L.teachers = null; }
  }
  function lineDuo(it) {
    const chat = $('#lsnChat'), s = it.who === 'carlos' ? 'carlos' : 'ama', name = TNAME(it.who);
    if (L.log.indexOf(it) < 0) L.log.push(it);
    const n = L.tl[s].cloneNode(true), p = n.querySelector('p'), b = n.querySelector('button');
    n.querySelector(':scope > div:nth-child(1) > span').textContent = name; p.textContent = it.radio ? RADIO : it.sent; b.setAttribute('aria-label', t('Nghe lại') + ' · ' + name);
    chat.querySelectorAll('#lsnPlay').forEach(x => x.removeAttribute('id')); b.id = 'lsnPlay'; b.onclick = () => say(it.sent, false, it.who);
    chat.appendChild(n);
    const go = $('#lsnGo'); go.onclick = () => { if (L.teacher) L.teacher.stop(); if (L.teachers) L.teachers.carlos.stop(); L.sess.answer(true); next(); };
    n.scrollIntoView({ block: 'nearest' }); go.scrollIntoView({ block: 'nearest' }); go.focus({ preventScroll: true });
    setTimeout(() => say(it.sent, false, it.who), 200);
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
    const og = $('#lsnBody.lsn-opts');
    if (L.v2 && og) { // khung Stitch: vẽ lại 4 thẻ A–D mỗi lần chọn (khuôn chưa chọn / đã chọn)
      const paint = focus => { og.textContent = ''; it.options.forEach((o, i) => { const b = v2opt(L.pick === o ? 'on' : 'off', i, o); b.onclick = () => { if (L.checked) return; L.pick = o; const g = $('#lsnGap'); if (g) g.textContent = o; if (chk) chk.disabled = false; paint(true); }; og.appendChild(b); if (focus && L.pick === o) setTimeout(() => b.focus(), 0); }); };
      paint(false);
    } else if (!L.v2) document.querySelectorAll('.lsn-opts .lsn-opt').forEach(b => { b.onclick = () => { if (L.checked) return; document.querySelectorAll('.lsn-opts .lsn-opt').forEach(x => x.setAttribute('aria-pressed', String(x === b))); L.pick = b.dataset.o; const g = $('#lsnGap'); if (g) g.textContent = L.pick; if (chk) chk.disabled = false; }; });
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
    if (L.teacher) L.teacher.say(lines[(L.sess.n + (combo || 0)) % lines.length], { rate: 1, voice: VOICE(L.who) });
    const b = $('.lsn-bar'); if (b && ok) { b.classList.remove('glow'); void b.offsetWidth; b.classList.add('glow'); }
  }

  // Dải chip đầu tấm phản hồi (Tactile): đúng/sai + XP câu này + chuỗi ngày (không có "tim/mạng" – luật chủ app)
  const chips = ok => ST.lsnChips({ ok, face: ST.tStill(L.who === 'carlos' ? 'carlos' : 'ama', ok ? 'cheer' : 'concern'), okText: t('Đúng rồi!') + (L.sess.log.slice(-1)[0] && L.sess.log.slice(-1)[0].retry ? '' : ' +2 XP'), badText: t('Chưa đúng'), streak: App.streak && App.streak() ? t('{n} ngày liên tiếp', { n: App.streak() }) : '' });
  // 🎨 Tấm phản hồi = mẫu Stitch "Instant Feedback & Band Booster": chip đúng/sai + chuỗi · thẻ giáo viên 2D · Tăng điểm · Vì sao? + Tiếp tục
  function feedback(it, ok, heard) {
    if (L.v2 && window.ST2 && ST2['feedback-correct'] && ST2['feedback-wrong']) return feedbackV2(it, ok);
    const foot = $('#lsnFoot'), lv = view.querySelector('#lsn');
    foot.hidden = false; const qf = view.querySelector('.lsn-qfoot'); if (qf) qf.hidden = true;
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

  // 🧩 Stitch v2.1 feedback-correct / feedback-wrong (khung tự sinh: brand/stitch/v2/bind/feedback-*.json): CHỈ tấm phản hồi, đặt TRONG luồng ngay chỗ chân Kiểm tra (không cố định → không che đáp án/ô nào).
  // Giáo viên (Ama/Carlos) đổi sang ảnh tĩnh cheer (đúng) / concern (sai) NGAY chỗ cũ – vẫn đứng sau thẻ đề bài đục. Mục mẫu không vẽ (từ · phát âm · nghĩa · Vì sao? · Tăng điểm · Giải thích · chuỗi · combo) nằm trong `extra`.
  // Stitch feedback-correct/wrong: sau Kiểm tra, thẻ đáp án đúng = thẻ teal "đúng" (✓), đáp án người học chọn sai = thẻ đỏ (✕), còn lại mờ nhẹ (opacity 90 %)
  const OPT_OK = 'lt:!bg-[#E8F5F3] lt:!border-[#0D6964] lt:![box-shadow:0_4px_0_0_#0D6964] dk:!bg-[#163632] dk:!border-[#2BA39A] dk:![box-shadow:0_4px_0_0_#0f4f49]';
  const OPT_BAD = 'lt:!bg-[#FFEEE4] lt:!border-[#ba1a1a] lt:![box-shadow:0_4px_0_0_#ba1a1a] dk:!border-[#F2553B] dk:![box-shadow:0_4px_0_0_#9B1E0A]';
  function v2optMark(it, ok) {
    const og = $('#lsnBody.lsn-opts'); if (!og) return;
    og.querySelectorAll('.lsn-opt').forEach(b => {
      const good = b.dataset.o === String(it.answer), bad = !ok && b.dataset.o === L.pick && !good;
      if (good) b.classList.add(...OPT_OK.split(' ')); else if (bad) b.classList.add(...OPT_BAD.split(' ')); else b.classList.add('opacity-90');
      if (good || bad) { const hd = b.querySelector(':scope > div'); hd.querySelectorAll('.material-symbols-outlined,.material-symbols-rounded').forEach(x => { const p = x.parentElement; (p !== hd && !p.textContent.replace(x.textContent, '').trim() ? p : x).remove(); }); } // cả vòng tròn chứa dấu ✓ // bỏ dấu ✓ 'đang chọn' của mẫu → chỉ còn 1 dấu kết quả
      if (good || bad) b.querySelector(':scope > div').insertAdjacentHTML('beforeend', `<span class="material-symbols-outlined text-[20px] ${good ? 'lt:text-[#0D6964] dk:text-[#2BA39A]' : 'lt:text-[#ba1a1a] dk:text-[#F2553B]'}" style="font-variation-settings:'FILL' 1" aria-hidden="true">${good ? 'check_circle' : 'cancel'}</span>`);
    });
  }
  function feedbackV2(it, ok) {
    const foot = $('#lsnFoot'), c = it.card, last = L.sess.log.slice(-1)[0] || {}, qf = view.querySelector('.lsn-qfoot'), combo = L.sess.combo, streak = App.streak ? App.streak() : 0;
    if (qf) { qf.hidden = true; qf.after(foot); }
    foot.hidden = false; foot.className = 'lsn-fv2 ' + (ok ? 'ok' : 'bad');
    if (L.teacher && L.teacher.pose) L.teacher.pose(ok ? 'cheer' : 'concern');
    const PILL = 'inline-flex items-center gap-1 min-h-[28px] px-3 rounded-[9999px] border border-white/60 text-white text-[11px] leading-[14px] tracking-[0.04em] font-bold', CARD = ok ? 'bg-[#FFF4D4] text-[#422006]' : 'bg-[#FFFFFF] text-[#2A0700]';
    const pills = (streak ? `<span class="${PILL}"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">local_fire_department</span>${esc(t('{n} ngày liên tiếp', { n: streak }))}</span>` : '') + (combo >= 3 ? `<span class="${PILL}"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">bolt</span>${esc(t('COMBO ×{n}', { n: combo }))}</span>` : '');
    const word = c ? `<div class="${CARD} rounded-[0.75rem] p-3 flex flex-col gap-0.5"><p class="m-0 text-[11px] leading-[14px] tracking-[0.04em] font-bold uppercase">${esc(TNAME(L.who))} · ${esc(t('Giáo viên của bạn'))}</p><p class="m-0 text-[22px] leading-[30px] font-extrabold"><b lang="en">${esc(c.word)}</b> <span class="text-[13px] leading-[18px] font-bold [&_*]:[color:inherit] [&_button]:!bg-transparent [&_button]:!border-current">${UI.pronHtml(c, { noEx: true })}</span></p><p class="m-0 text-[16px] leading-[24px]">${esc(meanOf(c))}</p></div>` : '';
    const why = c ? `<button type="button" id="lsnWhy" class="min-h-[44px] self-start px-4 rounded-[9999px] border border-white/60 text-white flex items-center gap-1.5 text-[13px] leading-[18px] font-bold active:translate-y-0.5 motion-reduce:transition-none"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">lightbulb</span>${esc(t('Vì sao?'))}</button>` : '';
    const box = c ? `<div class="${ST.BOOST}" id="lsnBoost" hidden></div><div class="${ST.XP}" id="lsnXp" hidden></div>` : '';
    const extra = `<div class="lsn-fb flex flex-col gap-[0.5rem]">${pills ? `<div class="flex flex-wrap gap-[0.5rem]">${pills}</div>` : ''}${word}${why}${box}</div>`;
    const d = ok ? { head: t('Tuyệt!'), xp: last.retry ? '' : '+2 XP', extra } : { head: it.type === 'match' ? t('Có cặp ghép nhầm') : t('Chưa đúng'), answer: it.type === 'match' ? '' : it.answer, extra };
    foot.innerHTML = `<div class="v2s-${ok ? 'feedback-correct' : 'feedback-wrong'}">${ST2[ok ? 'feedback-correct' : 'feedback-wrong'](d).main}</div>`;
    const xp = foot.querySelector('.lsn-xpp'); if (xp && !d.xp) xp.hidden = true; const an = foot.querySelector('.lsn-ans'); if (an && !d.answer) an.hidden = true;
    v2optMark(it, ok);
    if (c) $('#lsnWhy').onclick = () => explain(it);
    $('#lsnNext').onclick = () => next();
    $('#lsnNext').focus({ preventScroll: true });
    foot.scrollIntoView({ block: 'end', behavior: 'auto' }); // tấm phản hồi + Tiếp tục luôn trong tầm nhìn
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

  const weak0 = s => [...s.wrong.keys()].filter(k => k[0] !== '#');
  // 🧩 Stitch v2.1 lesson-complete (brand/stitch/v2/bind/lesson-complete.json): Ama (cheer, ảnh tĩnh) đứng SAU thẻ đục "sub" (thẻ kéo lên chồng đáy hình, che đường hông + vùng mờ)
  function finishV2(s, xp, weak, cheer) {
    const mins = Math.max(1, Math.round((Date.now() - L.t0) / 60000)), streak = App.streak ? App.streak() : 0, w = L.picks || [], q = Q(L.demo);
    const ic = n => `<span class="material-symbols-outlined text-[16px]" aria-hidden="true">${n}</span>`, ROW = 'flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[13px] leading-[18px] font-bold lt:text-[#0F3D3E] dk:text-[#EEF6F7]';
    const more = `<span class="${ROW}"><span class="inline-flex items-center gap-1">${ic('local_fire_department')}${esc(t('COMBO cao nhất'))}: ${s.best}</span><span class="inline-flex items-center gap-1">${ic('timer')}${esc(t('Thời gian'))}: ${mins}′</span></span>` +
      (weak.length ? `<span class="${ROW} font-medium"><span class="inline-flex items-start gap-1">${ic('replay')}<span lang="en">${esc(weak.join(', '))}</span></span></span>` : `<span class="${ROW}"><span class="inline-flex items-center gap-1">${ic('star')}${esc(t('Không sai câu nào!'))}</span></span>`);
    const d = { close: `#/lesson${q}`, mapL: t('Bản đồ bài học'), title: L.title, pct: '100%', chip: L.chip || L.title, xp: '+' + xp, acc: s.accuracy + '%', streak: String(streak),
      off1: Math.round(490 * (1 - Math.min(100, s.accuracy) / 100)), off2: Math.round(414 * (1 - Math.min(1, s.ok1 / Math.max(1, s.total)))),
      sub: s.accuracy >= 80 ? t('Tuyệt vời!') : t('Làm tốt lắm, cứ tiếp tục nhé!'), learned: w.length ? t('Bạn đã học:') + ' ' + w.map(p => p.card.word).join(' · ') : ' ', more,
      rev: weak.length ? t('Sổ lỗi sai') : t('Bản đồ bài học'), revHref: weak.length ? '#/mistakes' : `#/lesson${q}`,
      teacher: '<div class="lsn-tchw lsn-endt relative z-0 -mb-10 -mt-3 h-[132px] w-full flex justify-center pointer-events-none" aria-hidden="true"><div id="lsnTch" class="relative w-[154px] h-[132px] max-w-full"></div></div>' };
    if (L.teachers && L.teachers.carlos) { try { L.teachers.carlos.destroy(); } catch (e) { /* bỏ qua */ } } L.teachers = null;
    if (L.teacher) { try { L.teacher.destroy(); } catch (e) { /* bỏ qua */ } L.teacher = null; }
    const root = ST2.mount(view, 'lesson-complete', d, null); root.id = 'lsn'; root.classList.add('lsn-v2', 'lsn-end', 'st-end');
    try { L.teacher = window.LessonTeacher ? LessonTeacher.mount($('#lsnTch'), 'ama') : null; if (L.teacher) { if (L.teacher.pose) L.teacher.pose('cheer'); L.teacher.say(cheer, { rate: 1, voice: VOICE('ama') }); } } catch (e) { L.teacher = null; }
    if (window.Feel && Feel.on) { const x = root.querySelector('.lsn-stats > div:nth-child(1) > span:nth-child(2)'); if (x && Feel.count) Feel.count(x, xp, { prefix: '+', from: 0 }); const b = root.querySelector('[role=progressbar]'); if (b && Feel.fill) Feel.fill(b, 100); }
    const sh = $('#lsnShare'); if (sh) sh.onclick = async () => { const text = t('Mình vừa hoàn thành một bài học Lexkite: {a}% đúng, +{x} XP', { a: s.accuracy, x: xp }); try { if (navigator.share) await navigator.share({ title: 'Lexkite', text, url: location.origin + '/' }); else if (navigator.clipboard) { await navigator.clipboard.writeText(text); UI.toast(t('Đã sao chép')); } } catch (e) { /* người dùng hủy */ } };
    $('#lsnAgain').onclick = () => routes.lesson('go');
    $('#lsnAgain').focus({ preventScroll: true });
  }

  async function finish() {
    const s = L.sess, res = E.results(s, L.items, L.demo ? {} : state.cards), foot = $('#lsnFoot');
    if (foot) foot.remove();
    const CV = L.v2 && window.ST2 && ST2['lesson-complete']; // khung Stitch lesson-complete (cờ ux1); không có → màn kết cũ
    const cheer = s.accuracy >= 80 ? 'Great job!' : 'Good work. Keep going!';
    if (L.teacher && !CV) L.teacher.say(cheer, { rate: 1, voice: VOICE(L.who) });
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
    const weak = weak0(s);
    if (CV) return finishV2(s, xp, weak0(s), cheer);
    view.querySelector('#lsnBody').innerHTML = ''; if (L.v2) view.querySelector('#lsnBody').className = FLOW;
    $('#lsnBub').textContent = s.accuracy >= 80 ? t('Tuyệt vời!') : t('Làm tốt lắm, cứ tiếp tục nhé!');
    const lv = view.querySelector('#lsn'); if (lv) lv.classList.add('st-end'); // 🎨 màn hoàn thành = khoảnh khắc ăn mừng (web/js/st/lesson.js lsnEnd)
    const w = L.who === 'carlos' ? 'carlos' : 'ama', mins = Math.max(1, Math.round((Date.now() - L.t0) / 60000));
    view.querySelector('#lsnBody').innerHTML = ST.lsnEnd({ face: ST.tFace(w, s.accuracy >= 80 ? 'cheer' : 'encourage', 'absolute inset-0 w-full h-full object-contain object-bottom'),
      title: t('Hoàn thành bài học!'), sub: s.accuracy >= 80 ? t('Tuyệt vời!') : t('Làm tốt lắm, cứ tiếp tục nhé!'),
      stats: [{ icon: 'bolt', val: '+' + xp + ' XP', label: 'XP', tone: 'gold' }, { icon: 'target', val: s.accuracy + '%', label: t('Tỉ lệ trả lời đúng'), tone: 'teal' }, { icon: 'local_fire_department', val: String(s.best), label: t('COMBO cao nhất'), tone: 'coral' }, { icon: 'timer', val: mins + '′', label: t('Thời gian') }],
      learnedL: t('Bạn đã học:'), learned: (L.picks || []).map(p => p.card.word).join(' · '), weak: weak.join(', '), perfect: t('Không sai câu nào!'), again: t('Bài khác'), mapHref: `#/lesson${Q(L.demo)}`, mapL: t('Bản đồ bài học') });
    bar();
    $('#lsnAgain').onclick = () => routes.lesson('go');
    $('#lsnAgain').focus();
  }
})();
