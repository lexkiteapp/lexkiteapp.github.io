// Phiên âm từ điển → âm vị espeak cho Kokoro (scripts/word-audio/ipa.mjs; phương án render lại cụm ngắn trượt cổng ASR)
import assert from 'node:assert/strict'; import { espeakOf } from '../word-audio/ipa.mjs'; import { STRONG } from '../word-audio-strong.mjs';
for (const [i, o] of [['/fɑːm/', 'fˈɑːm'], ['/fɑːrm/', 'fˈɑːɹm'], ['/riːp/', 'ɹˈiːp'], ['/ˈwɪndoʊ/', 'wˈɪndoʊ'], ['/ˌʌndəˈstænd/', 'ˌʌndəstˈænd'], ['/ɡeɪm/', 'ɡˈeɪm'], ['/x?/', '']]) assert.equal(espeakOf(i), o, i);
// cùng kiểu ký hiệu với STRONG (viết tay, đã qua Whisper): dấu nhấn ngay trước nguyên âm
for (const [w, [uk]] of Object.entries(STRONG)) if (/^[^ˈ]*ˈ/.test(uk)) assert.equal(espeakOf('/' + uk.replace('ˈ', '') + '/').replace('ˈ', ''), uk.replace('ˈ', ''), w);
console.log('✓ word-ipa');
