// 💰 Ô quảng cáo trên trang nội dung tĩnh (blog, từ điển) – THUẦN (không fs/mạng): dùng chung build-blog.mjs, workers/dict/render.mjs (Worker + CI), test.
// Thiết kế + luật: docs/ADS.md §1. Chỉ được gọi khi web/js/ads/config.js bật + có mã ô tương ứng (scripts/lib/ads-static.mjs) → mặc định 0 byte, 0 DOM.
// Ô cao cố định 290px trong khung giữ chỗ cùng cao (.ad-hold): run.js có ẩn ô (luật chặn / đối chứng) thì khung vẫn giữ chiều cao → CLS = 0.
// <aside> không tabindex (không nhận focus), nhãn "Advertisement"/"Quảng cáo"… theo ngôn ngữ trang (aria-label + chữ thấy được).
export const ADV = { en: 'Advertisement', vi: 'Quảng cáo', es: 'Publicidad', pt: 'Publicidade', fr: 'Publicité', de: 'Anzeige', id: 'Iklan', th: 'โฆษณา', zh: '广告', ja: '広告', ko: '광고', hi: 'विज्ञापन', ar: 'إعلان', ru: 'Реклама', tr: 'Reklam' };
export const MID_MIN_WORDS = 1200;      // ô giữa bài chỉ với bài ≥ 1200 từ
export const MID_RANGE = [0.4, 0.5];    // vị trí: sau đoạn văn ở 40–50 % thân bài (tính theo chữ)
export const MAX_PER_PAGE = { blog: 2, dict: 1 }; // trần ô / trang (khớp AdsPolicy.PER_PAGE)
export const AD_JS = '<script defer src="/js/ads/static.js"></script>';
const BOX = 'box-sizing:border-box;height:290px;max-width:340px;padding:.4rem;border:1px solid var(--line);border-radius:14px;overflow:hidden;text-align:center;contain:strict';
const LABEL = '<div class="ad-label" aria-hidden="true" style="height:1rem;font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;opacity:.7;text-align:start">';

/** Ô có khung giữ chỗ (blog_mid, dict). place = khóa trong ADS_CONFIG.web.slots + AdsPolicy.SLOTS. */
export const adHold = (place, lang) => { const l = ADV[lang] || ADV.en; return `<div class="ad-hold" style="height:290px;max-width:340px;margin:1.5rem auto"><aside class="ad-slot" data-ad="${place}" aria-label="${l}" style="${BOX};margin:0 auto">${LABEL}${l}</div></aside></div>`; };
/** Ô cuối bài blog (giữ nguyên kiểu cũ). */
export const adEnd = lang => { const l = ADV[lang] || ADV.en; return `<aside class="ad-slot" data-ad="blog" aria-label="${l}" style="${BOX};margin:1.5rem auto">${LABEL}${l}</div></aside>`; };

const text = s => s.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
// Khối sau đó: không bao giờ là ảnh/video/sơ đồ/quảng cáo/kẻ ngang (AdSense cấm bố cục dễ nhầm với nội dung);
// danh sách/bảng/trích dẫn/mã chỉ được khi đoạn trước KHÔNG phải câu dẫn ("Ví dụ:" + danh sách là một khối ý, không chen ô vào giữa)
const MEDIA_NEXT = /^<(?!p>|h[2-4][ >]|ul>|ol>|div class="tbl"|blockquote>|pre>)/, LEAD = /[:：]\s*$/;

/** Vị trí chèn ô giữa bài trong danh sách khối cấp cao nhất của thân bài (render() của build-blog) → chỉ số khối đứng TRƯỚC ô, hoặc -1.
 * Chỉ sau một <p> cấp cao nhất (không nằm trong danh sách/bảng/trích dẫn – đó là khối riêng), không chứa ảnh, không phải khối cuối. */
export function midIndex(blocks, words) {
  if (!(words >= MID_MIN_WORDS) || !Array.isArray(blocks) || blocks.length < 3) return -1;
  const len = blocks.map(b => text(b).length), total = len.reduce((a, b) => a + b, 0);
  if (!total) return -1;
  let acc = 0, best = -1, bestD = Infinity;
  for (let i = 0; i < blocks.length - 1; i++) {
    acc += len[i];
    const b = blocks[i], f = acc / total;
    const nx = blocks[i + 1] || '';
    if (!/^<p>/.test(b) || /<img|<picture|<iframe/.test(b) || MEDIA_NEXT.test(nx) || (!/^<(p>|h[2-4])/.test(nx) && LEAD.test(text(b)))) continue;
    if (f < MID_RANGE[0] || f > MID_RANGE[1]) continue;
    const dd = Math.abs(f - (MID_RANGE[0] + MID_RANGE[1]) / 2);
    if (dd < bestD) { best = i; bestD = dd; }
  }
  return best;
}
/** Ghép thân bài, chèn `slot` sau khối midIndex (không có vị trí hợp lệ → không chèn). */
export const withMid = (blocks, words, slot) => { const k = slot ? midIndex(blocks, words) : -1; return blocks.map((b, i) => (i === k ? b + '\n' + slot : b)).join('\n'); };
