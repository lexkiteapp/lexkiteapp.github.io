#!/usr/bin/env node
// IPA thay khi espeak-ng đổi ngôn ngữ (scripts/target/lib.mjs LANG_SWITCH + wiktIpa, dùng ở wikt-check.mjs) – 0 mạng, mục kaikki giả lập theo đúng dạng sounds[].ipa.
// Hồi quy lô fr 2 (lượt 45614057740): show/dos/rythme/business ra (en)…(fr) → build --check đỏ "IPA sai ký tự".
import { LANG_SWITCH, wiktIpa } from '../target/lib.mjs';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
ok(['(en)ʃəʊ(fr)', '(en)dɒs(fr)', '(en)ɹɪθm(fr)', '(en-us)bɪznəs(fr)'].every(x => LANG_SWITCH.test(x)), 'nhận cờ đổi ngôn ngữ của espeak (en, en-us)');
ok(!['ʃo', 'do', 'ʁitm', 'ɑ̃.fɑ̃', 'pɥi'].some(x => LANG_SWITCH.test(x)), 'IPA thường không bị coi là đổi ngôn ngữ');
const S = (...ipa) => ({ sounds: [{ audio: 'x.ogg' }, ...ipa.map(i => ({ ipa: i }))] });
ok(wiktIpa([S('/do/')]) === 'do', 'dos → /do/ (bỏ gạch chéo)');
ok(wiktIpa([S('/ʁit.m(ə)/', '/ʁitm/')]) === 'ʁitm', 'bỏ biến thể có âm tuỳ chọn trong ngoặc và dấu ngắt âm tiết');
ok(wiktIpa([S('[ˈbiz.nɛs]')]) === 'biznɛs', 'bỏ [ ], dấu nhấn, ngắt âm tiết (quy ước fr không nhấn)');
ok(wiktIpa([{ sounds: [] }, S('/ʃo/')]) === 'ʃo', 'lấy mục đầu tiên có IPA (mục cùng từ loại xếp trước)');
ok(wiktIpa([S('/ʃəʊ/ <en>')]) === '', 'IPA có ký tự ngoài bảng → rỗng (wikt-check LOẠI, không ship IPA chưa kiểm)');
ok(wiktIpa([]) === '' && wiktIpa([{}]) === '', 'không có IPA → rỗng');
process.exit(fail ? 1 : 0);
