/* 🎭 Cảnh hai nhân vật dùng chung (Chars.duo) – docs/CHARACTERS.md §Cảnh hai người; CSS: web/css/teacher-duo.css (BCSS gói lesson). */
(function (g) {
  const box = (cls, who, id, extra) => `<div class="lsn-tchw cduo-p ${cls}" data-who="${who}" aria-hidden="true"><div id="${id}"></div>${extra || ''}</div>`;
  const C = g.Chars || (g.Chars = {});
  /** Chars.duo({ ids:[id trái, id phải] (khung LessonTeacher.mount), floor:true = cảnh tự có mặt đỡ (không có thẻ đục phía sau), extra:[html cạnh từng người] }) → HTML cảnh. Ama trước, Carlos sau (RTL tự đảo). */
  C.duo = (o = {}) => { const [a = 'lsnTch', b = 'lsnTch2'] = o.ids || [], [xa, xb] = o.extra || [];
    return `<div class="lsn-duo2 cduo" data-duo="1">${box('cduo-a', 'ama', a, xa)}${box('cduo-b', 'carlos', b, xb)}${o.floor ? '<i class="cduo-floor"></i>' : ''}</div>`; };
  /** Chars.duoSpeak(root, who): nhấn nhẹ tỉ lệ + viền nhãn tên người đang nói – bật ngay khi câu hiện (không đợi tiếng), lesson/ui.js say() giữ đúng khi nghe lại. */
  C.duoSpeak = (root, who) => { const s = root && root.querySelector('.cduo'); if (!s) return; s.querySelectorAll('.cduo-p').forEach(p => { const t = p.querySelector('.tch'); if (t) t.classList.toggle('talk', p.dataset.who === who); }); const sc = s.closest('.cduo-scene'); if (sc) sc.dataset.speaker = who; };
})(self);
