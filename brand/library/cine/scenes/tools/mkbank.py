"""mkbank.py <sit> [<sit>...] – add/refresh approved scene sequences in ../bank.json from beats.json + content/situations (lines, tags, reuse)."""
import json, os, sys
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(H, '..', '..', '..', '..', '..')
B = json.load(open(os.path.join(H, '..', 'beats.json'))); P = os.path.join(H, '..', 'bank.json')
bank = json.load(open(P)) if os.path.exists(P) else {
    'scene': 'scenes', 'version': 1, 'created': '2026-11-12',
    '_note': 'Chuỗi ảnh cảnh hội thoại 2D (Kling image, không video) cho 20 tình huống content/situations: Ama = khách, Carlos = nhân viên (trang phục 3 khoá). '
             'Ảnh 16:9 2K ở lexkite-media cine/scenes/<sit>/<sit>_f<k>.png; mỗi khung gắn câu thoại (dialogue index) + tag để dùng lại ở bài tình huống, reels (pan/crop 9:16 0 cr), blog, podcast. '
             'reuse = chỗ dùng dự kiến; lần dùng thật cộng vào uses. Ledger: tools/ledger.txt.',
    'media': 'https://raw.githubusercontent.com/lexkiteapp/lexkite-media/main/cine/scenes/', 'situations': {}}
for s in sys.argv[1:]:
    S = B[s]; D = json.load(open(os.path.join(ROOT, 'content', 'situations', s + '.json')))
    bank['situations'][s] = {'set': S['set'], 'role_look': S['role_look'], 'tags': S['tags'], 'cefr': D['cefr'], 'group': D['group'],
        'frames': [{'id': f'{s}_f{i + 1}', 'src': f'{s}/{s}_f{i + 1}.png', 'shot': F['shot'], 'lines': F['lines'],
                    'say': [D['dialogue'][j]['en'] for j in F['lines']], 'props': F['props'], 'qc': 'eye ≥90, no text/outline, 5 fingers'}
                   for i, F in enumerate(S['frames'])],
        'reuse': {'lesson_situation': 1, 'speak_roleplay': 1, 'reels_est': 6, 'blog_est': 2, 'podcast_est': 1}, 'uses': 0}
json.dump(bank, open(P, 'w'), ensure_ascii=False, indent=1); open(P, 'a').write('\n')
print(len(bank['situations']), 'situations in bank')
