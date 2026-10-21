// ChoiceKit – logic dùng chung cho trắc nghiệm & phòng thi (tải lười cùng qengine/cbt; CSS do U3 làm):
//   • Phím tắt: A–D hoặc 1–4 chọn đáp án của câu đang làm (câu đang focus → câu vừa bấm → câu chưa làm đầu tiên đang thấy trên màn hình); không bắt khi đang gõ chữ.
//   • Gạch đáp án loại trừ: chuột phải (máy tính) hoặc nhấn giữ 0,5 s (điện thoại) lên một đáp án → class "struck"; nhớ theo lượt thi (sessionStorage),
//     tự gắn lại khi màn câu hỏi vẽ lại (MutationObserver).
//   • Kéo chia cột bài đọc/câu hỏi (split): thanh role="separator" kéo bằng chuột/cảm ứng hoặc phím ←/→; nhớ tỉ lệ (localStorage).
(function (g) {
  const ss = { get(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* riêng tư / đầy */ } } };
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } } };
  const typing = el => !!el && (el.isContentEditable || /^(TEXTAREA|SELECT)$/.test(el.tagName) || (el.tagName === 'INPUT' && !/^(radio|checkbox|button|submit)$/.test(el.type)));
  const groupsOf = root => { const m = new Map(); root.querySelectorAll('input[type=radio]').forEach(i => { if (!m.has(i.name)) m.set(i.name, []); m.get(i.name).push(i); }); return m; };
  const visible = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < (g.innerHeight || 800) && r.height > 0; };

  function attach(root, opt = {}) {
    if (!root || root.__ck) return root && root.__ck;
    const key = 'ck:' + (opt.key || (g.location && g.location.hash) || 'x');
    const struck = ss.get(key) || {}; // { tênNhóm: [giá trị, …] }
    let last = '';
    const save = () => ss.set(key, struck);
    const labelOf = i => i.closest('label') || i.parentElement;
    const paint = () => root.querySelectorAll('input[type=radio]').forEach(i => { const on = (struck[i.name] || []).includes(i.value), l = labelOf(i); if (l && l.classList.contains('struck') !== on) { l.classList.toggle('struck', on); l.setAttribute('data-struck', on ? '1' : ''); const b = l.querySelector('[data-strike]'); if (b) b.setAttribute('aria-pressed', String(on)); } });
    const toggle = i => { const a = struck[i.name] || (struck[i.name] = []), k = a.indexOf(i.value); if (k >= 0) a.splice(k, 1); else a.push(i.value); if (!a.length) delete struck[i.name]; save(); paint(); };
    const current = groups => {
      const a = document.activeElement;
      if (a && a.type === 'radio' && groups.has(a.name)) return a.name;
      if (last && groups.has(last)) return last;
      for (const [n, ins] of groups) if (!ins.some(x => x.checked) && !ins[0].disabled && visible(ins[0])) return n;
      for (const [n, ins] of groups) if (visible(ins[0])) return n;
      return '';
    };
    const onKey = e => {
      if (!root.isConnected) return detach();
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || typing(e.target)) return;
      // Alt/⌥ + phím: macOS đổi e.key thành ký tự đặc biệt (¡, å…) → dùng e.code (Digit1/Numpad1/KeyA) cho tổ hợp Alt
      const c = e.altKey ? /^(?:Digit|Numpad)([1-9])$|^Key([A-I])$/.exec(e.code || '') : null;
      const k = e.altKey ? (c ? (c[1] ? +c[1] - 1 : c[2].charCodeAt(0) - 65) : -1)
        : /^[1-9]$/.test(e.key) ? +e.key - 1 : /^[a-iA-I]$/.test(e.key) ? e.key.toLowerCase().charCodeAt(0) - 97 : -1;
      if (k < 0) return;
      const groups = groupsOf(root), n = current(groups), ins = n && groups.get(n);
      if (!ins || !ins[k] || ins[k].disabled) return;
      e.preventDefault();
      if (e.altKey) { toggle(ins[k]); return; } // Alt + phím: gạch / bỏ gạch phương án loại trừ
      if ((struck[n] || []).includes(ins[k].value)) toggle(ins[k]); // chọn lại đáp án đã gạch → bỏ gạch
      ins[k].click();
      const names = [...groups.keys()], nx = names.slice(names.indexOf(n) + 1).find(m => !groups.get(m).some(x => x.checked));
      last = nx || n;
      const el = nx && groups.get(nx)[0];
      if (el && !visible(el) && el.scrollIntoView) { let rm = false; try { rm = g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* bỏ qua */ } el.scrollIntoView({ block: 'center', behavior: rm ? 'auto' : 'smooth' }); }
    };
    const target = e => { const l = e.target.closest && e.target.closest('label'); const i = l && root.contains(l) && l.querySelector('input[type=radio]'); return i && !i.disabled ? i : null; };
    const onCtx = e => { const i = target(e); if (!i) return; e.preventDefault(); toggle(i); };
    let timer = 0, held = false;
    const onDown = e => { if (e.pointerType !== 'touch') return; const i = target(e); if (!i) return; held = false; clearTimeout(timer); timer = setTimeout(() => { held = true; toggle(i); if (navigator.vibrate) navigator.vibrate(15); }, 500); };
    const cancel = () => clearTimeout(timer);
    const onClick = e => {
      const btn = e.target.closest && e.target.closest('[data-strike]');
      if (btn && root.contains(btn)) {
        e.preventDefault(); e.stopPropagation();
        const l = btn.closest('label') || btn.parentElement;
        const i = l && l.querySelector('input[type=radio]');
        if (i && !i.disabled) toggle(i);
        return;
      }
      if (held) { held = false; e.preventDefault(); e.stopPropagation(); }
    }; // nhấn giữ hoặc bấm nút gạch để loại trừ
    const onTouch = e => { const i = e.target.closest && e.target.closest('input[type=radio]'); if (i) last = i.name; };
    const mo = g.MutationObserver ? new MutationObserver(() => paint()) : null;
    document.addEventListener('keydown', onKey);
    root.addEventListener('contextmenu', onCtx);
    root.addEventListener('pointerdown', onDown); root.addEventListener('pointerup', cancel); root.addEventListener('pointercancel', cancel); root.addEventListener('pointermove', cancel);
    root.addEventListener('click', onClick, true); root.addEventListener('change', onTouch);
    if (mo) mo.observe(root, { childList: true, subtree: true });
    paint();
    function detach() { document.removeEventListener('keydown', onKey); if (mo) mo.disconnect(); clearTimeout(timer); root.__ck = null; }
    root.__ck = { detach, paint, toggle, struck: () => JSON.parse(JSON.stringify(struck)), clear() { for (const k in struck) delete struck[k]; save(); paint(); } };
    return root.__ck;
  }

  // Kéo chia 2 cột: body là lưới 2 cột (vd .cbt-body), a = cột trái. Tỉ lệ 25–75 %, nhớ theo storeKey. Màn hẹp (1 cột) thì ẩn thanh.
  function split(body, a, storeKey = 'ck-split') {
    if (!body || !a || body.querySelector(':scope > .ck-split')) return;
    const bar = document.createElement('div');
    bar.className = 'ck-split'; bar.setAttribute('role', 'separator'); bar.setAttribute('aria-orientation', 'vertical'); bar.tabIndex = 0;
    bar.setAttribute('aria-label', g.t ? g.t('Kéo để đổi độ rộng cột') : 'Resize columns');
    a.after(bar);
    const set = p => { p = Math.min(75, Math.max(25, Math.round(p))); body.style.gridTemplateColumns = `minmax(0, ${p}fr) 10px minmax(0, ${100 - p}fr)`; bar.setAttribute('aria-valuenow', String(p)); ls.set(storeKey, String(p)); };
    const narrow = () => { try { return !!(g.matchMedia && g.matchMedia('(max-width: 900px)').matches); } catch (e) { return false; } };
    const apply = () => { if (narrow()) { body.style.gridTemplateColumns = ''; bar.hidden = true; } else { bar.hidden = false; set(+ls.get(storeKey) || 50); } };
    bar.addEventListener('pointerdown', e => {
      e.preventDefault(); bar.setPointerCapture && bar.setPointerCapture(e.pointerId); bar.classList.add('drag');
      const r = body.getBoundingClientRect();
      const mv = ev => set(((ev.clientX - r.left) / r.width) * 100);
      const up = () => { bar.classList.remove('drag'); bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); };
      bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });
    bar.addEventListener('keydown', e => { const p = +bar.getAttribute('aria-valuenow') || 50; if (e.key === 'ArrowLeft') { e.preventDefault(); set(p - 5); } else if (e.key === 'ArrowRight') { e.preventDefault(); set(p + 5); } else if (e.key === 'Home') { e.preventDefault(); set(50); } });
    bar.addEventListener('dblclick', () => set(50));
    try { const mq = g.matchMedia && g.matchMedia('(max-width: 900px)'); if (mq && mq.addEventListener) mq.addEventListener('change', apply); else if (mq && mq.addListener) mq.addListener(apply); } catch (e) { /* trình duyệt cũ: bỏ theo dõi đổi cỡ */ }
    apply();
  }

  g.ChoiceKit = { attach, split };
})(typeof window !== 'undefined' ? window : globalThis);
