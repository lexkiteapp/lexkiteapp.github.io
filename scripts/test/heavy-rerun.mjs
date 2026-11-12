#!/usr/bin/env node
// Luật 11 (làn nhanh trước làn nặng): chọn đúng lượt nặng cần chạy lại khi npm test xanh. Hàm thuần pickReruns + danh sách workflow nặng đọc từ file.
import { pickReruns, heavyFiles } from '../ci/heavy-rerun.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
const run = (id, f, o = {}) => ({ id, event: 'pull_request', status: 'completed', path: `.github/workflows/${f}`, ...o });
const J = (g, ...rest) => [{ name: 'gate', conclusion: g }, ...rest.map(c => ({ name: 'x', conclusion: c }))];
const H = ['qa-bot.yml', 'size-guard.yml'];
ok(pickReruns([run(1, 'qa-bot.yml')], { 1: J('success', 'skipped', 'skipped') }, H).join() === '1', 'gate xong, mọi job nặng skipped → chạy lại');
ok(pickReruns([run(1, 'qa-bot.yml')], { 1: J('success', 'success', 'skipped') }, H).length === 0, 'đã có job nặng chạy thật → KHÔNG chạy lại (không lặp việc)');
ok(pickReruns([run(1, 'qa-bot.yml')], { 1: J('failure', 'skipped') }, H).length === 0, 'gate lỗi → không chạy lại');
ok(pickReruns([run(1, 'qa-bot.yml', { status: 'in_progress' })], { 1: J('success', 'skipped') }, H).length === 0, 'lượt còn đang chạy → không chạy lại');
ok(pickReruns([run(1, 'ci.yml')], { 1: J('success', 'skipped') }, H).length === 0, 'workflow không thuộc nhóm nặng → bỏ qua');
ok(pickReruns([run(1, 'qa-bot.yml', { event: 'push' })], { 1: J('success', 'skipped') }, H).length === 0, 'chỉ lượt pull_request');
ok(pickReruns([run(1, 'qa-bot.yml')], { 1: J('success') }, H).length === 0, 'không có job nặng nào → không chạy lại');
const hf = heavyFiles();
ok(hf.length === 13 && ['teach-video.yml', 'video-motion.yml'].every(f => hf.includes(f)) && ['qa-bot.yml', 'journey-e2e.yml', 'scroll-perf.yml', 'size-guard.yml', 'mobile-qa.yml'].every(f => hf.includes(f)), `13 workflow nặng có dấu heavy-gate (${hf.length})`);
if (bad) process.exit(1); console.log('✓ heavy-rerun: chỉ chạy lại lượt nặng đã bị gate bỏ qua, 13 workflow nặng có gate');
