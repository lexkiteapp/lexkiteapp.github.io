/* 💾 LKFile.save(blob, tên, { share, title, text }) – lưu/chia sẻ file dùng chung (ảnh thành tích, Excel, JSON, Anki…).
 * – App gốc (Capacitor): WebView không hỗ trợ <a download> lẫn navigator.share({files}) → ghi file vào bộ nhớ đệm (Filesystem, CACHE)
 *   rồi mở bảng chia sẻ của hệ điều hành (Share): người dùng chọn Lưu vào Tệp/Drive hoặc gửi sang ứng dụng khác (AnkiDroid, Zalo…).
 *   File cũ trong thư mục đệm lk-share tự xóa sau 1 giờ. Android dùng FileProvider sẵn có (cache-path trong res/xml/file_paths.xml).
 * – Web/add-on: share=true và trình duyệt chia sẻ được file → navigator.share; không thì tải về bằng <a download> (như trước).
 * Kết quả: 'shared' | 'saved' | 'canceled'. Nạp lười (bundle share/anki/file trong js/app.js) – không nằm trong khung app. */
(function (g) {
  'use strict';
  if (g.LKFile) return;
  const DIR = 'lk-share', TTL = 36e5;
  const plugins = () => { const C = g.Capacitor, P = C && C.isNativePlatform && C.isNativePlatform() && C.Plugins; return P && P.Filesystem && P.Share ? P : null; };
  const safe = n => String(n || 'lexkite').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').slice(0, 120) || 'lexkite';
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).slice(String(r.result).indexOf(',') + 1)); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  const canceled = e => !!e && (e.name === 'AbortError' || /cancel/i.test(String(e.message || e)));

  function download(blob, name) {
    const d = document, a = d.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    d.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return 'saved';
  }

  async function cleanup(FS) {
    try {
      const now = Date.now(), r = await FS.readdir({ path: DIR, directory: 'CACHE' });
      await Promise.all((r.files || []).filter(f => f && f.name && now - (+f.mtime || 0) > TTL).map(f => FS.deleteFile({ path: DIR + '/' + f.name, directory: 'CACHE' }).catch(() => {})));
    } catch (e) { /* thư mục chưa có */ }
  }

  async function nativeSave(P, blob, name, o) {
    const FS = P.Filesystem; await cleanup(FS);
    const w = await FS.writeFile({ path: `${DIR}/${safe(name)}`, data: await b64(blob), directory: 'CACHE', recursive: true });
    try { await P.Share.share({ title: o.title || name, text: o.text || undefined, files: [w.uri], dialogTitle: o.title || name }); return 'shared'; }
    catch (e) { if (canceled(e)) return 'canceled'; await P.Share.share({ title: o.title || name, url: w.uri, dialogTitle: o.title || name }); return 'shared'; } // máy cũ không nhận files → url
  }

  // Lưu ý: nhánh web gọi navigator.share KHÔNG qua await nào trước đó (Safari iOS đòi thao tác người dùng còn hiệu lực)
  function save(blob, name, o = {}) {
    const P = plugins(); if (P) return nativeSave(P, blob, name, o);
    if (o.share && navigator.share && navigator.canShare) {
      let file = null; try { file = new File([blob], name, { type: blob.type || 'application/octet-stream' }); if (!navigator.canShare({ files: [file] })) file = null; } catch (e) { file = null; }
      if (file) return navigator.share({ files: [file], title: o.title || undefined, text: o.text || undefined }).then(() => 'shared', e => canceled(e) ? 'canceled' : download(blob, name));
    }
    return Promise.resolve(download(blob, name));
  }

  // Chia sẻ được file không (web: navigator.canShare; app gốc: luôn được)
  function canShare(blob, name) {
    if (plugins()) return true;
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File([blob], name || 'file', { type: blob.type })] })); } catch (e) { return false; }
  }

  g.LKFile = { save, canShare, native: () => !!plugins() };
})(typeof self !== 'undefined' ? self : this);
