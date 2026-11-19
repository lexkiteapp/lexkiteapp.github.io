// Đọc IPA Anh/Mỹ của khối phát âm UI.pronHtml THEO NHÃN (UK/US), không theo vị trí.
// Lý do: từ #178 thứ tự 2 giọng đổi theo người học (UI.accOrder: IELTS → UK trước, còn lại → US trước) và 2 giọng cùng IPA chỉ hiện 1 IPA;
// đọc theo vị trí (ipa[0]=UK, ipa[1]=US) làm dict-perf báo sai "uk/us đảo" + "us: undefined" dù kho đúng.
// Dùng chung: scripts/test/dict-perf.mjs (trong trang Chromium, qua READ_PRON_SRC) và scripts/test/ipa-accent.mjs (jsdom).
// Quy tắc: mỗi nhãn .pron-lb nhận IPA đứng SAU nó trước nhãn kế tiếp (viên "UK /x/ 🔊"); không có → IPA gần nhất TRƯỚC nó
// (viên chung "/x/ UK 🔊 US 🔊"). Bỏ IPA dạng mạnh (.ipa-st) của hư từ – IPA hiển thị chính là dạng yếu đứng đầu.
export function readPron(root) {
  const out = {}; if (!root) return out;
  const toks = [...root.querySelectorAll('.ipa, .pron-lb')].filter(el => !el.closest('.ipa-st'));
  toks.forEach((el, i) => {
    if (!el.classList.contains('pron-lb')) return;
    let ipa = null;
    for (let j = i + 1; j < toks.length && !toks[j].classList.contains('pron-lb'); j++) { ipa = toks[j]; break; }
    if (!ipa) for (let j = i - 1; j >= 0; j--) if (!toks[j].classList.contains('pron-lb')) { ipa = toks[j]; break; }
    const k = el.textContent.trim().toLowerCase(); if (k && !(k in out)) out[k] = ipa ? ipa.textContent.trim() : undefined;
  });
  return out; // { uk, us }
}
// Mã nguồn để chạy trong trang (page.evaluate) – cùng một hàm, không chép tay
export const READ_PRON_SRC = readPron.toString();
