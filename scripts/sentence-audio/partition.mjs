// Chia việc tạo giọng cho ma trận audio.yml: sắp theo khóa (cố định) rồi lấy câu thứ i, i+N, i+2N… → các shard rời nhau, hợp lại = đúng tập một lượt 1 shard.
// Một nguồn cho scripts/gen-audio.mjs và test scripts/test/audio-shard-equiv.mjs.
export const sortedJobs = (all, has) => [...all].filter(([k]) => !has(k)).sort((a, b) => (a[0] < b[0] ? -1 : 1));
export const partitionJobs = (sorted, si, sn) => new Map(sorted.filter((_, i) => i % sn === si));
