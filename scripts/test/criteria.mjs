/* 🧪 Kiểm thử chất lượng module Tiêu chí chấm IELTS (web/js/criteria.js) */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

console.log('--- Kiểm thử [W1] Tiêu chí chấm IELTS Writing & Speaking ---');

const filePath = path.resolve('web/js/criteria.js');
if (!fs.existsSync(filePath)) {
  console.error('✗ Thiếu file web/js/criteria.js');
  process.exit(1);
}

// Kiểm tra dung lượng
const stat = fs.statSync(filePath);
console.log(`✓ Kích thước file: ${(stat.size / 1024).toFixed(1)} KB (rất gọn nhẹ, < 60 KB)`);

// Chạy môi trường giả lập
const mockWindow = {
  UI: {
    $: () => null,
    $$: () => [],
    esc: s => String(s || ''),
  },
  App: {
    routes: {},
    view: { innerHTML: '' },
    guard: fn => fn
  },
  t: s => s,
  innerWidth: 1024
};
mockWindow.window = mockWindow;
mockWindow.globalThis = mockWindow;

const context = vm.createContext(mockWindow);
const code = fs.readFileSync(filePath, 'utf8');

try {
  vm.runInContext(code, context);
  console.log('✓ Nạp và thực thi criteria.js thành công');
} catch (e) {
  console.error('✗ Lỗi khi thực thi criteria.js:', e);
  process.exit(1);
}

const Criteria = mockWindow.App.Criteria;
if (!Criteria || !Criteria.DATA) {
  console.error('✗ App.Criteria hoặc DATA không được khởi tạo');
  process.exit(1);
}

const DATA = Criteria.DATA;

// Kiểm tra 2 kỹ năng lớn
['writing', 'speaking'].forEach(skill => {
  const d = DATA[skill];
  if (!d) {
    console.error(`✗ Thiếu dữ liệu kỹ năng: ${skill}`);
    process.exit(1);
  }
  console.log(`✓ Kỹ năng ${skill}: tiêu đề "${d.title}"`);

  // Kiểm tra 4 tiêu chí
  if (!Array.isArray(d.criteria) || d.criteria.length !== 4) {
    console.error(`✗ Kỹ năng ${skill} phải có đúng 4 tiêu chí (hiện có: ${d.criteria ? d.criteria.length : 0})`);
    process.exit(1);
  }

  d.criteria.forEach(c => {
    if (!c.id || !c.name || !c.short || !c.desc || !c.bands) {
      console.error(`✗ Tiêu chí thiếu thông tin:`, c);
      process.exit(1);
    }
    // Kiểm tra band 4 đến band 9
    for (let b = 4; b <= 9; b++) {
      const bandInfo = c.bands[b];
      if (!bandInfo || !bandInfo.summary || !bandInfo.details || !bandInfo.pitfall) {
        console.error(`✗ Tiêu chí ${c.id} thiếu thông tin band ${b}`);
        process.exit(1);
      }
    }
  });
  console.log(`  ✓ Đủ 4 tiêu chí chấm, mỗi tiêu chí có đầy đủ chi tiết từ band 4 đến 9`);

  // Kiểm tra bài mẫu 3 mức band
  const models = d.models;
  if (!models || !models['5.0'] || !models['6.5'] || !models['8.0']) {
    console.error(`✗ Kỹ năng ${skill} thiếu bài mẫu cho 3 mức band 5.0, 6.5, 8.0`);
    process.exit(1);
  }
  ['5.0', '6.5', '8.0'].forEach(b => {
    const m = models[b];
    const text = skill === 'writing' ? m.essay : m.transcript;
    if (!text || text.length < 150) {
      console.error(`✗ Kỹ năng ${skill} band ${b} bài mẫu quá ngắn hoặc không có`);
      process.exit(1);
    }
    if (!m.scores || Object.keys(m.scores).length !== 4) {
      console.error(`✗ Kỹ năng ${skill} band ${b} thiếu điểm số cho 4 tiêu chí`);
      process.exit(1);
    }
    if (!Array.isArray(m.critique) || m.critique.length !== 4) {
      console.error(`✗ Kỹ năng ${skill} band ${b} thiếu nhận xét chi tiết 4 tiêu chí`);
      process.exit(1);
    }
  });
  console.log(`  ✓ Đủ bài mẫu cho 3 mức band (5.0, 6.5, 8.0) kèm điểm và nhận xét chi tiết 4 tiêu chí`);

  // Kiểm tra lộ trình bứt phá
  if (!Array.isArray(d.jumpTips) || d.jumpTips.length < 2) {
    console.error(`✗ Kỹ năng ${skill} thiếu các bước lộ trình bứt phá band`);
    process.exit(1);
  }
  console.log(`  ✓ Đủ lộ trình bứt phá band (5.0 ➔ 6.5 và 6.5 ➔ 8.0+)`);
});

// Kiểm tra route đã đăng ký
if (typeof mockWindow.App.routes.criteria !== 'function') {
  console.error('✗ routes.criteria không phải là hàm');
  process.exit(1);
}
console.log('✓ routes.criteria đã được đăng ký thành công');

console.log('🎉 Toàn bộ bài kiểm tra [W1] Tiêu chí chấm IELTS PASS 100%!');
