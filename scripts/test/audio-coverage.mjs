// Cổng độ phủ giọng Kokoro dựng sẵn (npm test): nhóm nội dung tĩnh nào tụt dưới sàn web/audio/coverage.json → đỏ.
// Sàn chỉ lên (audio.yml --ratchet sau mỗi lượt render). Kèm thử logic sàn: đổi giọng/khóa hàng loạt phải đỏ, thêm vài câu mới chưa render thì không.
import assert from 'node:assert/strict';
import { measure, readFloor, verdict, ratchet, GRACE } from '../audio/coverage.mjs';
const f = { groups: { a: { pct: 90, missing: 10 } } };
assert.deepEqual(verdict({ a: { pct: 90, missing: 10 } }, f), [], 'đúng sàn → xanh');
assert.deepEqual(verdict({ a: { pct: 89.9, missing: 10 + GRACE } }, f), [], `≤ ${GRACE} câu mới chưa render → xanh`);
assert.equal(verdict({ a: { pct: 50, missing: 500 } }, f).length, 1, 'đổi giọng làm hàng loạt câu mất file → đỏ');
assert.equal(verdict({}, f).length, 1, 'nhóm biến mất → đỏ');
assert.equal(verdict({ a: { pct: 90, missing: 10 }, b: { pct: 1, missing: 9 } }, f).length, 1, 'nhóm mới phải có sàn');
const up = ratchet({ a: { pct: 95, missing: 5 } }, f), down = ratchet({ a: { pct: 80, missing: 30 } }, f);
assert.deepEqual([up.groups.a.pct, up.groups.a.missing, down.groups.a.pct, down.groups.a.missing], [95, 5, 90, 10], 'sàn chỉ lên');
// Cổng giọng khi xuất lô lexicon-expand (06/11: 54 từ xuất khi chưa có giọng → words-uk/us 99,39 % → npm test đỏ mọi PR)
{
  const { wordsWithoutAudio } = await import('../audio/coverage.mjs'); const { pendingWords } = await import('../word-audio/lib.mjs');
  assert.deepEqual(wordsWithoutAudio(['zzqxvwnotaword', 'house']).filter(w => w === 'zzqxvwnotaword'), ['zzqxvwnotaword'], 'từ chưa render → báo thiếu giọng');
  assert.ok(Array.isArray(pendingWords()), 'pendingWords đọc lô chờ');
  const pr = fs.readFileSync('scripts/lexicon/expand/promote.mjs', 'utf8'), wa = fs.readFileSync('.github/workflows/word-audio.yml', 'utf8'), lib = fs.readFileSync('scripts/word-audio/lib.mjs', 'utf8');
  assert.ok(/wordsWithoutAudio/.test(pr) && /process\.exit\(4\)/.test(pr) && /LX_AUDIO_MAX/.test(pr), 'promote.mjs chặn xuất lô khi nhiều từ chưa có giọng');
  assert.ok(/WORD_AUDIO_PENDING: '1'/.test(wa) && /WORD_AUDIO_PENDING === '1'/.test(lib), 'word-audio render từ của lô chờ trước khi xuất');
}const m = await measure(), bad = verdict(m, readFloor());
const miss = Object.values(m).reduce((s, x) => s + x.missing, 0);
if (bad.length) { console.error('✗ audio-coverage:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`✓ audio-coverage: ${Object.keys(m).length} nhóm không tụt dưới sàn · còn ${miss} câu/từ tĩnh rơi về giọng máy`);
// Số shard động của audio.yml (scripts/ci/shards.mjs): chừa 8 runner cho check PR, trần 24, ít việc → ít shard, API lỗi (bận 40) → 1
import { shardCount } from '../ci/shards.mjs';
assert.deepEqual([shardCount({ left: 12939, busy: 13, per: 500 }), shardCount({ left: 12939, busy: 38, per: 500 }), shardCount({ left: 100, busy: 0, per: 500 }), shardCount({ left: 1e5, busy: 0, per: 500 }), shardCount({ left: 1e5, busy: 40, per: 500 })], [19, 1, 1, 24, 1]);
// Nguồn corpus phải tồn tại (không bỏ qua âm thầm): mọi đường dẫn web/… viết thẳng trong corpus.mjs có thật, và hàm nạp ném lỗi khi thiếu tệp
{
  const src = fs.readFileSync('scripts/sentence-audio/corpus.mjs', 'utf8');
  assert.ok(/nguồn không tồn tại/.test(src) && /!fs\.existsSync\(f\)\) throw/.test(src), 'corpus.mjs: nguồn thiếu phải là lỗi cứng');
  const lit = [...new Set([...src.matchAll(/'(web\/[A-Za-z0-9_\-./]+\.(?:js|json|tsv))'/g)].map(m => m[1]))].filter(f => !f.includes('${'));
  const gone = lit.filter(f => !fs.existsSync(f));
  assert.deepEqual(gone, [], `corpus.mjs trỏ tới tệp không còn: ${gone.join(', ')}`);
}
// LessonTeacher.say: thiếu file cả câu → UI.tts phải được thử file từng câu (không noHq) – 1/11 lời giáo viên luôn rơi về giọng máy
import fs from 'node:fs';
assert.ok(!/noHq:\s*!!o\.voice/.test(fs.readFileSync('web/js/lesson/teacher.js', 'utf8')), 'web/js/lesson/teacher.js: dự phòng không được bỏ qua giọng Kokoro (noHq)');
// Commit chỉ mục 1 dòng khi nhiều workflow cùng ghi (scripts/ci/commit-regen.sh)
await import('./commit-regen.mjs');
