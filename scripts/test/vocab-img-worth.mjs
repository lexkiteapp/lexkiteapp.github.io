// 11/11 (25 lượt fill liền 22:00–22:24 ngày 10/11, mỗi lượt 1 ảnh ≈ 156 neuron/ảnh đạt): lượt chỉ chạy khi có việc thật – plan bỏ khi < VIMG_MIN_GAPS nghĩa, chuỗi tự nối dừng khi lượt vừa rồi < VIMG_MIN_ACC ảnh.
import fs from 'fs'; import assert from 'assert/strict';
import { accPerKneuron } from '../vocab-img/report.mjs';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const W = fs.readFileSync(new URL('../../.github/workflows/vocab-img-scene.yml', import.meta.url), 'utf8'), SP = fs.readFileSync(new URL('../vocab-img/scene-publish.mjs', import.meta.url), 'utf8');
ok(/VIMG_MIN_GAPS: '\d+'/.test(W) && /VIMG_MIN_ACC: '\d+'/.test(W), 'ngưỡng khai báo một chỗ ở env workflow');
ok(/\[ "\$G" -ge "\$VIMG_MIN_GAPS" \] \|\| \{[^\n]*skip=1/.test(W) && !/\[ "\$G" -gt 0 \]/.test(W), 'plan: bỏ lượt khi số nghĩa vẽ được < ngưỡng (không còn -gt 0)');
const chain = W.slice(W.indexOf('Tự nối lượt (vắt hết kho'));
ok(/--gaps 1000000/.test(chain) && !/--gaps 1 /.test(chain) && /\$ACC" -ge "\$VIMG_MIN_ACC"/.test(chain) && /fill-report\.json'\)\.accepted/.test(chain), 'chuỗi: đếm đủ nghĩa + đòi lượt vừa rồi ≥ VIMG_MIN_ACC ảnh');
ok(+W.match(/VIMG_MIN_ACC: '(\d+)'/)[1] > 1, 'ngưỡng ảnh > 1: lượt 1 ảnh/lượt không tự nối');
// không nới ngưỡng chất lượng: giám khảo cảnh không đổi, chỉ thêm đo
ok(accPerKneuron(1, 156) === 6.41 && accPerKneuron(0, 500) === 0 && accPerKneuron(5, 0) === null, 'accPerKneuron: 1 ảnh/156 neuron = 6,41 ảnh đạt/1.000 neuron');
ok(/accepted_per_kneuron: accPerKneuron\(n, neur\)/.test(SP), 'fill-report ghi accepted_per_kneuron');
console.log(`✓ vocab-img-worth: ${n} kiểm`);
