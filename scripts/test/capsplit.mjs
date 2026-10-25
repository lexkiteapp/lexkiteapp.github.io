// Caption pagination unit test (scripts/video/tpl/capsplit.py): no stray one-word caption pages (qc_v9 caption_script).
import { execFileSync } from 'node:child_process';
execFileSync('python3', ['scripts/video/tpl/test_capsplit.py'], { stdio: 'inherit' });
console.log('capsplit: ok');
