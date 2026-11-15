// Ngôn ngữ có trang từ điển ở R2 (content/seo/words-r2.json) + thư mục ra dist-words/. SEO_WORDS_R2=0 = cầu dao: mọi trang về dist/ như cũ.
import fs from 'node:fs';
export const WORDS_DIR = process.env.SEO_WORDS_DIST || 'dist-words';
export function r2Langs(env = process.env, file = 'content/seo/words-r2.json') {
  if (String(env.SEO_WORDS_R2) === '0') return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')).langs || []; } catch { return []; }
}
