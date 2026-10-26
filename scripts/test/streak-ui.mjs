import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

console.log('--- Kiểm tra [S1] Streak Freeze (StreakUI) ---');

const dom = new JSDOM(`<!DOCTYPE html><html><body>
  <div id="view"></div>
  <div id="modal" hidden></div>
  <div id="streakPill"></div>
</body></html>`, { url: 'https://lexkite.com/#/home' });

const { window } = dom;
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.self = window;

// Tích hợp từ điển mẫu
global.t = window.t = (k, p) => {
  let s = String(k);
  if (p) for (const [a, b] of Object.entries(p)) s = s.replaceAll('{' + a + '}', b);
  return s;
};

// Mock UI & Kit & Core
let lastModalHtml = '';
window.UI = { icon: (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`, addIcons: () => {},
  $: s => document.querySelector(s),
  $$: s => document.querySelectorAll(s),
  esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  modal: (html) => {
    lastModalHtml = html;
    const m = document.getElementById('modal');
    m.innerHTML = html;
    m.hidden = false;
    return m;
  },
  closeModal: () => {
    const m = document.getElementById('modal');
    m.hidden = true;
  },
};

window.Kit = {
  svg: (m, s) => `<svg data-mood="${m}" data-size="${s}"></svg>`,
};

const storeData = {};
window.Core = {
  todayKey: (d = new Date()) => d.toISOString().slice(0, 10),
  Stats: {
    freezeInfo(g) { g = g || {}; return { left: +g.freezes || 0, max: 2, used: Object.keys(g.frozen || {}).sort().slice(-7), lastSave: g.freezeSaved || '' }; }, // giống web/js/core.js
    streak(s) {
      return 5;
    },
  },
  Store: {
    get: async (k, def) => (k in storeData ? storeData[k] : def),
    set: async (k, v) => { storeData[k] = v; },
  },
};

// Nạp streak-ui.js
const code = fs.readFileSync('web/js/streak-ui.js', 'utf8');
vm.runInContext(code, vm.createContext(window));

const StreakUI = window.StreakUI;
assert.ok(StreakUI, 'StreakUI đã nạp thành công vào global');

// 1. Kiểm tra freezeInfo
const emptyInfo = StreakUI.freezeInfo(null);
assert.equal(emptyInfo.left, 0);
assert.equal(emptyInfo.max, 2);
assert.deepEqual(emptyInfo.used, []);
assert.equal(emptyInfo.lastSave, '');

const sampleStats = { freezes: 2, frozen: { '2026-10-15': 1, '2026-10-16': 1 }, freezeSaved: '2026-10-16' }; // dữ liệu game
const info = StreakUI.freezeInfo(sampleStats);
assert.equal(info.left, 2);
assert.equal(info.used.length, 2);
assert.equal(info.lastSave, '2026-10-16');
console.log('✓ freezeInfo: đọc đúng số lượt và danh sách ngày sử dụng');

// 2. Kiểm tra isFrozen
assert.equal(StreakUI.isFrozen('2026-10-16', sampleStats), true, 'Ngày 2026-10-16 phải là ngày đóng băng');
assert.equal(StreakUI.isFrozen('2026-10-14', sampleStats), false, 'Ngày 2026-10-14 không phải ngày đóng băng');
assert.equal(StreakUI.isFrozen('', sampleStats), false);
console.log('✓ isFrozen: nhận diện chính xác ngày đóng băng trên lịch');

// 3. Kiểm tra badgeHtml
const badgeHtml = StreakUI.badgeHtml(sampleStats);
assert.ok(badgeHtml.includes('streak-freeze-badge'), 'Chứa class streak-freeze-badge');
assert.ok(badgeHtml.includes('aria-label='), 'Có aria-label chuẩn a11y');
assert.ok(badgeHtml.includes('data-streak-freeze'), 'Có thuộc tính data-streak-freeze');
assert.ok(badgeHtml.includes('🧊×2'), 'Hiển thị đúng 🧊×2');
console.log('✓ badgeHtml: tạo markup chuẩn a11y với aria-label và title');

// 4. Kiểm tra openExplainer
StreakUI.openExplainer(sampleStats);
assert.ok(lastModalHtml.includes('Đóng băng chuỗi 🧊'), 'Modal explainer có tiêu đề');
assert.ok(lastModalHtml.includes('Tự động bảo vệ:'), 'Có phần giải thích tự động bảo vệ');
assert.ok(lastModalHtml.includes('2/2 lượt khả dụng'), 'Hiển thị đúng 2/2 lượt khả dụng');
console.log('✓ openExplainer: mở hộp thoại giải thích đầy đủ cơ chế');

// 5. Kiểm tra checkSavedNotice & showSavedModal
const today = window.Core.todayKey();
const savedStats = { freezes: 1, frozen: { [today]: 1 }, freezeSaved: today };

lastModalHtml = '';
await StreakUI.checkSavedNotice(savedStats);

// Chờ timeout 800ms
await new Promise(r => setTimeout(r, 900));

assert.ok(lastModalHtml.includes('Chuỗi đã được cứu 🧊'), 'Modal cứu chuỗi được mở khi lastSave === today');
assert.ok(lastModalHtml.includes('data-mood="happy"'), 'Mascot Kit xuất hiện trong màn hình cứu chuỗi');
assert.equal(storeData['streak_saved_seen'], today, 'Cờ streak_saved_seen được lưu vào Store');

// Gọi lại lần 2 trong cùng ngày -> không được mở modal lại
lastModalHtml = '';
await StreakUI.checkSavedNotice(savedStats);
await new Promise(r => setTimeout(r, 900));
assert.equal(lastModalHtml, '', 'Không hiện lại modal lần 2 trong cùng ngày');
console.log('✓ checkSavedNotice: chỉ hiện 1 lần trong ngày và nhớ cờ qua Store');

console.log('✓ Tất cả bài kiểm tra [S1] StreakUI đều PASS 100%!');
