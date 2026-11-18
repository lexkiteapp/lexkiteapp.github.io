// Bớt byte CSS nội tuyến của trang giới thiệu, không đổi hiển thị (tách khỏi build-landing.mjs: Tailwind của st-w-home quét build-landing.mjs
// theo từ → từ như "border" trong mã sẽ sinh thêm tiện ích và làm st-w-home.css lệch bản biên dịch).
  // Bớt byte nội tuyến không đổi hiển thị: (1) biến --tw-* khai báo ở khối preflight mà CSS nội tuyến không dùng (CSS ngoài có bản đủ, nạp ngay sau); (2) tiền tố -webkit-font-feature-settings (mọi trình duyệt hỗ trợ bản không tiền tố đứng ngay sau)
export const slimCss = out => noOp(slim(out));
const slim = o => o.replace(/\*,:after,:before\{[^}]*\}/, blk => blk.replace(/(--tw-[a-z0-9-]+):[^;}]*;?/g, (d, v) => new RegExp('var\\(' + v + '[,)]').test(o) ? d : '').replace(/;\}$/, '}')).replace(/-webkit-font-feature-settings:"liga";/g, '');
  // (3) --tw-{bg,text,border,ring}-opacity:1 mà mọi chỗ dùng đều là var(--tw-…-opacity,1) (dự phòng = 1) và không ở đâu đặt giá trị khác → khai báo thừa, bỏ (tính toán ra cùng giá trị)
  const noOp = o => ['bg', 'text', 'border', 'ring'].reduce((c, k) => { const v = '--tw-' + k + '-opacity', all = [...c.matchAll(new RegExp(v + ':([^;}]*)', 'g'))].map(m => m[1]), uses = [...c.matchAll(new RegExp('var\\(' + v + '([^)]*)\\)', 'g'))].map(m => m[1]);
    return all.length && all.every(x => x === '1') && uses.every(x => x === ',1') ? c.replace(new RegExp(v + ':1;', 'g'), '').replace(new RegExp(';?' + v + ':1\\}', 'g'), '}').split('/var(' + v + ',1)').join('') : c; }, o); // rgb(R G B/var(--tw-…-opacity,1)) ≡ rgb(R G B) khi biến không đặt ở đâu khác
