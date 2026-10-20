/* Mini-quiz cuối bài blog – tải lười, đếm ẩn danh /api/hit {t:'q'}. Bảng I dùng chung với build-blog.mjs (regex). */
(function () {
  'use strict';
  if (window._LK_QUIZ_INIT) return;
  window._LK_QUIZ_INIT = true;

  const I = {
    vi: ['Kiểm tra nhanh', 'Câu {n}/{total}', 'Câu tiếp theo', 'Xem kết quả', 'Xuất sắc!', 'Rất tốt!', 'Cố lên nhé!', 'Luyện tiếp trên app', 'Giải thích:', 'Chính xác!', 'Chưa đúng', 'Xem đáp án'],
    en: ['Quick quiz', 'Question {n}/{total}', 'Next question', 'See results', 'Excellent!', 'Well done!', 'Keep going!', 'Keep practising in the app', 'Explanation:', 'Correct!', 'Not quite', 'Show answers'],
    es: ['Mini prueba', 'Pregunta {n}/{total}', 'Siguiente', 'Ver resultados', '¡Excelente!', '¡Muy bien!', '¡Ánimo!', 'Practicar en la app', 'Explicación:', '¡Correcto!', 'Incorrecto', 'Ver respuestas'],
    pt: ['Quiz rápido', 'Pergunta {n}/{total}', 'Próxima', 'Ver resultados', 'Excelente!', 'Muito bem!', 'Continue assim!', 'Praticar no app', 'Explicação:', 'Correto!', 'Incorreto', 'Ver respostas'],
    fr: ['Mini-quiz', 'Question {n}/{total}', 'Suivante', 'Voir les résultats', 'Excellent !', 'Très bien !', 'Courage !', 'S’entraîner sur l’app', 'Explication :', 'Correct !', 'Incorrect', 'Voir les réponses'],
    de: ['Mini-Quiz', 'Frage {n}/{total}', 'Weiter', 'Ergebnis ansehen', 'Ausgezeichnet!', 'Sehr gut!', 'Weiter so!', 'In der App üben', 'Erklärung:', 'Richtig!', 'Falsch', 'Antworten zeigen'],
    id: ['Kuis singkat', 'Soal {n}/{total}', 'Lanjut', 'Lihat hasil', 'Luar biasa!', 'Bagus sekali!', 'Tetap semangat!', 'Latihan di app', 'Penjelasan:', 'Tepat!', 'Kurang tepat', 'Lihat jawaban'],
    th: ['ควิซสั้น', 'ข้อ {n}/{total}', 'ข้อถัดไป', 'ดูผลลัพธ์', 'ยอดเยี่ยม!', 'ดีมาก!', 'สู้ต่อไป!', 'ฝึกต่อในแอป', 'คำอธิบาย:', 'ถูกต้อง!', 'ยังไม่ถูก', 'ดูเฉลย'],
    zh: ['随堂小测', '第 {n}/{total} 题', '下一题', '查看结果', '太棒了！', '很好！', '继续加油！', '前往 App 练习', '解析：', '回答正确！', '答错了', '查看答案'],
    ja: ['ミニクイズ', '第 {n}/{total} 問', '次へ', '結果を見る', '素晴らしい！', 'よくできました！', 'その調子！', 'アプリで練習', '解説：', '正解！', '不正解', '答えを見る'],
    ko: ['미니 퀴즈', '문제 {n}/{total}', '다음', '결과 보기', '완벽해요!', '잘하셨어요!', '힘내세요!', '앱에서 연습하기', '해설:', '정답!', '오답', '정답 보기'],
    hi: ['त्वरित क्विज़', 'प्रश्न {n}/{total}', 'अगला', 'परिणाम देखें', 'शानदार!', 'बहुत बढ़िया!', 'कोशिश जारी रखें!', 'ऐप में अभ्यास करें', 'स्पष्टीकरण:', 'सही!', 'सही नहीं', 'उत्तर देखें'],
    ar: ['اختبار سريع', 'سؤال {n}/{total}', 'التالي', 'عرض النتيجة', 'ممتاز!', 'أحسنت!', 'واصل المحاولة!', 'تدرّب في التطبيق', 'التوضيح:', 'صحيح!', 'غير صحيح', 'عرض الإجابات'],
    ru: ['Мини-тест', 'Вопрос {n}/{total}', 'Далее', 'Показать результат', 'Отлично!', 'Хорошо!', 'Не сдавайтесь!', 'Тренироваться в приложении', 'Пояснение:', 'Верно!', 'Неверно', 'Показать ответы'],
    tr: ['Hızlı test', 'Soru {n}/{total}', 'Sonraki', 'Sonuçları gör', 'Harika!', 'Çok iyi!', 'Pes etme!', 'Uygulamada çalış', 'Açıklama:', 'Doğru!', 'Yanlış', 'Cevapları göster']
  };

  function hit(ev) {
    try {
      const b = JSON.stringify({ t: 'q', ev: ev });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/hit', b);
      else fetch('/api/hit', { method: 'POST', body: b, keepalive: true }).catch(function () {});
    } catch (e) {}
  }

  function css() {
    if (document.getElementById('lk-qz-css')) return;
    const s = document.createElement('style');
    s.id = 'lk-qz-css';
    s.textContent = '.blog-quiz{--qok:#15803d;--qokb:#dcfce7;--qokt:#14532d;--qno:#dc2626;--qnob:#fee2e2;--qnot:#7f1d1d}' +
      '@media (prefers-color-scheme:dark){.blog-quiz{--qok:#4ade80;--qokb:#0f2e1c;--qokt:#bbf7d0;--qno:#f87171;--qnob:#3a1616;--qnot:#fecaca}}' +
      '.bq-box{padding:1.3rem;border-radius:16px;border:2px solid var(--line);background:var(--surface);color:var(--text)}' +
      '.bq-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem;padding-bottom:.6rem;border-bottom:1px solid var(--line)}' +
      '.bq-title{font-weight:800;font-size:1.1rem}' +
      '.bq-prog{font-size:.85rem;font-weight:700;color:var(--text);background:var(--accent-soft);padding:.2rem .6rem;border-radius:999px}' +
      '.bq-q{font-size:1.05rem;font-weight:700;line-height:1.6;margin:0 0 1rem;outline:0}' +
      '.bq-opts{display:grid;gap:.6rem;margin-bottom:1rem}' +
      '.bq-opt{display:flex;align-items:center;gap:.7rem;min-height:48px;padding:.7rem 1rem;border-radius:12px;border:2px solid var(--line);border-bottom-width:4px;background:var(--surface);color:var(--text);font:inherit;font-weight:600;text-align:start;cursor:pointer;transition:transform .12s,border-color .12s}' +
      '@media (hover:hover){.bq-opt:hover:not(:disabled){border-color:var(--primary);transform:translateY(-1px)}}' +
      '.bq-opt:active:not(:disabled){transform:translateY(2px);border-bottom-width:2px}' +
      '.bq-opt:focus-visible,.bq-btn:focus-visible,.bq-cta:focus-visible{outline:3px solid var(--primary);outline-offset:2px}' +
      '.bq-opt:disabled{cursor:default}' +
      '.bq-key{display:inline-grid;place-items:center;min-width:26px;height:26px;border-radius:7px;background:var(--accent-soft);font-size:.82rem;font-weight:800;flex-shrink:0}' +
      '.bq-opt.ok{border-color:var(--qok);background:var(--qokb);color:var(--qokt)}' +
      '.bq-opt.no{border-color:var(--qno);background:var(--qnob);color:var(--qnot);animation:bqSk .35s}' +
      '.bq-opt.ok .bq-key{background:var(--qok);color:var(--surface)}.bq-opt.no .bq-key{background:var(--qno);color:var(--surface)}' +
      '.bq-fb{padding:.8rem 1rem;border-radius:12px;margin-bottom:1rem;line-height:1.6;border:1.5px solid}' +
      '.bq-fb:empty{display:none}.bq-fb.ok{background:var(--qokb);border-color:var(--qok);color:var(--qokt)}.bq-fb.no{background:var(--qnob);border-color:var(--qno);color:var(--qnot)}' +
      '.bq-act{display:flex;justify-content:flex-end}' +
      '.bq-btn,.bq-cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.6rem 1.2rem;border-radius:10px;font:inherit;font-weight:700;cursor:pointer;border:0;background:var(--primary);color:var(--primary-ink);text-decoration:none}' +
      '.bq-res{text-align:center;padding:1rem}.bq-score{font-size:2.2rem;font-weight:900;color:var(--primary);outline:0}.bq-eval{font-weight:700;margin:.3rem 0 1.1rem}' +
      '@keyframes bqSk{20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}' +
      '@media (prefers-reduced-motion:reduce){.bq-opt{animation:none!important;transition:none!important}}';
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // utm trước # (sau # là route app)
  function ctaUrl(u, def) {
    u = /^\/(?!\/)/.test(u || '') ? u : (def || '/app/');
    if (/utm_source=/.test(u)) return u;
    const h = u.indexOf('#'), base = h < 0 ? u : u.slice(0, h), frag = h < 0 ? '' : u.slice(h);
    return base + (base.indexOf('?') < 0 ? '?' : '&') + 'utm_source=blog&utm_medium=quiz' + frag;
  }

  function init(c) {
    if (c.dataset.lkReady) return;
    let d;
    try { d = JSON.parse(c.dataset.quiz || ''); } catch (e) { return; }
    const it = (Array.isArray(d) ? d : (d && d.items) || []).filter(function (q) {
      return q && q.q && Array.isArray(q.options) && q.options.length > 1 && q.answer >= 0 && q.answer < q.options.length;
    });
    if (!it.length) return;
    c.dataset.lkReady = '1';
    css();
    const l = (c.dataset.lang || document.documentElement.lang || 'en').slice(0, 2);
    const t = I[l] || I.en, rtl = document.documentElement.dir === 'rtl', uid = 'bq' + Math.random().toString(36).slice(2, 7);
    let idx = 0, sc = 0;
    hit('quiz_view');

    function shell(inner) {
      c.innerHTML = '<div class="bq-box"><div class="bq-head"><h2 class="bq-title" style="margin:0">🧠 ' + esc(t[0]) + '</h2>' + inner;
    }

    function rQ(focus) {
      const q = it[idx];
      shell('<span class="bq-prog">' + esc(t[1].replace('{n}', idx + 1).replace('{total}', it.length)) + '</span></div>' +
        '<p class="bq-q" id="' + uid + 'q" tabindex="-1">' + esc(q.q) + '</p>' +
        '<div class="bq-opts" role="group" aria-labelledby="' + uid + 'q">' + q.options.map(function (o, i) {
          return '<button type="button" class="bq-opt" data-i="' + i + '"><span class="bq-key" aria-hidden="true">' + 'ABCDEF'.charAt(i) + '</span><span>' + esc(o) + '</span></button>';
        }).join('') + '</div><div class="bq-fb" aria-live="polite"></div><div class="bq-act" hidden><button type="button" class="bq-btn">' +
        esc(idx + 1 < it.length ? t[2] : t[3]) + (rtl ? ' ←' : ' →') + '</button></div></div>');
      const bs = c.querySelectorAll('.bq-opt'), fb = c.querySelector('.bq-fb'), act = c.querySelector('.bq-act'), nb = c.querySelector('.bq-btn');
      [].forEach.call(bs, function (b) {
        b.onclick = function () {
          if (act.hidden === false) return;
          const ch = +b.dataset.i, ok = ch === q.answer;
          if (ok) sc++;
          [].forEach.call(bs, function (x, i) {
            x.disabled = true;
            if (i === q.answer) { x.classList.add('ok'); x.setAttribute('aria-label', t[9] + ' ' + x.textContent); }
            else if (i === ch) x.classList.add('no');
          });
          fb.className = 'bq-fb ' + (ok ? 'ok' : 'no');
          fb.innerHTML = '<b>' + esc(ok ? t[9] : t[10]) + '</b>' + (q.explain ? ' <b>' + esc(t[8]) + '</b> ' + esc(q.explain) : '');
          act.hidden = false;
          nb.focus();
        };
      });
      nb.onclick = function () { if (++idx < it.length) rQ(true); else rR(); };
      if (focus) c.querySelector('.bq-q').focus();
    }

    function rR() {
      hit('quiz_done');
      const pct = sc / it.length, cta = (d && d.cta) || {};
      shell('</div><div class="bq-res"><div class="bq-score" tabindex="-1">' + sc + '/' + it.length + '</div><div class="bq-eval">' +
        esc(pct === 1 ? t[4] : pct >= 0.6 ? t[5] : t[6]) + '</div><a class="bq-cta" href="' + esc(ctaUrl(cta.url, c.dataset.app)) + '">' +
        esc(cta.text || t[7]) + (rtl ? ' ←' : ' →') + '</a></div></div>');
      c.querySelector('.bq-cta').onclick = function () { hit('quiz_cta'); };
      c.querySelector('.bq-score').focus();
    }

    rQ(false);
  }

  function scan() { [].forEach.call(document.querySelectorAll('.blog-quiz'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
})();
