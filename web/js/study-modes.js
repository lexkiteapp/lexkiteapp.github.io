/* ⚡ Ôn tập FSRS đa chế độ: Lật thẻ (Flip) · Gõ phản xạ (Spelling Recall) · Nghe chọn nghĩa (Audio Recall)
 * Tải lười cùng bundle 'swipe' (App.need('swipe')), +0 byte vào khung ứng dụng.
 * Tích hợp chặt chẽ với Core/FSRS, UI, Sfx, Distract.
 */
(function (g) {
  'use strict';

  const CSS = `
.sm-bar { display: inline-flex; align-items: center; background: var(--surface-2, rgba(255,255,255,0.08)); border-radius: 999px; padding: 2px; gap: 2px; border: 1px solid var(--border, rgba(255,255,255,0.12)); }
.sm-btn { border: none; background: transparent; color: var(--muted, #8e8ea0); padding: 4px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.16s ease; display: inline-flex; align-items: center; gap: 4px; line-height: 1.2; }
.sm-btn:hover { color: var(--text, #fff); }
.sm-btn.active { background: var(--surface-1, #24292e); color: var(--text, #fff); box-shadow: 0 1px 4px rgba(0,0,0,0.18); }
.sm-audio-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; min-height: 220px; text-align: center; }
.sm-audio-btn { width: 84px; height: 84px; border-radius: 50%; border: 3px solid var(--primary, #3b82f6); background: rgba(59,130,246,0.12); font-size: 2.2rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: transform 0.18s ease, background 0.18s ease; margin-bottom: 0.8rem; }
.sm-audio-btn:hover { transform: scale(1.06); background: rgba(59,130,246,0.22); }
.sm-audio-btn:active { transform: scale(0.95); }
.sm-choices { display: grid; grid-template-columns: 1fr; gap: 0.55rem; width: 100%; margin-top: 1rem; }
@media (min-width: 540px) { .sm-choices { grid-template-columns: 1fr 1fr; } }
.sm-choice-btn { position: relative; display: flex; align-items: center; text-align: left; padding: 0.65rem 0.85rem; border-radius: 10px; border: 1.5px solid var(--border, rgba(255,255,255,0.14)); background: var(--surface-2, rgba(255,255,255,0.05)); color: var(--text, #fff); font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.15s ease; user-select: none; }
.sm-choice-btn:hover:not(:disabled) { border-color: var(--primary, #3b82f6); background: rgba(59,130,246,0.08); }
.sm-choice-btn .sm-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: rgba(255,255,255,0.1); font-size: 0.75rem; font-weight: 700; margin-right: 0.6rem; flex-shrink: 0; color: var(--muted, #aaa); }
.sm-choice-btn.correct { border-color: var(--good, #2ecc71) !important; background: rgba(46,204,113,0.18) !important; color: #fff; }
.sm-choice-btn.wrong { border-color: var(--again, #eb5757) !important; background: rgba(235,87,87,0.18) !important; color: #fff; }
.sm-type-wrap { display: flex; flex-direction: column; align-items: center; width: 100%; text-align: center; }
.sm-type-input { width: 100%; max-width: 320px; font-size: 1.25rem; font-weight: 600; text-align: center; padding: 0.6rem 0.8rem; border-radius: 10px; border: 2px solid var(--border, rgba(255,255,255,0.15)); background: var(--surface-1, #1e1e24); color: var(--text, #fff); margin-top: 0.9rem; outline: none; transition: border-color 0.18s, box-shadow 0.18s; }
.sm-type-input:focus { border-color: var(--primary, #3b82f6); box-shadow: 0 0 0 3px rgba(59,130,246,0.25); }
.sm-type-input.ok { border-color: var(--good, #2ecc71); background: rgba(46,204,113,0.12); }
.sm-type-input.near { border-color: #f39c12; background: rgba(243,156,18,0.12); }
.sm-type-input.bad { border-color: var(--again, #eb5757); background: rgba(235,87,87,0.12); }
.sm-hint { margin-top: 0.4rem; font-size: 0.82rem; color: var(--muted, #999); }
.sm-res { margin-top: 0.5rem; font-size: 0.92rem; min-height: 1.4rem; font-weight: 600; }
`;

  function ensureStyle() {
    if (document.getElementById('studyModesCss')) return;
    const s = document.createElement('style');
    s.id = 'studyModesCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!?,;:]+$/, '');

  function dist(a, b) {
    if (g.UI && g.UI.similarity) {
      const n = Math.max(a.replace(/[^a-z ]/g, '').length, b.replace(/[^a-z ]/g, '').length);
      return Math.round((1 - g.UI.similarity(a, b)) * n);
    }
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  }

  /* Tự động quyết định chế độ ôn tập:
   * 1. Thẻ mới (reps === 0) hoặc lật ngược (rev): luôn 'flip' (lật thẻ cơ bản)
   * 2. Thẻ đã ôn ≥ 2 lần và từ ≤ 30 ký tự: 30% chuyển 'type' (gõ phản xạ)
   * 3. Thẻ đã ôn ≥ 1 lần, có phát âm: 20% chuyển 'audio' (nghe chọn nghĩa)
   * 4. Mặc định: 'flip'
   */
  function pickAutoMode(card, rev) {
    if (!card || !card.srs) return 'flip';
    const isNew = card.srs.reps === 0 && !card.srs.last;
    if (rev || isNew) return 'flip';
    const rand = Math.random();
    if (card.srs.reps >= 2 && (card.word || '').length <= 30 && rand < 0.32) return 'type';
    if (card.srs.reps >= 1 && rand >= 0.32 && rand < 0.52) return 'audio';
    return 'flip';
  }

  /* Tạo thanh toolbar chuyển chế độ ôn tập (Lật thẻ | Gõ phản xạ | Nghe chọn nghĩa) */
  function renderToolbar(activeMode, onChange) {
    ensureStyle();
    const t = g.t || (k => k);
    const wrap = document.createElement('div');
    wrap.className = 'sm-bar';
    wrap.setAttribute('role', 'radiogroup');
    wrap.setAttribute('aria-label', t('Chế độ ôn tập'));

    const modes = [
      { id: 'flip', icon: '🃏', label: t('Lật thẻ') },
      { id: 'type', icon: '✍️', label: t('Gõ phản xạ') },
      { id: 'audio', icon: '🎧', label: t('Nghe chọn nghĩa') }
    ];

    modes.forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sm-btn' + (activeMode === m.id ? ' active' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', activeMode === m.id ? 'true' : 'false');
      btn.setAttribute('title', m.label);
      btn.innerHTML = `<span aria-hidden="true">${m.icon}</span> <span>${m.label}</span>`;
      btn.onclick = e => {
        e.stopPropagation();
        if (activeMode !== m.id && onChange) onChange(m.id);
      };
      wrap.appendChild(btn);
    });

    return wrap;
  }

  /* Chế độ Gõ phản xạ (Spelling Recall) */
  function renderType(container, card, options) {
    ensureStyle();
    const t = g.t || (k => k);
    const esc = g.UI && g.UI.esc ? g.UI.esc : s => String(s || '').replace(/[&<>"']/g, '');
    const mean = options.mean || card.vi || card.def || '';

    const wrap = document.createElement('div');
    wrap.className = 'sm-type-wrap';

    const wordLetters = (card.word || '').replace(/[^A-Za-z]/g, '').length;
    const firstChar = (card.word || '')[0] || '';

    wrap.innerHTML = `
      <div class="vi" style="font-size:1.55rem;font-weight:700;margin-top:.4rem">${esc(mean)}</div>
      ${card.pos ? `<span class="chip pos" style="margin-top:.3rem">${esc(card.pos)}</span>` : ''}
      ${card.ex ? `<div class="ctx" style="margin-top:.6rem">“${options.cloze ? options.cloze(card.ex, card.word) : esc(card.ex)}”</div>` : ''}
      <input class="input sm-type-input" id="smTypeIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('Gõ từ tiếng Anh rồi Enter')}" aria-label="${t('Gõ từ tiếng Anh')}">
      <div class="sm-hint">${t('Gợi ý: bắt đầu bằng “{a}”, {n} chữ cái', { a: esc(firstChar), n: wordLetters })}</div>
      <div id="smTypeRes" class="sm-res" aria-live="polite"></div>
    `;

    container.innerHTML = '';
    container.appendChild(wrap);

    const inp = wrap.querySelector('#smTypeIn');
    const res = wrap.querySelector('#smTypeRes');
    setTimeout(() => inp && inp.focus(), 60);

    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      const val = norm(inp.value);
      if (!val) return;
      inp.disabled = true;

      const target = norm(card.word);
      const dd = dist(val, target);
      // Gợi ý mức FSRS: 0 lỗi -> Good (2); sai 1 chữ -> Hard (1); sai nhiều -> Again (0)
      const sugGrade = dd === 0 ? 2 : dd === 1 ? 1 : 0;

      inp.classList.remove('ok', 'near', 'bad');
      void inp.offsetWidth;
      inp.classList.add(dd === 0 ? 'ok' : dd === 1 ? 'near' : 'bad');

      if (dd === 0) {
        res.innerHTML = `✅ ${t('Chính xác!')}`;
        if (g.Sfx && g.Sfx.correct) g.Sfx.correct();
      } else if (dd === 1) {
        res.innerHTML = `🟡 ${t('Gần đúng – sai 1 chữ')}: <b>${esc(card.word)}</b>`;
        if (g.Sfx && g.Sfx.wrong) g.Sfx.wrong();
      } else {
        res.innerHTML = `❌ ${t('Chưa đúng')}: <b>${esc(card.word)}</b>`;
        if (g.Sfx && g.Sfx.wrong) g.Sfx.wrong();
      }

      if (options.onComplete) {
        options.onComplete({ grade: sugGrade, distance: dd, given: val });
      }
    });

    return wrap;
  }

  /* Chế độ Nghe chọn nghĩa (Audio Recall) */
  function renderAudioChoice(container, card, options) {
    ensureStyle();
    const t = g.t || (k => k);
    const esc = g.UI && g.UI.esc ? g.UI.esc : s => String(s || '').replace(/[&<>"']/g, '');
    const pool = options.pool || [];
    const correctMean = options.mean || card.vi || card.def || '';

    // Tạo 3 phương án nhiễu từ kho từ bằng Distract nếu có
    let distractors = [];
    if (g.Distract && g.Distract.pick && pool.length > 3) {
      try {
        distractors = g.Distract.pick(card, pool, { n: 3, key: 'vi', mean: x => (options.getMean ? options.getMean(x) : (x.vi || x.def || '')) });
      } catch (_) {}
    }
    if (distractors.length < 3) {
      const others = pool.filter(x => x && x.word !== card.word && (x.vi || x.def));
      const shuffled = others.sort(() => 0.5 - Math.random());
      distractors = shuffled.slice(0, 3);
    }

    const choices = [
      { text: correctMean, correct: true, card },
      ...distractors.map(d => ({
        text: options.getMean ? options.getMean(d) : (d.vi || d.def || ''),
        correct: false,
        card: d
      }))
    ];

    // Trộn ngẫu nhiên 4 phương án
    choices.sort(() => Math.random() - 0.5);

    const wrap = document.createElement('div');
    wrap.className = 'sm-audio-wrap';

    wrap.innerHTML = `
      <button class="sm-audio-btn" id="smAudioPlay" type="button" aria-label="${t('Nghe phát âm')}">🔊</button>
      <div class="muted small">${t('Chọn nghĩa đúng của từ bạn vừa nghe')}</div>
      <div class="sm-choices" role="radiogroup" aria-label="${t('Các phương án nghĩa')}">
        ${choices.map((c, i) => `
          <button class="sm-choice-btn" type="button" data-idx="${i}" data-correct="${c.correct ? '1' : '0'}" aria-label="${i + 1}. ${esc(c.text)}">
            <span class="sm-num" aria-hidden="true">${i + 1}</span>
            <span>${esc(c.text)}</span>
          </button>
        `).join('')}
      </div>
      <div class="muted tiny" style="margin-top:0.75rem">${t('Phím tắt: <span class="kbd">1</span>–<span class="kbd">4</span> chọn · <span class="kbd">P</span> nghe lại')}</div>
    `;

    container.innerHTML = '';
    container.appendChild(wrap);

    const playBtn = wrap.querySelector('#smAudioPlay');
    const playAudio = () => {
      if (options.speak) options.speak();
      else if (g.UI && g.UI.speak) g.UI.speak(card.word, 'en-US', card.audio);
    };

    if (playBtn) playBtn.onclick = e => { e.stopPropagation(); playAudio(); };
    setTimeout(playAudio, 180);

    let answered = false;
    const btns = wrap.querySelectorAll('.sm-choice-btn');

    function selectChoice(btn) {
      if (answered || !btn) return;
      answered = true;
      const isCorrect = btn.dataset.correct === '1';

      btns.forEach(b => {
        b.disabled = true;
        if (b.dataset.correct === '1') b.classList.add('correct');
      });

      if (!isCorrect) btn.classList.add('wrong');

      if (isCorrect) {
        if (g.Sfx && g.Sfx.correct) g.Sfx.correct();
      } else {
        if (g.Sfx && g.Sfx.wrong) g.Sfx.wrong();
      }

      const sugGrade = isCorrect ? 2 : 0; // Good (2) hoặc Again (0)
      if (options.onComplete) {
        options.onComplete({ grade: sugGrade, correct: isCorrect });
      }
    }

    btns.forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        selectChoice(b);
      };
    });

    const onKey = e => {
      if (answered) return;
      if (e.target.matches('input, textarea')) return;
      if (/^[1-4]$/.test(e.key)) {
        const idx = +e.key - 1;
        if (btns[idx]) {
          e.preventDefault();
          selectChoice(btns[idx]);
        }
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        playAudio();
      }
    };

    window.addEventListener('keydown', onKey);
    wrap._cleanup = () => window.removeEventListener('keydown', onKey);

    return wrap;
  }

  g.StudyModes = {
    pickAutoMode,
    renderToolbar,
    renderType,
    renderAudioChoice,
    dist,
    norm
  };
})(typeof window !== 'undefined' ? window : globalThis);
