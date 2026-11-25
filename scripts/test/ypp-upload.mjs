// Upload side honours content/video/teach2d/ypp.json (qc.py gate `ypp`): every tool that creates a public video sends the synthetic-media / AI flag and made-for-kids=false.
// YouTube direct (functions/api/youtube.js), YouTube + TikTok via GrabCast (functions/api/_social_mgr.js bodyFor). Facebook / Instagram have no API field for either flag (Meta labels AI media itself).
import fs from 'node:fs';
const P = JSON.parse(fs.readFileSync('content/video/teach2d/ypp.json', 'utf8')), yt = fs.readFileSync('functions/api/youtube.js', 'utf8'), mgr = fs.readFileSync('functions/api/_social_mgr.js', 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) { console.error('✗ ' + m); bad++; } };
ok(P.synthetic_media_disclosure === true && P.made_for_kids === false, 'ypp.json policy: synthetic disclosure true, made-for-kids false');
ok(new RegExp(`selfDeclaredMadeForKids: ${P.made_for_kids}, containsSyntheticMedia: ${P.synthetic_media_disclosure}`).test(yt), 'youtube.js status = ypp.json (selfDeclaredMadeForKids / containsSyntheticMedia)');
ok(new RegExp(`made_for_kids: ${P.made_for_kids}, contains_synthetic_media: ${P.synthetic_media_disclosure}`).test(mgr), '_social_mgr.js GrabCast youtube options = ypp.json');
ok(new RegExp(`is_aigc: ${P.synthetic_media_disclosure}`).test(mgr), '_social_mgr.js TikTok is_aigc = ypp.json');
if (bad) process.exit(1); console.log('✓ ypp-upload: upload tools send the ypp.json flags');
