# 🎭 So tờ con rối vừa chụp với tờ tham chiếu đã commit (đồng nhất tỉ lệ/màu/nét qua mọi tư thế). Thiếu tham chiếu → chép làm tham chiếu (commit lần đầu).
# Dùng: python3 scripts/puppet/sheetdiff.py out/puppet-rec/sheet.png docs/mocks/teacher-pilot/ref/ama-sheet.png out/puppet/sheetdiff.json
import json, os, shutil, sys
import numpy as np
from PIL import Image
new, ref, out = sys.argv[1:4]
if not os.path.exists(ref):
    os.makedirs(os.path.dirname(ref), exist_ok=True); shutil.copy(new, ref)
    json.dump({'ok': True, 'note': 'chưa có tham chiếu → đã tạo, cần commit'}, open(out, 'w')); print('tạo tham chiếu', ref); sys.exit(0)
a, b = Image.open(new).convert('RGB'), Image.open(ref).convert('RGB')
if a.size != b.size:
    json.dump({'ok': False, 'why': f'kích thước khác {a.size} ≠ {b.size}'}, open(out, 'w')); print('❌ kích thước tờ khác'); sys.exit(1)
d = np.abs(np.asarray(a, dtype=np.int16) - np.asarray(b, dtype=np.int16)).max(axis=2)
changed = float((d > 24).mean()); r = {'ok': changed <= 0.004, 'changedPx': round(changed, 5), 'meanAbs': round(float(d.mean()), 3)}
json.dump(r, open(out, 'w')); print(json.dumps(r))
if not r['ok']: Image.fromarray(((d > 24) * 255).astype('uint8')).save(out.replace('.json', '.png')); print('❌ tờ con rối khác tham chiếu > 0,4 % điểm ảnh'); sys.exit(1)
