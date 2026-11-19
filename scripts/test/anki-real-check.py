#!/usr/bin/env python3
"""Kiểm file .apkg do Lexkite xuất bằng chính Anki thật (thủ công, không chạy trong npm test).
Cài: python3 -m venv /tmp/ankivenv && /tmp/ankivenv/bin/pip install anki==24.11
Chạy: /tmp/ankivenv/bin/python scripts/test/anki-real-check.py lexkite-xxx.apkg
In: số ghi chú nhập mới, bộ thẻ, kiểu ghi chú, hạn ôn/độ nhớ FSRS 5 thẻ đầu, HTML mặt trước/sau; nhập lần 2 phải 0 thẻ mới (GUID cố định)."""
import os, sys, tempfile
from anki.collection import Collection, ImportAnkiPackageRequest, ImportAnkiPackageOptions
col = Collection(os.path.join(tempfile.mkdtemp(), 'c.anki2'))
req = lambda: ImportAnkiPackageRequest(package_path=sys.argv[1], options=ImportAnkiPackageOptions(with_scheduling=True))
r = col.import_anki_package(req())
print('mới', len(r.log.new), '· bộ thẻ', [d.name for d in col.decks.all_names_and_ids()], '· hôm nay', col.sched.today)
for cid in col.find_cards('')[:5]:
    c = col.get_card(cid)
    print(' ', c.note().fields[0], '| loại', c.type, '| hạn', c.due - (col.sched.today if c.type == 2 else 0), '| ivl', c.ivl, '| FSRS', str(c.memory_state).replace('\n', ' '))
c = col.get_card(col.find_cards('')[0]); print('mặt sau:', c.answer()[-400:])
r2 = col.import_anki_package(req()); print('nhập lần 2 → mới', len(r2.log.new), '(phải = 0)')
print('kiểm tra CSDL:', col.fix_integrity())
