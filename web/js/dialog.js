/* Hộp thoại xác nhận/nhập/thông báo dùng chung (Promise) – thay window.confirm/alert/prompt.
 * Vì sao: iOS (Capacitor WKWebView) bắt buộc gọi completionHandler của hộp thoại gốc; app ở nền / đang có hộp khác → không gọi → NSInternalInconsistencyException (crash).
 * LXDialog.confirm(msg, {ok, cancel, danger, title}) → boolean · .prompt(msg, def, {ok, cancel, ph, title}) → string|null · .alert(msg, {ok, title}) → undefined.
 * Chạy được mọi trang (app, admin, cpack): không phụ thuộc ui.js; CSS css/dialog.css nạp lười lần đầu. Gọi lồng nhau xếp hàng, lần lượt từng hộp. Văn bản qua textContent (an toàn). */
(function (g) {
  const T = (k, d) => { try { const r = g.t && g.t(k); return r && r !== k ? r : (g.t ? k : d); } catch (e) { return d; } };
  const doc = () => g.document;
  let cssP = null, queue = Promise.resolve(), seq = 0;
  function css() {
    if (cssP) return cssP; const d = doc();
    if (d.querySelector('link[data-lxd]')) return (cssP = Promise.resolve());
    cssP = new Promise(res => { const l = d.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('css/dialog.css', (d.baseURI || g.location.href)).href; l.dataset.lxd = '1'; l.onload = l.onerror = () => res(); d.head.appendChild(l); setTimeout(res, 1500); });
    return cssP;
  }
  function open(kind, msg, def, o) {
    const d = doc(); o = o || {};
    if (!d || !d.body) return Promise.resolve(kind === 'confirm' ? false : kind === 'prompt' ? null : undefined);
    return css().then(() => new Promise(res => {
      const id = 'lxd' + (++seq), prev = d.activeElement, el = d.createElement('div');
      el.className = 'lxd'; el.dataset.kind = kind;
      const box = d.createElement('div'); box.className = 'lxd-box'; box.setAttribute('role', kind === 'alert' ? 'alertdialog' : 'dialog'); box.setAttribute('aria-modal', 'true'); box.tabIndex = -1;
      const body = d.createElement('div'); body.className = 'lxd-msg'; body.id = id; body.textContent = String(msg == null ? '' : msg);
      box.setAttribute('aria-labelledby', id);
      if (o.title) { const h = d.createElement('h2'); h.className = 'lxd-title'; h.id = id + 't'; h.textContent = o.title; box.setAttribute('aria-labelledby', id + 't'); box.setAttribute('aria-describedby', id); box.appendChild(h); }
      box.appendChild(body);
      let inp = null;
      if (kind === 'prompt') { inp = d.createElement('input'); inp.className = 'lxd-in'; inp.type = 'text'; inp.value = def == null ? '' : String(def); inp.setAttribute('aria-labelledby', id); inp.autocomplete = 'off'; if (o.ph) inp.placeholder = o.ph; box.appendChild(inp); }
      const row = d.createElement('div'); row.className = 'lxd-row';
      const mk = (txt, cls, fn) => { const b = d.createElement('button'); b.type = 'button'; b.className = 'lxd-btn ' + cls; b.textContent = txt; b.addEventListener('click', fn); row.appendChild(b); return b; };
      let done = false;
      const fin = v => { if (done) return; done = true; d.removeEventListener('keydown', key, true); el.remove(); try { prev && prev.isConnected && prev.focus && prev.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } res(v); };
      const cancel = () => fin(kind === 'confirm' ? false : kind === 'prompt' ? null : undefined);
      const ok = () => fin(kind === 'confirm' ? true : kind === 'prompt' ? inp.value : undefined);
      if (kind !== 'alert') mk(o.cancel || T('Hủy', 'Cancel'), 'ghost', cancel);
      const okB = mk(o.ok || 'OK', o.danger ? 'danger' : 'primary', ok);
      box.appendChild(row); el.appendChild(box);
      function key(e) {
        if (!el.isConnected) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return cancel(); }
        if (e.key === 'Enter' && kind === 'prompt' && e.target === inp) { e.preventDefault(); return ok(); }
        if (e.key !== 'Tab') return;
        const f = [...box.querySelectorAll('input,button')]; if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (!box.contains(d.activeElement)) { e.preventDefault(); a.focus(); } else if (e.shiftKey ? d.activeElement === a : d.activeElement === z) { e.preventDefault(); (e.shiftKey ? z : a).focus(); }
      }
      d.addEventListener('keydown', key, true);
      el.addEventListener('mousedown', e => { if (e.target === el && kind !== 'alert') cancel(); });
      d.body.appendChild(el);
      const f = () => { const t = inp || (o.danger ? row.firstChild : okB) || okB; try { t.focus({ preventScroll: true }); if (inp) inp.select(); } catch (e) { /* bỏ qua */ } if (!el.contains(d.activeElement)) box.focus(); };
      f(); g.requestAnimationFrame && g.requestAnimationFrame(f); setTimeout(f, 120); // WebView có thể bỏ qua focus() lần đầu
    }));
  }
  const enq = (kind, msg, def, o) => { const p = queue.then(() => open(kind, msg, def, o)); queue = p.catch(() => {}); return p; };
  g.LXDialog = {
    confirm: (msg, o) => enq('confirm', msg, null, o),
    prompt: (msg, def, o) => enq('prompt', msg, def, o),
    alert: (msg, o) => enq('alert', msg, null, o),
  };
})(typeof window !== 'undefined' ? window : globalThis);
