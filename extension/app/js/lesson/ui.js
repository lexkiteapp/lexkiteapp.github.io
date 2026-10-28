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
    st.textContent = `.lsn{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:.9rem;padding-bottom:9rem}
.lsn-top{display:flex;align-items:center;gap:.6rem}.lsn-x{flex:none}.lsn-bar{flex:1;height:14px;border-radius:99px;background:var(--surface-3);overflow:hidden}
.lsn-bar i{display:block;height:100%;width:0;background:var(--good);border-radius:99px;transition:width .35s ease}
.lsn-combo{flex:none;font-weight:800;color:var(--gold-text);background:var(--gold-soft);border-radius:99px;padding:.15rem .6rem;font-size:.85rem;visibility:hidden}.lsn-combo.on{visibility:visible;animation:lsnPop .3s ease}
@keyframes lsnPop{0%{transform:scale(.6)}70%{transform:scale(1.15)}100%{transform:scale(1)}}
.lsn-ask{display:flex;align-items:flex-end;gap:.7rem}.lsn-ask .tch{flex:none;width:96px;height:128px;border-radius:16px;overflow:hidden;position:relative;background:var(--surface-2)}
.tch-rig{position:absolute;left:0;top:0;width:480px;height:640px;transform-origin:0 0}.tch-rig img,.tch-rig video{position:absolute;inset:0;width:480px;height:640px;object-fit:cover}
.tch-face{position:absolute;left:0;top:0;width:480px;height:640px;transform-origin:0 0}.tch-m{position:absolute;background-repeat:no-repeat;opacity:0;transition:opacity 60ms linear}
.lsn-bub{position:relative;flex:1;background:var(--surface);border:2px solid var(--line);border-radius:16px;padding:.7rem .9rem;font-weight:700}
.lsn-bub small{display:block;font-weight:400;color:var(--muted);margin-top:.2rem}.lsn-tag{display:inline-block;font-size:.75rem;font-weight:800;color:var(--again-text);background:var(--again-soft);border-radius:99px;padding:.05rem .5rem;margin-bottom:.3rem}
.lsn-tag.own{color:var(--accent-text);background:var(--accent-soft)}
.lsn-snd{display:flex;gap:.5rem;align-items:center}.lsn-sent{font-size:1.2rem;line-height:1.6}.lsn-gap{display:inline-block;min-width:4.5em;border-bottom:3px solid var(--primary);text-align:center}
.lsn-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:.6rem}
.lsn-opt,.lsn-tile{border:2px solid var(--line);border-bottom-width:4px;background:var(--surface);color:var(--text);border-radius:14px;padding:.7rem .8rem;font:inherit;font-weight:700;cursor:pointer;min-height:48px}
.lsn-opt[aria-pressed=true]{border-color:var(--primary);background:var(--primary-soft)}.lsn-tile{padding:.45rem .7rem;min-height:44px;min-width:44px}.lsn-opt:disabled,.lsn-tile:disabled{cursor:default;opacity:1}
.lsn-ans{min-height:3.4rem;border-bottom:2px solid var(--line);display:flex;flex-wrap:wrap;gap:.4rem;padding:.3rem 0}.lsn-bank{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center}
.lsn-tile.used{visibility:hidden}.lsn-pic{width:min(220px,60vw);aspect-ratio:1;border-radius:16px;background:var(--surface-2);margin:0 auto;display:block;object-fit:cover}
.lsn-mic{display:flex;flex-direction:column;align-items:center;gap:.5rem}.lsn-mic .btn{min-width:200px}
.lsn-foot{position:fixed;left:0;right:0;bottom:0;z-index:30;background:var(--bg);border-top:2px solid var(--line);padding:.8rem 1rem calc(.8rem + env(safe-area-inset-bottom))}
.lsn-foot>div{max-width:640px;margin:0 auto;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}.lsn-foot .grow{flex:1}
.lsn-foot.ok{background:var(--good-soft);border-color:var(--good)}.lsn-foot.bad{background:var(--again-soft);border-color:var(--again)}
.lsn-fb{flex:1 1 100%;min-width:0}.lsn-fb h3{margin:0 0 .2rem;font-size:1.15rem}.lsn-foot.ok h3{color:var(--good-text)}.lsn-foot.bad h3{color:var(--again-text)}
.lsn-fb p{margin:.15rem 0}.lsn-xp{background:var(--surface);border-radius:12px;padding:.6rem .8rem;margin-top:.4rem;max-height:40vh;overflow:auto}
.lsn-skip{background:none;border:0;color:var(--muted);font:inherit;font-weight:700;text-decoration:underline;cursor:pointer;padding:.4rem;min-height:44px}
.lsn-in{width:100%;font:inherit;font-size:1.2rem;padding:.7rem .9rem;border:2px solid var(--line);border-radius:14px;background:var(--surface);color:var(--text)}
.lsn-match{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}.lsn-match>div{display:flex;flex-direction:column;gap:.5rem}.lsn-match .lsn-opt{flex:1}.lsn-opt.done{opacity:.35;border-color:var(--good)}.lsn-opt.miss{border-color:var(--again);background:var(--again-soft)}
.lsn-end{text-align:center}@media (max-width:420px){.lsn-stats{grid-template-columns:repeat(2,1fr)!important}}.lsn-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin:1rem 0}.lsn-stats div{background:var(--surface-2);border-radius:14px;padding:.7rem .3rem}.lsn-stats b{display:block;font-size:1.4rem}
.lsn-duo{position:relative;display:flex;justify-content:center;gap:1rem}.lsn-duo .tch{width:110px;height:146px;border-radius:18px;overflow:hidden;position:relative;background:var(--surface-2);transition:transform .2s ease,box-shadow .2s ease}
.lsn-duo .tch.talk{transform:scale(1.06);box-shadow:0 0 0 4px var(--primary)}.lsn-air{position:absolute;top:-.6rem;left:50%;transform:translateX(-50%);z-index:2;font-size:.7rem;font-weight:800;color:#fff;background:var(--again);border-radius:99px;padding:.1rem .5rem}
.lsn-chat{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.4rem;max-height:38vh;overflow:auto}.lsn-ln{background:var(--surface-2);border-radius:14px;padding:.45rem .7rem;max-width:85%}.lsn-ln.carlos{align-self:flex-end;background:var(--primary-soft)}.lsn-ln b{display:block;font-size:.75rem;color:var(--muted)}
/* bản đồ */
.lsn-path{list-style:none;margin:1rem 0;padding:0;display:flex;flex-direction:column;align-items:center;gap:1.4rem}
.lsn-node{position:relative;transform:translateX(var(--x));display:flex;flex-direction:column;align-items:center}
.lsn-dot{width:76px;height:70px;border-radius:50%;display:grid;place-items:center;background:var(--surface-3);color:var(--muted);box-shadow:0 6px 0 var(--line);text-decoration:none}
.lsn-dot svg{width:32px;height:32px}.lsn-node.done .lsn-dot{background:var(--good);color:#fff;box-shadow:0 6px 0 var(--good-text)}
.lsn-node.next .lsn-dot{width:92px;height:84px;background:var(--primary);color:var(--primary-ink);box-shadow:0 7px 0 color-mix(in srgb,var(--primary) 62%,#000);animation:lsnGlow 1.6s ease-in-out infinite}
.lsn-start{margin-bottom:.7rem;min-width:180px;animation:lsnBob 1.6s ease-in-out infinite}
@keyframes lsnGlow{0%,100%{filter:drop-shadow(0 0 0 transparent)}50%{filter:drop-shadow(0 0 14px var(--primary))}}
@keyframes lsnBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
/* game feel */
.lsn-big{width:84px;height:84px;border-radius:22px;border:0;background:var(--primary);color:var(--primary-ink);display:grid;place-items:center;cursor:pointer;box-shadow:0 5px 0 color-mix(in srgb,var(--primary) 62%,#000);font-size:1.6rem}
.lsn-big.sm{width:60px;height:60px;background:var(--surface-2);color:var(--text);box-shadow:0 4px 0 var(--line)}.lsn-big svg{width:36px;height:36px}.lsn-big:active{transform:translateY(3px);box-shadow:none}
.lsn-snd{justify-content:center}.lsn-tile.pop{animation:lsnPop .2s ease}
.lsn-tw{position:relative;flex:none}.lsn-emo{position:absolute;right:-8px;top:-8px;font-size:1.6rem;opacity:0;transform:scale(.4)}.lsn-emo.on{animation:lsnEmo .9s ease forwards}
@keyframes lsnEmo{0%{opacity:0;transform:scale(.4)}25%{opacity:1;transform:scale(1.2)}70%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1) translateY(-10px)}}
.tch.nod{animation:lsnNod .5s ease}.tch.shake{animation:lsnShake .4s ease}
@keyframes lsnNod{0%,100%{transform:translateY(0)}40%{transform:translateY(5px)}}@keyframes lsnShake{0%,100%{transform:rotate(0)}30%{transform:rotate(-3deg)}70%{transform:rotate(3deg)}}
.lsn-bar.glow i{animation:lsnBar .6s ease}@keyframes lsnBar{50%{box-shadow:0 0 12px var(--good);filter:brightness(1.2)}}
.lsn-foot.ok,.lsn-foot.bad{animation:lsnUp .22s ease-out}@keyframes lsnUp{from{transform:translateY(40%);opacity:.4}to{transform:none;opacity:1}}
.lsn-go{min-width:220px;margin:.4rem 0}
@media (prefers-reduced-motion:reduce){.lsn-bar i,.lsn-combo.on,.lsn-node.next .lsn-dot,.lsn-start,.lsn-tile.pop,.lsn-emo.on,.tch.nod,.tch.shake,.lsn-bar.glow i,.lsn-foot.ok,.lsn-foot.bad{transition:none;animation:none}.lsn-emo.on{opacity:1;transform:none}}`;
    document.head.appendChild(st);
  }

  let L = null; // bài đang chạy
  App.lessonState = () => L; // cho test CI (scripts/test/lesson.mjs) – chỉ đọc
  const cleanup = () => { if (L) { if (L.ro) L.ro.disconnect(); if (L.teacher) L.teacher.destroy(); if (L.rec && L.rec.stop) try { L.rec.stop(); } catch (e) { /* đã dừng */ } L.dead = true; } L = null; document.querySelectorAll('.lsn-foot').forEach(f => f.remove()); }; // mọi chân cũ (không chỉ #lsnFoot đầu tiên)
  let runId = 0; // route chạy chồng (await giữa chừng) → chỉ lượt mới nhất được vẽ; trước đây 2 lượt = 2 chân #lsnFoot, chân rỗng đè mép dưới nút Kiểm tra

  // Tiến độ bản đồ: số nút đã xong (bền, không theo ngày – như lộ trình). Demo dùng khóa riêng.
  const PKEY = demo => (demo ? 'lk.lsn.path.demo' : 'lk.lsn.path');
  const pathN = demo => Math.max(0, parseInt(ls.get(PKEY(demo)) || '0', 10) || 0);
  const Q = demo => (demo ? '?demo=1' : '');
  const KICON = { lesson: 'star', listen: 'headphones', speak: 'mic', review: 'repeat', story: 'book-open', radio: 'audio-lines' };
  const KNAME = k => ({ lesson: t('Bài học'), listen: t('Nghe'), speak: t('Nói'), review: t('Ôn lỗi'), story: t('Truyện'), radio: 'Radio' }[k]);
  const STORIES = kind => (window.LESSON_STORIES || []).filter(s => s.kind === kind);
  const meanLang = () => { try { return (I18N.meanLang && I18N.meanLang()) || I18N.lang() || 'en'; } catch (e) { return 'en'; } };

  routes.lesson = async function (arg) {
    const my = ++runId;
    css(); cleanup();
    const demo = /[?&]demo=1\b/.test(location.hash);
    if (!demo && !(App.lessonOn && App.lessonOn())) { view.innerHTML = `<div class="card center"><p>${t('Bài học trộn đang thử nghiệm, sắp ra mắt.')}</p><a class="btn primary" href="#/home">${t('Quay về trang chủ')}</a></div>`; return; }
    if (window.I18N && I18N.whenReady) await I18N.whenReady();
    if (my !== runId) return;
    const cards = demo ? DEMO() : Object.values(state.cards || {});
    const ux = !!(window.Ux1 && App.ux1On && App.ux1On()), has = { story: STORIES('story').length, radio: STORIES('radio').length }, n = pathN(demo); // 🧭 cờ ux1: chặng theo mục tiêu + trình độ (docs/LEARNING-PATH.md)
    const plan = ux ? Ux1.plan(E, cards, has, n) : E.pathPlan(cards, Date.now(), has), node = plan[n % plan.length];
    if (arg !== 'go') return ux ? Ux1.map({ demo, plan, n }) : map(demo, plan, n);
    if (node.kind === 'exam') { ls.set(PKEY(demo), String(n + 1)); location.hash = Ux1.check(n).href; return; } // nút kiểm tra kỹ năng thi → module thi có sẵn
    await imgP();
    if (my !== runId) return;
    // Truyện / Radio: bài tiếp theo chưa nghe (xoay vòng), Ama ↔ Carlos đọc bằng giọng Kokoro sinh sẵn
    const SK = 'lk.lsn.s.' + node.kind + (demo ? '.demo' : ''), sl = STORIES(node.kind), story = sl.length ? sl[(parseInt(ls.get(SK) || '0', 10) || 0) % sl.length] : null;
    const picks = story ? [] : E.pickWords(cards, { n: 4, starter: ux ? Ux1.words(n, plan.length).map(w => Object.assign({}, w, { ctx: '', src: '', srs: SRS(now0, 0) })).concat(STARTER()) : STARTER(), mode: node.kind }); // ux1: từ chủ đề vừa sức (i+1) // 4 từ ≈ 9 bài ≈ 2–3 phút
    const items = story ? E.storyItems(story, meanLang(), n + 1) : E.build(picks, { seed: demo ? 7 + n : Date.now(), pool: cards.concat(STARTER()), hasImg: (w, p) => !!imgUrl(w, p), off: offNow(), only: E.KIND[node.kind], calm: ux });
    const prev = ls.get('lk.lsn.who'), who = prev === 'ama' ? 'carlos' : 'ama'; ls.set('lk.lsn.who', who); // xen kẽ Ama / Carlos mỗi bài
    L = { demo, items, sess: new E.Session(items, { ease: ux }), picks, who: story ? 'ama' : who, t0: Date.now(), spoken: 0, kind: node.kind, story, SK };
    App.onCleanup(cleanup);
    view.innerHTML = `<div class="lsn" id="lsn">
      <div class="lsn-top"><a class="icon-btn lsn-x" href="#/lesson${Q(demo)}" aria-label="${t('Thoát bài học')}">✕</a>
        <div class="lsn-bar" role="progressbar" aria-label="${t('Tiến độ bài học')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
        <span class="lsn-combo" id="lsnCombo" aria-live="polite"></span></div>
      ${story ? `<div class="lsn-duo">${story.kind === 'radio' ? '<span class="lsn-air">● ON AIR</span>' : ''}<div class="lsn-tw"><div id="lsnTch"></div><span class="lsn-emo" id="lsnEmo" aria-hidden="true"></span></div><div class="lsn-tw"><div id="lsnTch2"></div></div></div><div class="lsn-bub" id="lsnBub" aria-live="polite"></div><ol class="lsn-chat" id="lsnChat"></ol>`
        : `<div class="lsn-ask"><div class="lsn-tw"><div id="lsnTch"></div><span class="lsn-emo" id="lsnEmo" aria-hidden="true"></span></div><div class="lsn-bub" id="lsnBub" aria-live="polite"></div></div>`}
      <div id="lsnBody"></div></div>`;
    const foot = document.createElement('div'); foot.className = 'lsn-foot'; foot.id = 'lsnFoot'; document.body.appendChild(foot);
    // khung phản hồi cao lên (Vì sao?, chữ dài) → chừa đúng chừng ấy chỗ dưới nội dung để cuộn xem câu/đáp án phía trên, không bị che
    if (window.ResizeObserver) { L.ro = new ResizeObserver(() => { const v = $('#lsn'); if (v) v.style.paddingBottom = Math.max(144, foot.offsetHeight + 16) + 'px'; }); L.ro.observe(foot); }
    // Chỉ bài thử (?demo=1): CI soát hình (scripts/test/new-ui-qa.mjs) nhảy thẳng tới 1 dạng bài – không đụng dữ liệu thật
    App.lessonDemo = demo ? { jump(type) { if (!L || L.dead) return false; const it = L.sess.q.find(x => x.type === type) || E.build(E.pickWords(DEMO(), { n: 4 }), { seed: 7, pool: DEMO(), hasImg: (w, p) => !!imgUrl(w, p), only: [type] })[0]; if (!it) return false; L.sess.q = [it].concat(L.sess.q.filter(x => x !== it)); next(); return true; },
      answer(ok) { const it = L && L.sess.cur; if (!it || L.checked) return false; const tk = String(it.answer || '').split(' '); submit(ok ? ({ build: tk, tr: tk, say: 0.9, pic: it.choice ? it.answer : 0.9, match: true }[it.type] ?? it.answer) : ({ build: tk.slice().reverse(), tr: tk.slice().reverse(), say: 0.3, pic: it.choice ? '#' : 0.3, match: false }[it.type] ?? '#wrong')); return true; } } : null;
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
    b.firstChild.style.width = Math.round(s.progress * 100) + '%'; b.setAttribute('aria-valuenow', Math.round(s.progress * 100));
    const c = $('#lsnCombo'); if (c) { c.textContent = s.combo >= 3 ? '🔥 ' + t('COMBO ×{n}', { n: s.combo }) : ''; c.classList.toggle('on', s.combo >= 3); }
  }

  function next() {
    if (!L || L.dead) return;
    bar();
    const it = L.sess.cur;
    if (!it) return finish();
    L.pick = null; L.tiles = []; L.checked = false;
    const bub = $('#lsnBub'), body = $('#lsnBody');
    const tag = it.retry ? `<span class="lsn-tag">↺ ${t('Lỗi cũ')}</span><br>` : (it.own && (it.type === 'gap' || it.type === 'build') ? `<span class="lsn-tag own">🔎 ${t('Từ bạn đã tra')}</span><br>` : '');
    let sub = '';
    if (it.type === 'tr') sub = esc(it.prompt);
    else if (it.type === 'mean') sub = esc(meanOf(it.card));
    else if (it.type === 'type' && it.noAudio) sub = esc(meanOf(it.card));
    else if (it.type === 'build' && it.noAudio) sub = esc(it.prompt || meanOf(it.card));
    bub.innerHTML = tag + esc(TITLE(it)) + (sub ? `<small lang="${it.type === 'mean' || it.type === 'tr' || it.noAudio ? '' : 'en'}">${sub}</small>` : '');
    const snd = LISTENS(it) ? `<div class="lsn-snd"><button class="lsn-big" id="lsnPlay" aria-label="${t('Nghe lại')}">${UI.icon('audio-lines')}</button><button class="lsn-big sm" id="lsnSlow" aria-label="${t('Nghe chậm hơn')}">🐢</button></div>` : '';
    const audioText = it.type === 'gap' || it.type === 'build' ? it.sent : it.answer;
    if (it.type === 'line') return line(it);
    const chat = $('#lsnChat'); if (chat) chat.hidden = true; // bài kiểm giữa truyện: ẩn lời thoại (không lộ đáp án)
    if (it.type === 'q') {
      bub.innerHTML = tag + esc(TITLE(it)) + `<small lang="en">${esc(it.prompt)}</small>`;
      body.innerHTML = `<div class="lsn-opts" role="group">${it.options.map(o => `<button class="lsn-opt" lang="en" aria-pressed="false" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    } else if (it.type === 'gap') {
      const T = it.blank.toks, sent = T.map((w, i) => (i === it.blank.i ? `<span class="lsn-gap" id="lsnGap">&nbsp;</span>` : i > it.blank.i && i < it.blank.i + it.blank.n ? '' : esc(w))).filter(Boolean).join(' ');
      body.innerHTML = `${snd}<p class="lsn-sent" lang="en">${sent}</p><div class="lsn-opts" role="group">${it.options.map(o => `<button class="lsn-opt" lang="en" aria-pressed="false" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    } else if (it.type === 'type') {
      body.innerHTML = `${snd}<input class="lsn-in" id="lsnIn" lang="en" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${t('Câu trả lời của bạn')}">`;
    } else if (it.type === 'match') {
      const L1 = E.shuffle(it.pairs.map((c, i) => i), Math.random), L2 = E.shuffle(it.pairs.map((c, i) => i), Math.random);
      body.innerHTML = `<div class="lsn-match"><div>${L1.map(i => `<button class="lsn-opt" lang="en" data-m="${i}" data-s="w">${esc(it.pairs[i].word)}</button>`).join('')}</div><div>${L2.map(i => `<button class="lsn-opt" data-m="${i}" data-s="m">${esc(it.pairs[i].mean || meanOf(it.pairs[i]))}</button>`).join('')}</div></div>`;
    } else if (it.type === 'mean' || (it.type === 'pic' && it.choice)) {
      body.innerHTML = `${it.type === 'pic' ? `<img class="lsn-pic" src="${esc(imgUrl(it.word, it.card.pos))}" alt="${esc(t('Ảnh minh họa'))}" width="220" height="220">` : ''}<div class="lsn-opts" role="group">${it.options.map(o => `<button class="lsn-opt" lang="en" aria-pressed="false" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    } else if (it.type === 'build' || it.type === 'tr') {
      body.innerHTML = `${snd}<div class="lsn-ans" id="lsnAns" aria-label="${t('Câu trả lời của bạn')}" lang="en"></div><div class="lsn-bank" id="lsnBank" lang="en">${it.tiles.map((w, i) => `<button class="lsn-tile" data-i="${i}">${esc(w)}</button>`).join('')}</div>`;
    } else {
      body.innerHTML = `${it.type === 'pic' ? `<img class="lsn-pic" src="${esc(imgUrl(it.word, it.card.pos))}" alt="${esc(t('Ảnh minh họa'))}" width="220" height="220">` : `${snd}<p class="lsn-sent center" lang="en"><b>${esc(it.answer)}</b></p>`}
        <div class="lsn-mic"><button class="btn primary lg" id="lsnMic">🎤 ${t('Chạm để nói')}</button><p class="tiny muted" id="lsnHeard" aria-live="polite"></p></div>`;
    }
    // chân trang: bỏ qua nghe/nói + Kiểm tra
    const foot = $('#lsnFoot'); foot.className = 'lsn-foot';
    foot.innerHTML = `<div>${LISTENS(it) ? `<button class="lsn-skip" id="lsnNoL">${t('Không nghe được lúc này')}</button>` : ''}${SPEAKS(it) ? `<button class="lsn-skip" id="lsnNoS">${t('Không nói được lúc này')}</button>` : ''}<span class="grow"></span>
      ${SPEAKS(it) ? '' : `<button class="btn primary lg" id="lsnCheck" disabled>${t('Kiểm tra')}</button>`}</div>`;
    bindItem(it, audioText);
    if (LISTENS(it)) setTimeout(() => say(audioText, false, it.who), 250);
  }

  // Một câu thoại của truyện/radio: người nói sáng lên + đọc (giọng Kokoro), truyện hiện chữ (radio chỉ nghe), chạm Tiếp tục
  function line(it) {
    const name = it.who === 'carlos' ? 'Carlos' : 'Ama';
    $('#lsnBub').innerHTML = `<b>${name}</b>` + (it.radio ? ` <span aria-hidden="true">🔊 · · ·</span>` : `<small lang="en">${esc(it.sent)}</small>`);
    const log = $('#lsnChat'); $('#lsnBody').innerHTML = ''; log.hidden = false;
    if (!it.radio) { const li = document.createElement('li'); li.className = 'lsn-ln ' + it.who; li.lang = 'en'; li.innerHTML = `<b>${name}</b> ${esc(it.sent)}`; log.appendChild(li); li.scrollIntoView({ block: 'nearest' }); }
    const foot = $('#lsnFoot'); foot.className = 'lsn-foot';
    foot.innerHTML = `<div><button class="lsn-big sm" id="lsnPlay" aria-label="${t('Nghe lại')}">${UI.icon('audio-lines')}</button><span class="grow"></span><button class="btn primary lg" id="lsnGo">${t('Tiếp tục')}</button></div>`;
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
      const draw = () => { ans.innerHTML = L.tiles.map((i, k) => `<button class="lsn-tile${k === L.tiles.length - 1 && L.popLast ? ' pop' : ''}" data-a="${i}">${esc(it.tiles[i])}</button>`).join(''); bank.querySelectorAll('.lsn-tile').forEach(b => b.classList.toggle('used', L.tiles.includes(+b.dataset.i))); if (chk) chk.disabled = !L.tiles.length; };
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
    document.querySelectorAll('#lsnBody button:not(.lsn-big), #lsnBody input').forEach(b => { b.disabled = true; }); // đã chấm → khóa đáp án (không còn nút bấm được nằm dưới khung phản hồi)
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

  function feedback(it, ok, heard) {
    const foot = $('#lsnFoot');
    foot.className = 'lsn-foot ' + (ok ? 'ok' : 'bad');
    if (!it.card) { // ghép cặp: không gắn một từ
      foot.innerHTML = `<div><div class="lsn-fb" role="status"><h3>${ok ? '✓ ' + t('Tuyệt!') : '✗ ' + (it.type === 'match' ? t('Có cặp ghép nhầm') : t('Chưa đúng'))}</h3>${!ok && it.type !== 'match' ? `<p><b lang="en">${esc(it.answer)}</b></p>` : ''}</div><span class="grow"></span><button class="btn primary lg" id="lsnNext">${t('Tiếp tục')}</button></div>`;
      $('#lsnNext').onclick = () => next(); $('#lsnNext').focus(); return;
    }
    const c = it.card;
    foot.innerHTML = `<div><div class="lsn-fb" role="status">
        <h3>${ok ? '✓ ' + t('Tuyệt!') : '✗ ' + t('Chưa đúng')}</h3>
        ${ok ? '' : `<p><b lang="en">${esc(it.answer)}</b></p>`}
        <p><b lang="en">${esc(c.word)}</b> <span class="ipa small">${esc(c.ipaUS || c.ipa || '')}</span> <button class="icon-btn sm" id="lsnW" aria-label="${t('Nghe')}">🔊</button> · ${esc(meanOf(c))}</p>
        <div class="lsn-xp" id="lsnXp" hidden></div></div>
      <button class="btn" id="lsnWhy">💡 ${t('Vì sao?')}</button><span class="grow"></span><button class="btn primary lg" id="lsnNext">${t('Tiếp tục')}</button></div>`;
    $('#lsnW').onclick = () => say(c.word);
    $('#lsnWhy').onclick = () => explain(it);
    $('#lsnNext').onclick = () => next();
    $('#lsnNext').focus();
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
    ls.set(PKEY(L.demo), String(pathN(L.demo) + 1));
    ls.set('lk.lsn.acc', String(s.accuracy)); // nút kế tiếp thích nghi theo bài này (ux1)
    if (L.story) ls.set(L.SK, String((parseInt(ls.get(L.SK) || '0', 10) || 0) + 1)); // truyện/radio kế tiếp lần sau // nút bản đồ xong (demo: khóa riêng)
    try { if (window.Sfx) Sfx.win(); if (window.confetti && !matchMedia('(prefers-reduced-motion: reduce)').matches) confetti(90); } catch (e) { /* bỏ qua */ }
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
    view.querySelector('#lsnBody').innerHTML = `<div class="card lsn-end"><h2>🎉 ${t('Hoàn thành bài học!')}</h2>
      <div class="lsn-stats"><div><b>+${xp}</b><span class="tiny muted">XP</span></div><div><b>${s.accuracy}%</b><span class="tiny muted">${t('Tỉ lệ trả lời đúng')}</span></div><div><b>🔥 ${s.best}</b><span class="tiny muted">${t('COMBO cao nhất')}</span></div><div><b>${Math.max(1, Math.round((Date.now() - L.t0) / 60000))}′</b><span class="tiny muted">${t('Thời gian')}</span></div></div>
      ${(L.picks || []).length ? `<p class="small">📘 ${t('Bạn đã học:')} <b lang="en">${L.picks.map(p => esc(p.card.word)).join(' · ')}</b></p>` : ''}
      ${weak.length ? `<p class="small">🔁 <b lang="en">${weak.map(esc).join(', ')}</b></p>` : `<p>⭐ ${t('Không sai câu nào!')}</p>`}
      <button class="btn primary lg lsn-go" id="lsnAgain">${t('Bài khác')} →</button><p><a class="small" href="#/lesson${Q(L.demo)}">${UI.icon('map')} ${t('Bản đồ bài học')}</a></p></div>`;
    bar(); $('.lsn-bar').firstChild.style.width = '100%';
    $('#lsnAgain').onclick = () => routes.lesson('go');
    $('#lsnAgain').focus();
  }
})();
