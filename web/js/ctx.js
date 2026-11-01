/* Làm sạch câu ngữ cảnh (P2-1.1): ≤200 ký tự, bỏ HTML/ký tự điều khiển, bỏ cả câu nếu giống email/số điện thoại; src = chỉ tên miền ≤64. Cùng luật với functions/api/_ctx.js (test so khớp).
 * Tệp riêng để khung app không phình (đã sát ngân sách 377 KB): add-on nạp bằng importScripts (background.js); web không cần – máy chủ đã làm sạch. */
(function (g) {
  const Ctx = {
    text(s) {
      if (typeof s !== 'string') return '';
      let t = s.replace(/<[^>]*>/g, ' ').replace(/[<>]/g, ' ').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!t || /[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}/i.test(t) || (t.match(/\+?\d[\d\s().-]{7,}\d/g) || []).some(m => m.replace(/\D/g, '').length >= 9)) return '';
      if (t.length > 200) { t = t.slice(0, 200); if (/[\ud800-\udbff]$/.test(t)) t = t.slice(0, -1); t = t.trim(); }
      return t;
    },
    host(s) {
      if (typeof s !== 'string') return '';
      const m = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^\/?#@]*@)?([^\/?#:]+)(?=$|[\/?#]|:\d)/.exec(s.trim().toLowerCase()), h = m ? m[1].replace(/^www\./, '').replace(/\.$/, '') : '';
      return h.length <= 64 && /^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(h) && !/^\d+(\.\d+){3}$/.test(h) ? h : '';
    },
    /** Làm sạch ctx/src của 1 thẻ tại chỗ (gọi khi nhận thẻ từ cloud/nhập) */
    fix(c) { if (c && (c.ctx !== undefined || c.src !== undefined)) { const x = Ctx.text(c.ctx), h = x ? Ctx.host(c.src) : ''; if (x) c.ctx = x; else delete c.ctx; if (h) c.src = h; else delete c.src; } return c; },
  };
  g.Core = g.Core || {}; g.Core.Ctx = Ctx;
})(typeof self !== 'undefined' ? self : this);
