// Vòng tự nâng cấp (bandit ε-greedy, chỉ đổi ưu tiên): clip có trọng số cao lên đầu, sàn khám phá ≥ 20 % (không tắt được), ổn định, không mất/nhân đôi clip, không có dữ liệu → giữ nguyên thứ tự.
const { rankClips, weightsFrom } = await import('../../functions/api/_social_mgr.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const clips = Array.from({ length: 50 }, (_, i) => ({ id: 'c' + i, template: i % 2 ? 'news' : 'teach', hook: i % 5 === 0 ? 'quiz' : 'fact', cefr: 'A2' }));
const W = { by: { template: { teach: { w: 2 }, news: { w: 0.5 } }, hook: { quiz: { w: 1.5 } } } };
const seq = (seed => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)(7);
let r = rankClips(clips, W, { explore: 0, rand: () => 0.99 }); // rand cao → không khám phá; explore 0 bị nâng lên sàn 20 % nhưng rand 0.99 ≥ 0.2
ok(r.order.length === 50 && new Set(r.order.map(c => c.id)).size === 50, 'không mất/nhân đôi clip');
ok(r.explored === 0 && r.order[0].template === 'teach' && r.order[0].hook === 'quiz', 'điểm cao nhất (teach × quiz) lên đầu');
ok(r.order.slice(0, 25).every(c => c.template === 'teach') && r.order.slice(25).every(c => c.template === 'news'), 'teach (w2) trước news (w0.5)');
ok(rankClips(clips, null, { rand: () => 0.99 }).order.map(c => c.id).join() === clips.map(c => c.id).join(), 'không có trọng số → giữ thứ tự cũ');
ok(rankClips(clips, { by: { template: {} } }, { rand: () => 0.99 }).order.map(c => c.id).join() === clips.map(c => c.id).join(), 'trọng số rỗng → giữ thứ tự cũ (ổn định)');
let ex = 0, N = 400; for (let i = 0; i < N; i++) ex += rankClips(clips, W, { explore: 0.2, rand: seq }).explored;
const rate = ex / (N * 49); ok(rate > 0.12 && rate < 0.3, 'tỉ lệ khám phá ≈ 20 % mỗi vị trí: ' + rate.toFixed(3));
ok(rankClips(clips, W, { explore: 0, rand: () => 0 }).explored > 0, 'explore=0 vẫn bị giữ sàn 20 % (không tắt khám phá)');
ok(rankClips([], W).order.length === 0 && rankClips([clips[0]], W, { rand: () => 0 }).order.length === 1, 'rỗng / 1 clip');
// từ số liệu → trọng số → thứ tự: template có tương tác cao nhận w > 1 và lên đầu
const rows = [{ template: 'teach', views: 1000, likes: 100, saves: 50, shares: 20, comments: 10 }, { template: 'news', views: 1000, likes: 5, saves: 0, shares: 0, comments: 0 }];
const wf = weightsFrom(rows), o = rankClips([{ id: 'n', template: 'news' }, { id: 't', template: 'teach' }], wf, { rand: () => 0.99 }).order;
ok(wf.by.template.teach.w > 1 && wf.by.template.news.w < 1 && o[0].id === 't', 'weightsFrom → rankClips: biến thể tốt lên trước');
if (fails) process.exit(1); console.log('social-bandit ok');
