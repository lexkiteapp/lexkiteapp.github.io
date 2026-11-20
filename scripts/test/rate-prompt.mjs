#!/usr/bin/env node
// In-app rating prompt (docs/INSTALL-GROWTH.md): chính sách MỘT nguồn native/shared/review-prompt.json → chạy vectors bằng bản tham chiếu JS,
// khóa hằng số + vectors trong ReviewPrompt.swift / ReviewPrompt.kt / 2 file test native khớp JSON, và chỗ gọi nằm ở màn "xong bài".
import fs from 'node:fs';
let n = 0, fail = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('  ✗ ' + m); } };
const rd = f => fs.readFileSync(f, 'utf8'), P = JSON.parse(rd('native/shared/review-prompt.json'));
const ref = v => v.accuracy >= P.minAccuracy && v.lessons >= P.minLessons && v.asks < P.maxAsks && v.daysSinceInstall >= P.minDaysSinceInstall && (v.daysSinceLastAsk == null || v.daysSinceLastAsk >= P.gapDays);
for (const v of P.vectors) ok(ref(v) === v.ask, 'vector "' + v.name + '" = ' + v.ask);
ok(P.vectors.some(v => v.ask) && P.vectors.some(v => !v.ask) && P.vectors.length >= 9, 'đủ vectors cả hai chiều');

const sw = rd('native/ios/LexkiteKit/Sources/LKFeatures/Lesson/ReviewPrompt.swift'), kt = rd('native/android/feature-lesson/src/main/kotlin/com/lexkite/app/feature/lesson/ReviewPrompt.kt');
const num = (s, re) => +(s.match(re) || [])[1];
ok(num(sw, /minAccuracy = (\d+)/) === P.minAccuracy && num(sw, /minLessons = (\d+)/) === P.minLessons && num(sw, /minDaysSinceInstall = ([\d.]+)/) === P.minDaysSinceInstall && num(sw, /gapDays = ([\d.]+)/) === P.gapDays && num(sw, /maxAsks = (\d+)/) === P.maxAsks, 'Swift: hằng số khớp JSON');
ok(num(kt, /MIN_ACCURACY = (\d+)/) === P.minAccuracy && num(kt, /MIN_LESSONS = (\d+)/) === P.minLessons && num(kt, /MIN_DAYS_SINCE_INSTALL = ([\d.]+)/) === P.minDaysSinceInstall && num(kt, /GAP_DAYS = ([\d.]+)/) === P.gapDays && num(kt, /MAX_ASKS = (\d+)/) === P.maxAsks, 'Kotlin: hằng số khớp JSON');
// Vectors trong test native: mỗi dòng ask(...) = 1 vector, đúng thứ tự + kết quả
const fmt = (v, kotlin) => { const d = x => kotlin ? (Number.isInteger(x) ? x + '.0' : String(x)) : String(x), last = v.daysSinceLastAsk == null ? 'nil' : d(v.daysSinceLastAsk); return [v.accuracy, v.lessons, d(v.daysSinceInstall), kotlin ? last.replace('nil', 'null') : last, v.asks].join(', '); };
const st = rd('native/ios/LexkiteKit/Tests/LKFeaturesTests/ReviewPolicyTests.swift'), kts = rd('native/android/app/src/test/kotlin/com/lexkite/app/ReviewPolicyTest.kt');
for (const v of P.vectors) {
  ok(st.includes(`XCTAssert${v.ask ? 'True' : 'False'}(ask(${fmt(v, false)}))`), 'Swift test có vector "' + v.name + '"');
  ok(kts.includes(`assertEquals(${v.ask}, ask(${fmt(v, true)}))`), 'Kotlin test có vector "' + v.name + '"');
}
// Chỗ gọi: màn xong bài (iOS + Android), phụ thuộc Play review, không có cổng "đánh giá chúng tôi" tự vẽ
ok(/lessonFinished\(accuracy: model\.summary\.accuracy\)/.test(rd('native/ios/LexkiteKit/Sources/LKFeatures/Lesson/LessonComplete.swift')) && /requestReview\(\)/.test(rd('native/ios/LexkiteKit/Sources/LKFeatures/Lesson/LessonComplete.swift')), 'iOS: LessonComplete gọi ReviewLedger + requestReview');
ok(/ReviewPrompt\.consider\(ctx, f\.accuracy\)/.test(rd('native/android/feature-lesson/src/main/kotlin/com/lexkite/app/feature/lesson/LessonFeedback.kt')) && /com\.google\.android\.play:review:/.test(rd('native/android/feature-lesson/build.gradle.kts')), 'Android: FinishView gọi ReviewPrompt + có thư viện Play review');
const code = x => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
ok((code(kt).match(/launchReviewFlow/g) || []).length === 1 && !/reward|coupon|unlock|bonus/i.test(code(kt) + code(sw)), 'không thưởng cho đánh giá, một lần gọi flow');
console.log(fail ? `✗ rate-prompt: ${fail}/${n} lỗi` : `✓ rate-prompt: ${n} kiểm đều đạt`);
process.exit(fail ? 1 : 0);
