// Phân loại trang tĩnh trong dist theo "loại" (mỗi loại quét 1 mẫu): dùng chung web-sweep + audit tổng (scripts/audit).
export const LANGS = ['ar', 'de', 'en', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'vi', 'zh'];
export const SKIP = /^(app|admin|design|templates|js|css|img|fonts|icons|audio|data|i18n|packs|sfx|teach|screenshots)\//;
export const typeOf = f => {
  const p = f.replace(/^assets\//, '').split('/'); let lang = '';
  if (LANGS.includes(p[0]) && p.length > 1) { lang = p[0]; p[0] = 'L'; }
  if (p.length >= 3 || (p.length === 2 && p[0] !== 'L')) p[p.length - (p.at(-1) === 'index.html' ? 2 : 1)] = '*';
  return { type: '/' + p.join('/').replace(/index\.html$/, ''), lang };
};
