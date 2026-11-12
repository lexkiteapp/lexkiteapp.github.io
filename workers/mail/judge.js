// Tự xác nhận nghĩa bản dịch mỗi đêm: câu bị dịch ngược nghi sai (lexkite.com/i18n/backcheck.json) → AI Cloudflare (gói miễn phí)
// duyệt theo lô 15 câu, lưu D1 i18n_judge (cùng bảng tab Quản trị → Chất lượng). Mỗi đêm tối đa ~90 câu để nằm trong hạn mức miễn phí.
export async function judgeNightly(env, budget = 90) {
  if (!env.AI || !env.DB) return { wrong: 0 };
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS i18n_judge (h TEXT PRIMARY KEY, lang TEXT, ok INTEGER, note TEXT, at INTEGER) WITHOUT ROWID').run();
  const rep = await (await fetch('https://lexkite.com/i18n/backcheck.json?x=' + Date.now())).json();
  const done = new Set(((await env.DB.prepare('SELECT h FROM i18n_judge').all()).results || []).map(r => r.h));
  let used = 0, wrongNew = 0; const langs = [];
  const SYS = 'You are a professional UI localization reviewer. For each numbered pair decide if the translation conveys the same meaning as the English UI text (minor wording/style differences are OK). Reply ONLY JSON: {"wrong":[{"i":number,"why":"short reason in Vietnamese"}]} listing only clearly wrong ones.';
  let gkeys = []; try { const r = await env.DB.prepare("SELECT v FROM config WHERE k = 'gemini_keys'").first(); gkeys = r ? JSON.parse(r.v).map(x => x.k) : []; } catch (e) { gkeys = []; }
  if (!env.GEM) gkeys = [];
  for (const [lang, L] of Object.entries(rep.langs || {})) {
    const todo = (L.flagged || []).filter(f => !done.has(f.h));
    for (let i = 0; i < todo.length && used < budget; i += 15) {
      const part = todo.slice(i, i + 15); used += part.length;
      const list = part.map((f, j) => `${j + 1}. EN: ${f.en.replace(/<[^>]+>/g, '')}\n   ${lang.toUpperCase()}: ${f.tr.replace(/<[^>]+>/g, '')}`).join('\n');
      let out;
      // Gemini trước (khóa quản trị thêm ở Quản trị, xoay vòng qua proxy Mỹ env.GEM) → lỗi/hết lượt mới dùng Cloudflare AI
      for (const k of gkeys) { if (out) break; try { const r = await env.GEM.fetch('https://gem.internal/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: 'models/gemini-3.8-flash:generateContent', key: k, body: { systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: 'user', parts: [{ text: list }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } } }) }); if (!r.ok) continue; const j = await r.json(); out = JSON.parse(j.candidates[0].content.parts.map(p => p.text || '').join('')); } catch (e) { /* khóa kế tiếp */ } }
      if (!out) try { const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages: [{ role: 'system', content: SYS }, { role: 'user', content: list }], max_tokens: 600 }); out = JSON.parse(String(r.response || r).match(/\{[\s\S]*\}/)[0]); } catch (e) { continue; }
      const wrong = new Map((out.wrong || []).map(w => [+w.i, String(w.why || '').slice(0, 200)]));
      wrongNew += wrong.size; if (wrong.size && !langs.includes(lang)) langs.push(lang);
      await env.DB.batch(part.map((f, j) => env.DB.prepare('INSERT OR REPLACE INTO i18n_judge (h, lang, ok, note, at) VALUES (?, ?, ?, ?, ?)').bind(f.h, lang, wrong.has(j + 1) ? 0 : 1, wrong.get(j + 1) || '', Date.now())));
    }
    if (used >= budget) break;
  }
  return { wrong: wrongNew, langs, judged: used };
}
