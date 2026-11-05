#!/usr/bin/env python3
"""Test công cụ dọn video rác (scripts/video/junk.py) + phân loại artifact (scripts/video/junk-artifacts.mjs) trên dữ liệu giả."""
import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'video'))
import junk  # noqa: E402

bad = 0


def ok(c, m):
    global bad
    print(('✓ ' if c else '✗ ') + m)
    if not c:
        bad += 1


def w(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(data)


def sha(b):
    return hashlib.sha256(b).hexdigest()


tmp = tempfile.mkdtemp(prefix='video-junk-')
quiet = lambda *a, **k: None  # noqa: E731
try:
    lib, repo, qd = os.path.join(tmp, 'lib'), os.path.join(tmp, 'repo'), os.path.join(tmp, 'quar')
    dup, orphan, refd, qcbad = b'DUP' * 5000, b'ORPHAN-' * 3000, b'REFERENCED-' * 2000, b'QCBAD-' * 1000
    w(lib + '/render/ref_ok.mp4', refd)
    w(lib + '/render/orphan.mp4', orphan)
    w(lib + '/render/zero.mp4', b'')
    w(lib + '/render/dup_a.mp4', dup)
    w(lib + '/render/dup_b.mp4', dup)
    os.utime(lib + '/render/dup_a.mp4', (1000, 1000))   # cũ hơn -> bản giữ
    w(lib + '/render/badqc/clip_x.mp4', qcbad)
    w(lib + '/render/badqc/qc.json', json.dumps({'ok': False, 'score': 50}).encode())
    w(lib + '/render/goodqc/clip_y.mp4', b'GOODQC' * 100)
    w(lib + '/render/goodqc/qc.json', json.dumps({'ok': True, 'score': 95}).encode())
    w(lib + '/render/rejected/old_take.mp4', b'REJECT' * 100)
    w(lib + '/anchor/mei_talk.mp4', b'MEI' * 4000)          # footage ngân hàng Mei (không ai tham chiếu)
    w(lib + '/anchor/kai_idle.mp4', b'')                    # rỗng nhưng vẫn BẢO VỆ
    w(lib + '/cafe/clips/other_bank.mp4', b'BANK' * 3000)   # dưới thư mục bank
    w(lib + '/cine/x/tools/render5_shots/ask_r24_ots_ama_talk_12_48_r_a0.07.mp4', b'SHOT' * 3000)   # cache render khoá băm (lesson5.py)
    w(lib + '/render/in_backup_manifest.mp4', b'MANI' * 3000)
    for i in range(10):
        w(lib + '/render/seq_tmp/frame_%04d.png' % i, b'F%d' % i * 50)
    w(repo + '/content/v.json', json.dumps({'clips': ['ref_ok', 'dup_a.mp4', 'goodqc/clip_y.mp4']}).encode())
    w(repo + '/brand/library/cine/archive-manifest.json', json.dumps({'files': {
        'render/in_backup_manifest.mp4': {'sha256': sha(b'MANI' * 3000), 'size': 12000, 'copies': [{'driveId': 1}]}}}).encode())

    m = junk.scan(lib, repo, probe=False, log=quiet)   # byte giả không phải video thật; ffprobe kiểm riêng bên dưới
    E = {e['path']: e for e in m['entries']}
    st = lambda p: (E[p]['status'], E[p]['reason'])  # noqa: E731
    ok(st('render/zero.mp4') == ('junk', 'broken'), 'file 0 byte = broken')
    ok(st('render/dup_b.mp4') == ('junk', 'dup-sha') and E['render/dup_b.mp4']['keep'] == 'render/dup_a.mp4', 'trùng sha: giữ bản cũ/được tham chiếu, bản kia dup-sha')
    ok(st('render/dup_a.mp4')[0] == 'keep', 'bản giữ của cặp trùng không bị đánh dấu')
    ok(st('render/badqc/clip_x.mp4') == ('junk', 'failed-qc'), 'qc.json ok=false -> failed-qc')
    ok(st('render/rejected/old_take.mp4') == ('junk', 'failed-qc'), 'thư mục rejected -> failed-qc')
    ok(st('render/goodqc/clip_y.mp4')[0] == 'keep', 'qc đạt + có tham chiếu -> giữ')
    ok(st('render/orphan.mp4') == ('junk', 'unreferenced'), 'không ai tham chiếu -> unreferenced')
    ok(st('render/ref_ok.mp4')[0] == 'keep', 'được tham chiếu (grep) -> giữ')
    ok(st('anchor/mei_talk.mp4')[0] == 'protected' and st('anchor/kai_idle.mp4')[0] == 'protected', 'Mei/Kai được bảo vệ (kể cả rỗng)')
    ok(st('cafe/clips/other_bank.mp4')[0] == 'protected', 'thư mục bank được bảo vệ')
    ok(st('cine/x/tools/render5_shots/ask_r24_ots_ama_talk_12_48_r_a0.07.mp4')[0] == 'protected', 'cache render5_shots (tên = khoá băm) được bảo vệ, không phải unreferenced')
    ok(st('render/in_backup_manifest.mp4')[0] == 'protected', 'có trong archive-manifest -> bảo vệ')
    ok(sum(1 for p in E if p.startswith('render/seq_tmp/')) == 10 and st('render/seq_tmp/frame_0000.png') == ('junk', 'unreferenced'), 'chuỗi ảnh được quét (thư mục không tham chiếu -> unreferenced)')
    ok(all(e['status'] != 'junk' for e in E.values() if 'mei' in e['path'] or e['path'].startswith('cafe/clips')), 'không mục bảo vệ nào là rác')
    ok(m['summary']['broken']['count'] >= 1 and 'gb' in m['summary']['unreferenced'], 'tổng kết GB theo lý do')
    mp = os.path.join(tmp, 'm.json')
    json.dump(m, open(mp, 'w'))

    # quarantine: dry-run không đụng gì
    r = junk.quarantine(m, qd, apply=False, log=quiet)
    ok(r['moved'] > 0 and not os.path.exists(qd), 'quarantine dry-run mặc định: không di chuyển')
    # thử ép đưa mục bảo vệ vào manifest: phải bị từ chối
    forged = json.loads(json.dumps(m))
    for e in forged['entries']:
        if e['path'] in ('anchor/mei_talk.mp4', 'render/ref_ok.mp4'):
            e['status'], e['reason'] = 'junk', 'unreferenced'
    r = junk.quarantine(forged, qd, apply=True, log=quiet)
    ok(os.path.exists(lib + '/anchor/mei_talk.mp4'), 'manifest giả mạo: Mei vẫn không bị di chuyển (kiểm lại lúc cách ly)')
    junk.restore(qd, apply=True, log=quiet)
    shutil.rmtree(qd)
    r = junk.quarantine(m, qd, apply=True, log=quiet)
    ok(not os.path.exists(lib + '/render/orphan.mp4') and not os.path.exists(lib + '/render/zero.mp4') and not os.path.exists(lib + '/render/dup_b.mp4'), 'quarantine --apply chuyển rác ra khỏi thư viện')
    for keep in ('render/ref_ok.mp4', 'render/dup_a.mp4', 'anchor/mei_talk.mp4', 'anchor/kai_idle.mp4', 'cafe/clips/other_bank.mp4', 'render/in_backup_manifest.mp4', 'render/goodqc/clip_y.mp4'):
        ok(os.path.exists(os.path.join(lib, keep)), 'không bị chạm: ' + keep)
    day = datetime.date.today().isoformat()
    ok(os.path.isfile(qd + '/' + day + '/restore.json') and os.path.isfile(qd + '/' + day + '/render/orphan.mp4'), 'restore.json + giữ nguyên đường dẫn gốc')

    # purge: chặn < 7 ngày
    try:
        junk.purge(qd, 3, repo, [], apply=True, log=quiet)
        ok(False, 'purge --min-days 3 phải bị từ chối')
    except SystemExit:
        ok(True, 'purge từ chối --min-days < 7')
    e = junk.purge(qd, 7, repo, [], apply=True, log=quiet)
    ok(e['purged'] == [] and all(s['why'].startswith('too-young') for s in e['skipped']) and os.path.exists(qd + '/' + day + '/render/orphan.mp4'), 'purge từ chối file chưa đủ 7 ngày')

    # cho "già" 10 ngày
    rp = qd + '/' + day + '/restore.json'
    rj = json.load(open(rp))
    old = (datetime.datetime.utcnow() - datetime.timedelta(days=10)).strftime('%Y-%m-%dT%H:%M:%SZ')
    for x in rj['entries']:
        x['moved_at'] = old
    json.dump(rj, open(rp, 'w'))
    e = junk.purge(qd, 7, repo, [], apply=False, log=quiet)
    why = {s['rel']: s['why'] for s in e['skipped']}
    ok(why.get('render/orphan.mp4') == 'no-backup-record' and why.get('render/badqc/clip_x.mp4') == 'no-backup-record', 'không có bản sao lưu -> không xoá (unreferenced/failed-qc)')
    pu = {p['rel'] for p in e['purged']}
    ok(pu == {'render/zero.mp4', 'render/dup_b.mp4'}, 'broken (đã kiểm lại) + dup có bản giữ xác nhận được phép xoá, dry-run: ' + str(sorted(pu)))
    ok(os.path.exists(qd + '/' + day + '/render/zero.mp4'), 'purge dry-run không xoá')

    # có bản sao lưu -> xoá
    bk = os.path.join(tmp, 'backup.json')
    json.dump({'shas': [sha(orphan)]}, open(bk, 'w'))
    # tham chiếu mới xuất hiện sau khi cách ly -> chặn
    w(repo + '/docs/note.md', b'dung lai clip_x.mp4 nhe')
    e = junk.purge(qd, 7, repo, [bk], apply=True, log=quiet)
    why = {s['rel']: s['why'] for s in e['skipped']}
    ok(why.get('render/badqc/clip_x.mp4', '').startswith('referenced'), 'grep mới thấy tham chiếu -> giữ')
    ok(not os.path.exists(qd + '/' + day + '/render/orphan.mp4') and not os.path.exists(qd + '/' + day + '/render/zero.mp4') and not os.path.exists(qd + '/' + day + '/render/dup_b.mp4'), 'purge --apply xoá đúng các mục đủ điều kiện')
    ok(e['freed_bytes'] == len(orphan) + len(dup), 'purge-log ghi byte giải phóng (%d)' % e['freed_bytes'])
    ok(os.path.isfile(qd + '/purge-log.json') and os.path.exists(lib + '/render/dup_a.mp4'), 'purge-log.json có; bản giữ còn nguyên')

    # twin mất -> không xoá dup
    w(lib + '/render/dup_c.mp4', dup)
    w(lib + '/render/dup_d.mp4', dup)
    os.utime(lib + '/render/dup_c.mp4', (500, 500))
    m2 = junk.scan(lib, repo, probe=False, log=quiet)
    d2 = [x for x in m2['entries'] if x['reason'] == 'dup-sha']
    ok(d2 and d2[0]['keep'], 'quét lần 2 thấy dup mới')
    qd2 = os.path.join(tmp, 'quar2')
    junk.quarantine(m2, qd2, apply=True, log=quiet, reasons={'dup-sha'})
    os.remove(os.path.join(lib, d2[0]['keep']))   # bản giữ biến mất
    rp2 = qd2 + '/' + day + '/restore.json'
    rj = json.load(open(rp2))
    for x in rj['entries']:
        x['moved_at'] = old
    json.dump(rj, open(rp2, 'w'))
    e = junk.purge(qd2, 7, repo, [], apply=True, log=quiet)
    ok(e['purged'] == [] and any(s['why'] == 'twin-not-verified' for s in e['skipped']), 'mất bản giữ -> không xoá bản trùng')

    if shutil.which('ffprobe'):
        w(lib + '/garbage/trash.mp4', b'not a video at all' * 50)
        mg = junk.scan(lib, repo, probe=True, log=quiet)
        eg = {e['path']: e for e in mg['entries']}
        ok(eg['garbage/trash.mp4']['reason'] == 'broken', 'ffprobe: file không giải mã được = broken')

    # restore
    r = junk.restore(qd, apply=True, log=quiet)
    ok(os.path.exists(lib + '/render/badqc/clip_x.mp4'), 'restore trả file về đường dẫn gốc')

    # phân loại artifact (Node, thuần)
    if shutil.which('node'):
        js = """
import { classify, prefixOf, episodeOf } from %s;
const now = Date.parse('2026-11-05T00:00:00Z'), iso = d => new Date(now - d * 864e5).toISOString();
const A = (id, name, run, d, br = 'x') => ({ id, name, size_in_bytes: 100, expired: false, created_at: iso(d), workflow_run: { id: run, head_branch: br } });
const arts = [A(1, 'tv-bank-1', 10, 9, 'main'), A(2, 'tv-bank-2', 11, 9, 'main'), A(3, 'tv-ep1-111111', 12, 8), A(4, 'tv-ep1-222222', 13, 2), A(5, 'qa-bot', 14, 20), A(6, 'cine-x', 15, 5), A(7, 'tvo-oldep-333333', 16, 9), A(8, 'cine-y', 17, 0.1), A(9, 'tv-ep9', 11, 4),
  A(10, 'tv-t2_verbs_break-short-444444', 20, 6), A(11, 'tv-t4_verbs_break-short-555555', 21, 2), A(12, 'video-e2e-100', 22, 6), A(13, 'video-e2e-102', 23, 2),
  A(14, 'tv-ep5-666666', 24, 6, 'main'), A(15, 'tv-ep5-777777', 25, 2, 'pr-a')];
const j = classify(arts, { badRuns: new Map([[11, 'failure'], [15, 'cancelled']]), known: new Set(['ep1', 'ep9', 'ep5', 't2_verbs_break', 't4_verbs_break']), now });
const by = Object.fromEntries(j.map(x => [x.id, x.reason]));
console.log(JSON.stringify(by), prefixOf('tv-ep1-222222'), episodeOf('tvo-oldep-333333'));
""" % json.dumps('file://' + os.path.abspath(os.path.join(HERE, '..', 'video', 'junk-artifacts.mjs')))
        r = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, timeout=60)
        out = r.stdout.strip().split('\n')[-1] if r.stdout.strip() else r.stderr[-300:]
        try:
            by = json.loads(out.split(' ')[0])
        except ValueError:
            by = None
        ok(by is not None, 'junk-artifacts.mjs nạp được: ' + out[:80])
        if by is not None:
            ok(by.get('2') == 'failed-run', 'tv-bank-* của main nhưng lượt HỎNG vẫn là rác')
            ok(by.get('1') is None, 'tv-bank-* của lượt thành công trên main không bao giờ là rác')
            ok(by.get('3') == 'superseded', 'bản cũ cùng tiền tố có bản mới -> superseded')
            ok(by.get('4') is None, 'bản mới nhất được giữ')
            ok(by.get('5') is None, 'artifact không phải video không bị đụng')
            ok(by.get('6') == 'failed-run', 'lượt cancelled -> failed-run')
            ok(by.get('7') == 'gone-episode', 'tập không còn trong repo -> gone-episode')
            ok(by.get('8') is None, 'artifact trẻ (<24h) không bị đụng')
            ok(by.get('9') == 'failed-run', 'lượt hỏng -> failed-run')
            ok(by.get('10') is None, 'tv-t2_* không bị tv-t4_* "thay" (số giữa tên = bản mẫu khác)')
            ok(by.get('12') is None, 'video-e2e-100 không bị video-e2e-102 "thay" (bài khác)')
            ok(by.get('14') is None, 'bản của nhánh main không bị bản mới hơn của nhánh PR khác "thay"')
finally:
    shutil.rmtree(tmp, ignore_errors=True)

if bad:
    print('✗ video-junk: %d lỗi' % bad)
    sys.exit(1)
print('✓ video-junk xanh')
