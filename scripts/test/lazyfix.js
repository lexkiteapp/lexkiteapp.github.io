// Nạp các bundle lười như trình duyệt sẽ làm (đọc thẳng BUNDLES trong app.js), rồi thay App.need bằng hàm rỗng
module.exports = (w, fs, path, WEB, errors) => {
  const _w = {}; new Function('window', fs.readFileSync(path.join(WEB, 'js/bundles.js'), 'utf8'))(_w); const BUNDLES = _w.LK_BUNDLES; // web/js/bundles.js
  const files = [...new Set(Object.values(BUNDLES).flat())];
  const lang = (w.I18N && w.I18N.lang && w.I18N.lang()) || 'en';
  for (const f of files) {
    const p = path.join(WEB, f);
    if (!fs.existsSync(p)) { errors.push('missing ' + f); continue; }
    try { w.eval(fs.readFileSync(p, 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); }
    if (lang !== 'vi' && lang !== 'en') {
      const m = f.match(/^js\/i18n\/en\/([^/]+)\.js$/);
      if (m) {
        const lf = `js/i18n/${lang}/${m[1]}.js`, lp = path.join(WEB, lf);
        if (fs.existsSync(lp)) {
          try { w.eval(fs.readFileSync(lp, 'utf8')); } catch (e) { errors.push(lf + ': ' + e.message); }
        }
      }
    }
  }
  w.App.need = async () => {}; w.App.loaded = () => true;
};
