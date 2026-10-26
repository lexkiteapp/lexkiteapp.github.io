// 🔒 Kiểm thử web/js/ai-local.js với các global giả lập (không cần Chrome): không có → null, có → dùng, lỗi → null (nơi gọi dùng máy chủ), chặn tải ngầm.
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';
const SRC = fs.readFileSync('web/js/ai-local.js', 'utf8');
const load = (extra = {}) => {
  const g = { setTimeout, clearTimeout, Promise, JSON, Math, Date, Object, Array, String, Number, Map, Error, navigator: { deviceMemory: 8, userActivation: { isActive: false }, connection: {} }, ...extra };
  g.globalThis = g; vm.createContext(g); vm.runInContext(SRC, g); return g;
};
const mkApi = (state, impl) => { const calls = { create: 0, opts: [] }; return { calls, availability: async () => state, create: async o => { calls.create++; calls.opts.push(o); if (o && o.monitor) o.monitor({ addEventListener: (ev, f) => f({ loaded: 0.5 }) }); return impl(); } }; };
let n = 0; const ok = m => { n++; console.log('  ✓ ' + m); };

// 1) Không có API → mọi hàm trả null, không throw
{ const g = load(); const A = g.AILocal;
  assert.equal(await A.prompt('hi'), null); assert.equal(await A.translate('hi', 'en', 'vi'), null); assert.equal(await A.detect('hello'), null);
  assert.equal(await A.proofread('hi'), null); assert.equal(await A.summarize('x'), null); assert.equal(await A.rewrite('x'), null);
  const c = await A.caps(); assert.equal(c.prompt, 'unavailable'); assert.equal(c.translate, 'unavailable'); ok('không có API → null'); }

// 2) Có sẵn ('available') → được dùng; schema đúng → đối tượng; sai schema → null
{ const LM = mkApi('available', () => ({ prompt: async () => '{"mnemonic":"a vivid picture"}', destroy() {} }));
  const TR = mkApi('available', () => ({ translate: async t => 'VI:' + t }));
  const LD = mkApi('available', () => ({ detect: async () => [{ detectedLanguage: 'en', confidence: 0.95 }] }));
  const PR = mkApi('available', () => ({ proofread: async () => ({ correctedInput: 'He goes.', corrections: [{ startIndex: 3, endIndex: 5, correction: 'goes', type: 'grammar' }] }), destroy() {} }));
  const g = load({ LanguageModel: LM, Translator: TR, LanguageDetector: LD, Proofreader: PR }); const A = g.AILocal;
  const schema = { type: 'object', required: ['mnemonic'], properties: { mnemonic: { type: 'string', minLength: 5 } } };
  assert.deepEqual({ ...(await A.prompt('x', { schema })) }, { mnemonic: 'a vivid picture' });
  assert.equal(await A.prompt('x', { schema: { type: 'object', required: ['other'] } }), null);
  assert.equal(await A.translate('hello', 'en', 'vi'), 'VI:hello');
  assert.equal((await A.detect('hello world')).lang, 'en');
  const p = await A.proofread('He go.'); assert.equal(p.corrections[0].fix, 'goes');
  assert.equal(await A.check('This is plain English text for a test.', { lang: 'en' }), true);
  assert.equal(await A.check('This is plain English text for a test.', { lang: 'vi' }), false);
  assert.equal(LM.calls.opts[0].monitor, undefined); // đã có sẵn → không gắn theo dõi tải
  ok('available → dùng AI trên máy, kiểm schema/ngôn ngữ'); }

// 3) Lỗi / quá thời gian → null (nơi gọi dùng máy chủ)
{ const LM = mkApi('available', () => ({ prompt: async () => { throw new Error('boom'); }, destroy() {} }));
  const TR = mkApi('available', () => ({ translate: () => new Promise(() => {}) }));
  const g = load({ LanguageModel: LM, Translator: TR }); const A = g.AILocal;
  assert.equal(await A.prompt('x'), null);
  assert.equal(await A.translate('x', 'en', 'ja', { timeout: 30 }), null);
  const bad = mkApi('available', () => ({ prompt: async () => 'not json', destroy() {} }));
  assert.equal(await load({ LanguageModel: bad }).AILocal.prompt('x', { schema: { type: 'object' } }), null);
  ok('lỗi/timeout/JSON hỏng → null'); }

// 4) Chặn tải: 'downloadable' không tự tải; chỉ tải khi người dùng bấm + không dùng dữ liệu di động; máy yếu/Save-Data/tắt cài đặt → null
{ const mk = () => mkApi('downloadable', () => ({ prompt: async () => 'hi', destroy() {} }));
  let LM = mk(), g = load({ LanguageModel: LM });
  assert.equal(await g.AILocal.prompt('x'), null); assert.equal(LM.calls.create, 0);
  g.navigator.userActivation.isActive = true;
  assert.equal(await g.AILocal.prompt('x'), null); assert.equal(LM.calls.create, 0); // chưa bấm Tải → vẫn không
  let prog = 0; assert.equal(await g.AILocal.download('prompt', { onProgress: v => { prog = v; } }), true); assert.equal(LM.calls.create, 1); assert.equal(prog, 0.5);
  LM = mk(); g = load({ LanguageModel: LM }); g.navigator.userActivation.isActive = false;
  assert.equal(await g.AILocal.download('prompt'), false); // không có thao tác người dùng
  LM = mk(); g = load({ LanguageModel: LM }); g.navigator.userActivation.isActive = true; g.navigator.connection = { type: 'cellular' };
  assert.equal(await g.AILocal.download('prompt'), false); assert.equal(LM.calls.create, 0); // dữ liệu di động
  const av = mkApi('available', () => ({ prompt: async () => 'hi', destroy() {} }));
  g = load({ LanguageModel: av }); g.navigator.deviceMemory = 2; assert.equal(await g.AILocal.prompt('x'), null);
  g = load({ LanguageModel: av }); g.navigator.connection = { saveData: true }; assert.equal(await g.AILocal.prompt('x'), null);
  g = load({ LanguageModel: av, App: { state: { settings: { aiLocal: false } } } }); assert.equal(await g.AILocal.prompt('x'), null);
  g = load({ LanguageModel: av }); assert.equal(await g.AILocal.prompt('x'), 'hi');
  ok('chặn tải ngầm, dữ liệu di động, máy yếu, Save-Data, cài đặt tắt'); }

// 5) Khung app: ai-local.js không nằm trong SHELL; tính năng gọi qua App.need('ailocal'); đường máy chủ vẫn còn
{ const sw = fs.readFileSync('web/sw.js', 'utf8'), app = fs.readFileSync('web/js/app.js', 'utf8'), ai = fs.readFileSync('web/js/ai.js', 'utf8');
  assert(!/const SHELL = \[[^\]]*ai-local/.test(sw), 'ai-local.js không được vào khung app');
  assert(/ailocal: \['js\/ai-local\.js'\]/.test(app));
  assert(/localAI\(kind, body, text\)\) \|\| await call\(body\)/.test(ai), 'chấm bài: trên máy trước, máy chủ sau');
  assert(/return call\(prompt\);/.test(ai) && /callProxy/.test(ai), 'askLocal phải rơi về máy chủ');
  assert(fs.existsSync('extension/app/js/ai-local.js'), 'add-on phải có bản sao (ext-sync)');
  ok('lazy, không vào khung app, còn đường máy chủ, có bản add-on'); }
console.log(`✓ ai-local: ${n} nhóm kiểm thử`);
