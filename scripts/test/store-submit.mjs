// Unit test pipeline nộp store tự động (.github/workflows/store-submit.yml): version/build không dùng lại, JWT ES256 (ASC) + RS256 (Play)
// với khoá vứt đi sinh ngay trong test, payload đúng dạng JSON:API App Store Connect / androidpublisher v3, ghi chú đúng giới hạn 4000/500.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { ascJwt, createAsc, ascErrorText } from '../lib/asc-api.mjs';
import { parseVer, bumpVer, nextVersion, nextBuild, versionsFromTags, maxVer, FLOORS } from '../store/version.mjs';
import { planFrom, P, noteLang, whatsNewFor } from '../store/asc-submit.mjs';
import { serviceJwt, releaseNotes, productionTrack, nextRollout, rolloutDecision, usedFromTracks, noteLangPlay, STEPS } from '../store/play-api.mjs';
import { classify, compose, buildNotes, loadCfg, loadDicts, lastTag, parseLog, LIMITS, ALL_LANGS, tr } from '../store/release-notes.mjs';

let n = 0; const ps = [];
const t = (name, fn) => ps.push(Promise.resolve().then(fn).then(() => { n++; }, e => { e.message = `${name}: ${e.message}`; throw e; }));
const b64json = s => JSON.parse(Buffer.from(s, 'base64url').toString());

// ---------- version / build ----------
t('parse + bump', () => {
  assert.deepEqual(parseVer('1.0'), [1, 0, 0]); assert.equal(parseVer('x'), null);
  assert.equal(bumpVer('1.0', 'patch'), '1.0.1'); assert.equal(bumpVer('1.0.9', 'minor'), '1.1.0');
  assert.throws(() => bumpVer('1.0', 'major'));
  assert.equal(maxVer(['1.0', '1.0.10', '1.0.9', 'bad']), '1.0.10');
});
t('nextVersion không dùng lại, dùng tiếp bản đang sửa', () => {
  assert.deepEqual(nextVersion({ used: ['1.0'], bump: 'patch' }), { version: '1.0.1', reuseEditable: false });
  assert.deepEqual(nextVersion({ used: ['1.0', '1.0.1'], editable: '1.0.2', bump: 'patch' }), { version: '1.0.2', reuseEditable: true });
  assert.deepEqual(nextVersion({ used: ['1.0.1'], editable: '1.0.2', bump: 'minor' }), { version: '1.1.0', reuseEditable: false });
  // bản sửa được nhưng KHÔNG lớn hơn bản đã dùng (vd. 1.0 bị từ chối sau khi đã có 1.0.1) → không dùng lại
  assert.deepEqual(nextVersion({ used: ['1.0.1'], editable: '1.0', bump: 'patch' }), { version: '1.0.2', reuseEditable: false });
  assert.equal(nextVersion({ used: ['1.0.1'], floor: FLOORS.native.version }).version, '2.0.0');
  assert.equal(nextVersion({ used: ['2.0.0'], floor: FLOORS.native.version }).version, '2.0.1');
});
t('nextBuild = max + 1, có sàn', () => {
  assert.equal(nextBuild(['12', '57', '3']), 58);
  assert.equal(nextBuild(['1.0.57']), 58);
  assert.equal(nextBuild([], 10000), 10000);
  assert.equal(nextBuild(['10004'], 10000), 10005);
  assert.equal(nextBuild(['1012', '1013'], FLOORS.capacitor.androidCode), 1014);
});
t('tag store-*', () => {
  const tags = ['store-ios-1.0.1', 'store-ios-1.0.10', 'store-android-1.0.2', 'store-android-1.0.2-rollout-5', 'prod-x'];
  assert.deepEqual(versionsFromTags(tags, 'ios'), ['1.0.1', '1.0.10']);
  assert.deepEqual(versionsFromTags(tags, 'android'), ['1.0.2']);
  assert.equal(lastTag(tags, 'ios'), 'store-ios-1.0.10');
  assert.equal(lastTag([], 'ios'), null);
});

