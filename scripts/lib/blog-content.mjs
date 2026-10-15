// Đọc bài blog: content/blog/<lang>/<slug>.md = front matter (YAML tối giản: key: value, [a, b]) + Markdown.
// Dùng chung cho build-blog, blog-check, blog-schedule, blog-due – không phụ thuộc gói ngoài.
import fs from 'node:fs'; import path from 'node:path';
export const ROOT = 'content/blog';
export const CATEGORIES = { 'tu-vung': 'Từ vựng', ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', 'phuong-phap': 'Phương pháp học' };
export const config = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

const scalar = v => {
  v = v.trim();
  if (v === '') return '';
  if (v.startsWith('"')) { try { return JSON.parse(v); } catch (e) { return v.slice(1, -1); } }
  if (v.startsWith('[') && v.endsWith(']')) return v.slice(1, -1).split(',').map(s => scalar(s)).filter(s => s !== '');
  if (v === 'true' || v === 'false') return v === 'true';
  return v.replace(/\s+#.*$/, ''); // chú thích cuối dòng
};
export function parse(src, file = '') {
  src = src.replace(/^﻿/, '').normalize('NFC');
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error(`${file}: thiếu front matter (--- … ---)`);
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const kv = line.match(/^([A-Za-z][\w-]*):\s?(.*)$/);
    if (!kv) throw new Error(`${file}: dòng front matter không hợp lệ: ${line}`);
    data[kv[1]] = scalar(kv[2]);
  }
  return { data, body: src.slice(m[0].length), fmLines: m[1] };
}
// Sửa 1 trường front matter tại chỗ (giữ nguyên phần còn lại) – dùng cho bộ xếp lịch
export function setField(src, key, value) {
  const re = new RegExp(`^(${key}:)[^\\n]*$`, 'm'), end = src.indexOf('\n---', 4);
  if (re.test(src.slice(0, end))) return src.replace(re, `$1 ${value}`);
  return src.slice(0, end) + `\n${key}: ${value}` + src.slice(end);
}
export function loadPosts({ lang } = {}) {
  const out = [];
  if (!fs.existsSync(ROOT)) return out;
  for (const l of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, l);
    if (!fs.statSync(dir).isDirectory() || (lang && l !== lang) || !/^[a-z]{2}(-[a-z]+)?$/i.test(l)) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
      const file = path.join(dir, f), src = fs.readFileSync(file, 'utf8'), { data, body } = parse(src, file);
      out.push({ ...data, lang: data.lang || l, slug: data.slug || f.slice(0, -3), file, body, src });
    }
  }
  return out;
}
export const publishTime = p => (p.publishAt ? Date.parse(p.publishAt) : NaN);
export const isLive = (p, now = Date.now()) => p.status !== 'draft' && publishTime(p) <= now;
// Văn bản thuần để đếm từ / kiểm trùng: bỏ mã, ảnh, cú pháp Markdown, shortcode
export function plainText(body) {
  return body.replace(/```[\s\S]*?```/g, ' ').replace(/\{\{[^}]*\}\}/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, ' ').replace(/[#>*_`|~]/g, ' ');
}
export const wordCount = body => (plainText(body).match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;
