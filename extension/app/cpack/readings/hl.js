/* Tô sáng màn đọc: mỗi từ MỘT kiểu (lớp đứng trước thắng), từ quá phổ biến không bao giờ được tô (trừ từ khóa); đếm từ khác nhau tô thật. Gói lười 'readings'. */
(function () {
  const LAYERS = ['mine', 'kw', 'link', 'awl'];
  const COMMON = new Set([...Lexis.STOP, ...'get make take go come see know think say use find give want need many much one two new good first last big small like grow become keep let put show turn way even now people time year thing'.split(' ')]);
  const has = (el, l) => l === 'link' ? el.classList.contains('link') || el.classList.contains('col') : el.classList.contains(l) && (l === 'kw' || el.dataset.ph || !COMMON.has(el.dataset.w));
  const any = (tws, k) => tws.some(el => has(el, k));
  const paint = (tws, $, $$) => {
    const on = $$('[data-hl].on').map(x => x.dataset.hl), seen = {};
    tws.forEach(el => {
      const k = LAYERS.find(l => on.includes(l) && has(el, l));
      if (k) { el.dataset.l = k; (seen[k] = seen[k] || new Set()).add(el.dataset.ph || el.dataset.w); } else el.removeAttribute('data-l');
    });
    LAYERS.forEach(k => { $(`[data-count="${k}"]`).textContent = seen[k] ? seen[k].size : ''; });
  };
  window.ReadHL = { LAYERS, COMMON, has, any, paint };
})();
