// Overlay QC gates unit test (scripts/video/tpl/overlay_gates.py): contrast >= 3:1, no overlap / outside card, SAFE, IPA == audited bank, stress dot.
import { execFileSync } from 'node:child_process';
execFileSync('python3', ['scripts/video/tpl/overlay_gates.py', '--test'], { stdio: 'inherit' });
console.log('overlay-gates: ok');
