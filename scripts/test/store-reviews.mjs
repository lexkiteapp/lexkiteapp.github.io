#!/usr/bin/env node
// scripts/store/reviews.mjs (workflow store-reviews.yml): JWT ES256 (App Store Connect) + RS256 (Google service account) ký đúng,
// phân trang + lọc theo ngày, thiếu secret → bỏ qua có ghi chú (không đỏ), không lộ tên người đánh giá / khoá trong kết quả.
import crypto from 'node:crypto';
import fs from 'node:fs';
import * as R from '../store/reviews.mjs';

let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗ ' + m); } };
const dec = s => JSON.parse(Buffer.from(s, 'base64url').toString());
const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }), pem = ec.privateKey.export({ type: 'pkcs8', format: 'pem' });
const j = R.ascJwt({ kid: 'KID123', iss: 'ISS-1', pem }, 1000).split('.');
ok(dec(j[0]).alg === 'ES256' && dec(j[0]).kid === 'KID123' && dec(j[1]).aud === 'appstoreconnect-v1' && dec(j[1]).exp - dec(j[1]).iat <= 1200, 'ASC JWT header/claims (exp ≤ 20 phút)');
ok(crypto.verify('sha256', Buffer.from(j[0] + '.' + j[1]), { key: ec.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(j[2], 'base64url')), 'ASC JWT chữ ký ES256 (ieee-p1363) hợp lệ');
const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }), sa = { client_email: 'bot@x.iam.gserviceaccount.com', private_key: rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }) };
const g = R.googleJwt(sa, 1000).split('.');
ok(dec(g[1]).scope === 'https://www.googleapis.com/auth/androidpublisher' && dec(g[1]).iss === sa.client_email, 'Google JWT claims');
ok(crypto.verify('sha256', Buffer.from(g[0] + '.' + g[1]), rsa.publicKey, Buffer.from(g[2], 'base64url')), 'Google JWT chữ ký RS256 hợp lệ');

const now = Date.now(), iso = d => new Date(now - d * 864e5).toISOString();
const rv = (id, d, rating) => ({ id, attributes: { rating, title: 'T' + id, body: 'B' + id, territory: 'USA', createdDate: iso(d), reviewerNickname: 'SecretNick' + id } });
const pages = { 1: { data: [rv('a', 1, 5), rv('b', 5, 1)], links: { next: 'P2' } }, P2: { data: [rv('c', 20, 4), rv('d', 40, 2)], links: { next: 'P3' } }, P3: { data: [rv('e', 50, 3)] } };
const seen = [];
const asc = await R.ascReviews({ ASC_KEY_ID: 'K', ASC_ISSUER_ID: 'I', ASC_KEY_P8: pem }, { days: 30, fetchJson: async (u, o) => { seen.push([u, o]); return u.includes('/customerReviews') ? pages[1] : pages[u]; } });
ok(asc.list && asc.list.map(r => r.id).join() === 'a,b,c', 'ASC: phân trang + chỉ giữ 30 ngày, dừng khi quá hạn: ' + JSON.stringify(asc.list && asc.list.map(r => r.id)));
ok(seen.length === 2 && seen[0][0].includes(`/v1/apps/${R.ASC_APP_ID}/customerReviews`) && /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(seen[0][1].headers.Authorization), 'ASC: gọi đúng app + Bearer JWT, không tải trang 3');
ok((await R.ascReviews({})).skip, 'ASC thiếu secret → skip');
ok((await R.playReviews({})).skip, 'Play chưa có PLAY_SERVICE_ACCOUNT_JSON → skip (không đỏ)');
ok((await R.playReviews({ PLAY_SERVICE_ACCOUNT_JSON: '{x' })).error, 'Play JSON hỏng → lỗi rõ');
const pcalls = [];
const play = await R.playReviews({ PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify(sa) }, { fetchJson: async (u, o) => { pcalls.push(u); if (u.includes('oauth2')) return { access_token: 'AT' }; return u.includes('token=') ? { reviews: [{ reviewId: 'p2', authorName: 'Nick', comments: [{ userComment: { text: 'meh', starRating: 2, reviewerLanguage: 'vi', appVersionName: '1.0.1', lastModified: { seconds: String(Math.floor(now / 1000)) } } }] }] } : { reviews: [{ reviewId: 'p1', authorName: 'Nick', comments: [{ userComment: { text: 'great', starRating: 5 } }] }], tokenPagination: { nextPageToken: 'n2' } }; } });
ok(play.list && play.list.map(r => r.id + r.stars).join() === 'p15,p22' && pcalls[0].includes('oauth2') && pcalls.some(u => u.includes(`/applications/${R.PLAY_PKG}/reviews`)), 'Play: token OAuth + phân trang: ' + JSON.stringify(play.list));
const md = R.summary([...asc.list, ...play.list], ['x']);
ok(!/SecretNick|Nick|BEGIN|PRIVATE/.test(md + JSON.stringify(asc.list) + JSON.stringify(play.list)), 'không lộ tên người đánh giá / khoá');
ok(/★☆☆☆☆/.test(md) && md.indexOf('Bb') < md.indexOf('Ba'), 'tóm tắt: sao + sắp ≤ 2 sao lên đầu');
const wf = fs.readFileSync('.github/workflows/store-reviews.yml', 'utf8');
ok(/ASC_KEY_P8: \$\{\{ secrets\.ASC_KEY_P8 \}\}/.test(wf) && /PLAY_SERVICE_ACCOUNT_JSON: \$\{\{ secrets\.PLAY_SERVICE_ACCOUNT_JSON \}\}/.test(wf) && !/echo[^\n]*secrets\./.test(wf), 'workflow: secrets qua env, không echo');
if (fails) { console.error(`store-reviews: ${fails} lỗi`); process.exit(1); }
console.log('✓ store-reviews: JWT ES256/RS256, phân trang, lọc ngày, skip khi thiếu secret, không lộ tên/khoá');