// ---------- JWT ----------
t('ASC JWT ES256 kiểm được bằng khoá công khai', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const jwt = ascJwt({ kid: 'KID123', iss: 'ISS-UUID', pem }, 1_700_000_000);
  const [h, b, s] = jwt.split('.');
  assert.deepEqual(b64json(h), { alg: 'ES256', kid: 'KID123', typ: 'JWT' });
  assert.deepEqual(b64json(b), { iss: 'ISS-UUID', iat: 1_700_000_000, exp: 1_700_001_100, aud: 'appstoreconnect-v1' });
  assert.equal(Buffer.from(s, 'base64url').length, 64, 'chữ ký ES256 dạng IEEE P1363 (r||s 64 byte), không DER');
  assert.ok(crypto.verify('sha256', Buffer.from(`${h}.${b}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')));
  assert.throws(() => ascJwt({ kid: 'k', iss: 'i', pem }, 0, 1300), /20 phút/);
});
t('Play JWT RS256 kiểm được bằng khoá công khai', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sa = { client_email: 'ci@x.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), private_key_id: 'abc', token_uri: 'https://oauth2.googleapis.com/token' };
  const [h, b, s] = serviceJwt(sa, 1000).split('.');
  assert.equal(b64json(h).alg, 'RS256'); assert.equal(b64json(h).kid, 'abc');
  const body = b64json(b);
  assert.equal(body.iss, sa.client_email); assert.equal(body.aud, sa.token_uri); assert.equal(body.exp - body.iat, 3600);
  assert.match(body.scope, /androidpublisher/);
  assert.ok(crypto.verify('sha256', Buffer.from(`${h}.${b}`), publicKey, Buffer.from(s, 'base64url')));
});
t('ASC client: Bearer JWT, thử lại 429, lỗi gọn không lộ khoá', async () => {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const calls = [];
  const fake = async (url, o) => { calls.push([url, o]); return calls.length === 1 ? { status: 429, ok: false, text: async () => '' } : { status: 403, ok: false, text: async () => JSON.stringify({ errors: [{ code: 'FORBIDDEN_ERROR', detail: 'no role' }] }) }; };
  const C = createAsc({ kid: 'k', iss: 'i', pem }, { fetchImpl: fake, sleep: async () => {} });
  await assert.rejects(C.get('/v1/users?limit=1'), e => e.status === 403 && /FORBIDDEN_ERROR: no role/.test(e.message) && !e.message.includes('PRIVATE'));
  assert.equal(calls.length, 2); assert.match(calls[0][1].headers.Authorization, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(ascErrorText('not json'), 'not json');
});

// ---------- ASC payload + kế hoạch ----------
const V = (id, versionString, appVersionState) => ({ id, attributes: { versionString, appVersionState } });
t('planFrom: live 1.0 → 1.0.1, build max+1', () => {
  const p = planFrom({ versions: [V('a', '1.0', 'READY_FOR_DISTRIBUTION')], builds: [{ attributes: { version: '5' } }, { attributes: { version: '12' } }] });
  assert.equal(p.version, '1.0.1'); assert.equal(p.build, 13); assert.equal(p.blocked, null); assert.equal(p.live, '1.0');
});
t('planFrom: bản đang chờ duyệt → chặn; bản sửa được → dùng tiếp', () => {
  assert.match(planFrom({ versions: [V('b', '1.0.1', 'WAITING_FOR_REVIEW'), V('a', '1.0', 'READY_FOR_DISTRIBUTION')], builds: [] }).blocked, /1\.0\.1/);
  const p = planFrom({ versions: [V('b', '1.0.1', 'DEVELOPER_REJECTED'), V('a', '1.0', 'READY_FOR_DISTRIBUTION')], builds: [] });
  assert.equal(p.version, '1.0.1'); assert.equal(p.reuseEditable, true); assert.equal(p.editable.id, 'b');
  assert.equal(planFrom({ versions: [], builds: [], app: 'native' }).build, 10000);
  assert.throws(() => planFrom({ versions: [], builds: [], app: 'x' }));
});
t('payload App Store Connect đúng dạng JSON:API', () => {
  assert.deepEqual(P.createVersion('6824714708', '1.0.1'), { data: { type: 'appStoreVersions', attributes: { platform: 'IOS', versionString: '1.0.1', releaseType: 'AFTER_APPROVAL' }, relationships: { app: { data: { type: 'apps', id: '6824714708' } } } } });
  assert.deepEqual(P.attachBuild('B'), { data: { type: 'builds', id: 'B' } });
  assert.deepEqual(P.encryption('B').data.attributes, { usesNonExemptEncryption: false });
  assert.deepEqual(P.whatsNew('L', 'hi'), { data: { type: 'appStoreVersionLocalizations', id: 'L', attributes: { whatsNew: 'hi' } } });
  assert.deepEqual(P.phased('V'), { data: { type: 'appStoreVersionPhasedReleases', attributes: { phasedReleaseState: 'INACTIVE' }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: 'V' } } } } });
  assert.deepEqual(P.submission('A').data.attributes, { platform: 'IOS' });
  assert.deepEqual(P.submissionItem('S', 'V').data.relationships, { reviewSubmission: { data: { type: 'reviewSubmissions', id: 'S' } }, appStoreVersion: { data: { type: 'appStoreVersions', id: 'V' } } });
  assert.deepEqual(P.submit('S'), { data: { type: 'reviewSubmissions', id: 'S', attributes: { submitted: true } } });
});
t('locale App Store / Play → ngôn ngữ ghi chú', () => {
  assert.equal(noteLang('vi'), 'vi'); assert.equal(noteLang('en-US'), 'en'); assert.equal(noteLang('en-GB'), 'en');
  assert.equal(noteLang('es-MX'), 'es'); assert.equal(noteLang('zh-Hans'), 'zh'); assert.equal(noteLang('zh-Hant'), 'en');
  assert.equal(noteLang('ar-SA'), 'ar'); assert.equal(noteLang('pt-PT'), 'pt'); assert.equal(noteLang('it'), 'en');
  assert.equal(noteLangPlay('zh-CN'), 'zh'); assert.equal(noteLangPlay('ja-JP'), 'ja'); assert.equal(noteLangPlay('zh-TW'), 'en'); assert.equal(noteLangPlay('es-419'), 'es');
  assert.throws(() => whatsNewFor('vi', { vi: 'x'.repeat(4001) }), /4000/);
});

// ---------- Play payload + rollout ----------
t('Play: tracks.update production 1 % + ghi chú ≤ 500 mọi ngôn ngữ', () => {
  const notes = { en: 'EN', vi: 'VI', ja: 'JA' };
  const body = productionTrack({ code: 1014, name: '1.0.2', notes, languages: ['en-US', 'vi', 'ja-JP', 'it-IT'] });
  assert.deepEqual(body, { track: 'production', releases: [{ name: '1.0.2 (1014)', versionCodes: ['1014'], status: 'inProgress', userFraction: 0.01, releaseNotes: [{ language: 'en-US', text: 'EN' }, { language: 'vi', text: 'VI' }, { language: 'ja-JP', text: 'JA' }, { language: 'it-IT', text: 'EN' }] }] });
  assert.equal(releaseNotes({ en: 'x' }, []).length, 15, 'không có danh sách listing → 15 ngôn ngữ store/metadata');
  assert.throws(() => releaseNotes({ en: 'x'.repeat(501) }, ['en-US']), /500/);
  assert.deepEqual(usedFromTracks([{ releases: [{ name: '1.0.1 (1012)', versionCodes: ['1012'] }] }, { releases: [{ versionCodes: ['1013'] }] }]), { codes: ['1012', '1013'], names: ['1.0.1'] });
});
t('rollout 1 → 5 → 20 → 50 → 100 %, chỉ khi vitals đạt', () => {
  assert.deepEqual(STEPS, [0.01, 0.05, 0.2, 0.5, 1]);
  const r = { name: '1.0.2 (1014)', versionCodes: ['1014'], status: 'inProgress', userFraction: 0.01, releaseNotes: [] };
  assert.equal(nextRollout(r).userFraction, 0.05);
  assert.equal(nextRollout({ ...r, userFraction: 0.2 }).userFraction, 0.5);
  const last = nextRollout({ ...r, userFraction: 0.5 });
  assert.equal(last.status, 'completed'); assert.ok(!('userFraction' in last));
  assert.equal(nextRollout({ ...r, status: 'completed' }), null); assert.equal(nextRollout(null), null);
  assert.equal(rolloutDecision({ vitals: null, hoursSinceLast: 30 }).go, true);
  assert.equal(rolloutDecision({ vitals: { crash: 0.002, anr: 0.001 }, hoursSinceLast: 30 }).go, true);
  assert.equal(rolloutDecision({ vitals: { crash: 0.02, anr: 0 }, hoursSinceLast: 30 }).bad, true);
  assert.equal(rolloutDecision({ vitals: { crash: 0, anr: 0.006 }, hoursSinceLast: 30 }).go, false);
  assert.equal(rolloutDecision({ vitals: null, hoursSinceLast: 3 }).go, false);
});

// ---------- ghi chú phát hành ----------
const cfg = loadCfg(), dicts = loadDicts();
t('classify: chỉ thay đổi người học thấy', () => {
  const commits = parseLog([
    '\x1eA\x1fÔn tập: thẻ lật nhanh hơn\nweb/js/study.js\nweb/js/i18n/en/study.js',
    '\x1eB\x1fÔn tập: sửa lỗi\nweb/js/study-modes.js',
    '\x1eC\x1fi18n: cập nhật bản dịch giao diện tự động [CF-Pages-Skip] [skip ci]\ni18n/ui/de.js',
    '\x1eD\x1fCI: gộp job\n.github/workflows/ci.yml\nweb/js/app.js',
    '\x1eE\x1fAdmin Backlinks: chặn\nweb/js/admin-backlinks.js',
    '\x1eF\x1fTra từ nhanh\nweb/js/dictionary.js\nscripts/test/dict.mjs',
    '\x1eG\x1fSEO quốc tế 2: dịch thật\nweb/js/i18n/en/core.js',
    '\x1eH\x1fBản dịch tự nhiên hơn 13 ngôn ngữ\ni18n/ui/ja.js',
  ].join('\n'));
  assert.equal(commits.length, 8); assert.deepEqual(commits[0].files, ['web/js/study.js', 'web/js/i18n/en/study.js']);
  const a = classify(commits, cfg, 'capacitor');
  assert.deepEqual(a.map(x => [x.id, x.count]), [['review', 2], ['dict', 1], ['languages', 1]]);
  assert.deepEqual(classify(commits, cfg, 'native'), [], 'app native chỉ tính native/**');
  assert.deepEqual(classify(parseLog('\x1eN\x1fNative M1: Today\nnative/android/feature-today/src/main/kotlin/Today.kt'), cfg, 'native').map(x => x.id), ['path']);
});
t('mọi câu có đủ 15 ngôn ngữ qua pipeline i18n, không lẫn tiếng Việt', () => {
  assert.equal(ALL_LANGS.length, 15);
  for (const k of [cfg.closing, ...cfg.areas.map(x => x.vi)]) for (const l of ALL_LANGS) assert.ok(tr(dicts, l, k), `${l}: ${k}`);
  assert.equal(tr({ de: { x: 'Ôn tập' } }, 'de', 'x'), null, 'bản dịch còn chữ Việt bị coi là thiếu');
});
t('ghi chú đúng giới hạn App Store 4000 / Play 500 ở mọi ngôn ngữ (cả khi đủ mọi vùng)', () => {
  const all = cfg.areas.map((x, i) => ({ id: x.id, vi: x.vi, count: 100 - i }));
  for (const [pf, max] of Object.entries(LIMITS)) {
    const notes = buildNotes(all, { ...cfg, maxAreas: cfg.areas.length }, dicts, max);
    assert.deepEqual(Object.keys(notes).sort(), [...ALL_LANGS].sort());
    for (const [l, txt] of Object.entries(notes)) {
      assert.ok([...txt].length <= max, `${pf}/${l}: ${[...txt].length} > ${max}`);
      assert.ok(txt.endsWith(tr(dicts, l, cfg.closing)), `${pf}/${l}: luôn giữ câu kết`);
      assert.ok(txt.split('\n').length >= 2, `${pf}/${l}: có ít nhất 1 ý mới`);
    }
  }
  const only = buildNotes([], cfg, dicts, 500);
  assert.equal(only.vi, cfg.closing, 'không có thay đổi lớn → chỉ câu kết');
  assert.throws(() => buildNotes([{ id: 'x', vi: 'Câu chưa dịch' }], cfg, dicts, 500), /thiếu bản dịch/);
});
t('compose: bỏ câu cuối cho vừa, không cắt giữa câu', () => {
  assert.equal(compose(['a'.repeat(10), 'b'.repeat(10)], 'END', 20), `• ${'a'.repeat(10)}\nEND`);
  assert.throws(() => compose([], 'x'.repeat(30), 20));
});
t('workflow store-submit dùng workflow tái dùng, không chép bước build', () => {
  const wf = fs.readFileSync(new URL('../../.github/workflows/store-submit.yml', import.meta.url), 'utf8');
  assert.match(wf, /uses: \.\/\.github\/workflows\/store-build-ios\.yml/);
  assert.match(wf, /uses: \.\/\.github\/workflows\/store-build-android\.yml/);
  assert.doesNotMatch(wf, /xcodebuild|gradlew/);
  assert.match(wf, /dry_run:[^\n]*default: true/);
  const tf = fs.readFileSync(new URL('../../.github/workflows/ios-testflight.yml', import.meta.url), 'utf8');
  assert.match(tf, /uses: \.\/\.github\/workflows\/store-build-ios\.yml/);
});

await Promise.all(ps);
console.log(`✓ store-submit: ${n} test`);
