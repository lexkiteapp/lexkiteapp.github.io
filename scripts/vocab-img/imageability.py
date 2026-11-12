#!/usr/bin/env python3
"""imageability.py – chấm độ "vẽ được" (imageability) từng nghĩa từ#loại của kho từ vựng MỘT NGUỒN (dist/lexicon.json, sinh bởi build-lexicon --write).
Chỉ danh từ cụ thể, động từ nhìn thấy được, tính từ rõ ràng (màu/cỡ/hình/chất/thời tiết/cảm xúc lộ trên mặt) mới có ảnh; từ trừu tượng KHÔNG có ảnh
(thà không có còn hơn ảnh gây hiểu sai). Điểm 0..1 = WordNet lexname của synset khớp nghĩa (Lesk trên định nghĩa của kho) + đường hypernym
(physical_entity vs abstraction) + dấu hiệu trong định nghĩa/hậu tố. Ngưỡng THRESH. Không gọi mạng, không AI.
  NLTK_DATA=<dir có corpora/wordnet.zip> python3 scripts/vocab-img/imageability.py [--write] [--pilot 60]
Ghi content/lexicon/vimg-select.json (chỉ mục đạt ngưỡng + thống kê) và, với --pilot N, content/lexicon/vimg-pilot.json (N mục rải đều chủ đề/loại)."""
import json, re, sys, hashlib, os
from nltk.corpus import wordnet as wn

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
THRESH = 0.6
V = 1
NOUN = dict(animal=.9, food=.85, plant=.85, artifact=.75, body=.8, object=.75, person=.45, substance=.45, phenomenon=.45, location=.45,
            shape=.5, event=.3, act=.25, group=.25, possession=.2, communication=.15, quantity=.1, time=.1, attribute=.1, cognition=.05,
            feeling=.1, motive=.05, relation=.05, state=.1, process=.15, Tops=.1)
VERB = dict(motion=.5, contact=.5, body=.5, consumption=.5, weather=.5, creation=.4, competition=.35, perception=.3, change=.2,
            communication=.25, emotion=.2, possession=.2, social=.15, cognition=.05, stative=.05)
ADJ_VISIBLE = set('''red orange yellow green blue purple pink brown black white grey gray golden silver colourful colorful bright dark pale
big large huge enormous giant tiny small little tall short long wide narrow thick thin fat slim round square flat curly straight
wet dry hot cold icy frozen snowy rainy sunny cloudy windy foggy stormy empty full broken clean dirty messy tidy old new young elderly
happy sad angry scared frightened afraid surprised tired sleepy sick hungry bored crying smiling hairy bald heavy sharp blunt soft
smooth rough shiny striped spotted crowded asleep awake naked muddy rusty ripe rotten cracked bent fresh burnt sweaty
wooden metal plastic glass furry fluffy spiky hollow upside-down open closed lit'''.split())
ADJ_CUES = re.compile(r'\b(colou?r|shape|size|having (?:a|an|no|many|big|long|short)|covered (?:in|with)|made of|full of|wet|dry|tall|short|wide|thin|thick|round|flat)\b')
ABS_DEF = re.compile(r'^(?:the |an? )?(?:quality|state|condition|process|act|action|ability|idea|feeling|fact|way|degree|amount|level|extent|system|principle|theory|belief|relationship|situation|practice|method|period|concept|right|power|policy|rate|lack|sense|aim|purpose|result|effect|study|use)\b|\brelating to\b|\bconnected with\b|\bthe quality\b|\bthe state\b')
CONC_DEF = re.compile(r'\b(animal|bird|fish|insect|fruit|vegetable|plant|tree|flower|machine|device|tool|vehicle|furniture|building|container|clothing|garment|instrument|part of the body|room|piece of|made of|object|food|drink|dish|boat|ship|car|weapon|toy|shoe|hat|bag|box)\b')
ABS_SUF = re.compile(r'(tion|sion|ment|ness|ity|ism|ance|ence|ship|hood|acy|ology|dom|ics)$')
PERSON_VISIBLE = set('''child baby toddler kid boy girl man woman doctor nurse chef cook farmer pilot soldier police officer policeman firefighter waiter
waitress student pupil teacher athlete swimmer runner dancer singer musician artist painter photographer astronaut mechanic builder carpenter
plumber fisherman king queen clown guard passenger driver cyclist tourist baker butcher dentist surgeon pianist guitarist scientist patient
grandmother grandfather mother father twins bride groom referee goalkeeper sailor captain diver climber hiker skier surfer gardener cashier
lifeguard librarian vet veterinarian postman courier receptionist hairdresser barber tailor janitor cleaner miner porter bellboy'''.split())
VERB_VISIBLE = set('''run walk jump swim climb dance sing cry laugh smile eat drink cook bake fry boil wash clean sweep sleep sit stand kneel crawl
throw catch kick hit punch push pull carry lift drop pour cut chop slice dig paint draw write read type ride drive fly sail row skate ski surf
dive fall slip trip hug kiss wave clap shake nod bow yawn sneeze cough shout whisper knock fold wrap tie sew knit iron shave brush comb
plant water harvest fish hunt shoot bounce roll spin slide melt burn freeze spill splash drip float sink hang feed milk bite chew lick blow
build repair fix pack unpack load unload deliver queue hike jog stretch exercise lift wrestle box fence juggle hibernate sunbathe
chase grin crouch sip leap lean march haul drag rub punch kiss arrest'''.split())
POSMAP = {'n': 'n', 'v': 'v', 'adj': 'a'}
STOP = set('a an the of to in on for with by or and is are be as at that this from your you it its which who something someone used'.split())

def toks(s): return {t for t in re.findall(r'[a-z]+', s.lower()) if t not in STOP and len(t) > 2}

def best_synset(word, pos, d):
    ss = wn.synsets(word.replace(' ', '_'), POSMAP[pos])
    if pos == 'adj': ss += wn.synsets(word.replace(' ', '_'), 's')
    if not ss: return None, 0
    dt = toks(d); best, bo = ss[0], -1
    for i, s in enumerate(ss[:12]):
        sig = toks(s.definition() + ' ' + ' '.join(s.examples()) + ' ' + ' '.join(l.name().replace('_', ' ') for h in s.hypernyms() for l in h.lemmas()))
        o = len(dt & sig) - i * 0.15   # nghĩa thông dụng (đầu danh sách) thắng khi hoà
        if o > bo: best, bo = s, o
    return best, bo

def physical(s):
    try: return any(h.name() in ('physical_entity.n.01',) for p in s.hypernym_paths() for h in p)
    except Exception: return False

def score(k, e):
    w, pos, d = e['w'].strip(), e['pos'], (e.get('def') or '').lower()
    if pos not in POSMAP: return 0, 'pos', None
    if len(w.split()) > 2 or re.search(r"[^a-zA-Z' -]", w): return 0, 'multiword', None
    s, ov = best_synset(w, pos, d)
    lex = s.lexname().split('.')[1] if s else None
    if pos == 'n':
        sc = NOUN.get(lex, .3) if s else .3
        if lex == 'person' and w.lower() in PERSON_VISIBLE: sc += .3
        if s and physical(s): sc += .1
        elif s: sc -= .1
        if ABS_SUF.search(w.lower()) and not (s and physical(s)): sc -= .2
    elif pos == 'v':
        sc = VERB.get(lex, .2) if s else .2
        if re.search(r'\b(with your (?:hands?|feet|foot|mouth|body|teeth|arms?|legs?)|move|jump|throw|run|walk|climb|swim|cut|hit|kick|pour|wash|cook|eat|drink|dance|sing|fly|fall|push|pull|carry|lift|sleep|cry|laugh|smile|ride|drive|paint|draw|dig|catch|knock|kick|bend|stir|chop|slice|bake|fry|boil|sew|knit|wave|clap|hug|kiss|bite|chew|lick|blow|sneeze|yawn|shake|nod|bow|kneel|crawl|skate|ski|row|paddle|dive|hang|fold|wrap|tie|sweep|mop|iron|plant|water|feed|milk|harvest|sail|fish|hunt|shoot|bounce|roll|spin|slide|slip|trip|crash|melt|burn|freeze|pour|spill|splash|drip|float|sink|ring|knit|type|write|read|shave|brush|comb)\b', d) or w.lower() in VERB_VISIBLE: sc += .05
        if w.lower() in VERB_VISIBLE: sc += .15
        if len(w.split()) > 1: sc -= .2
    else:
        sc = .75 if w.lower() in ADJ_VISIBLE else (.4 if ADJ_CUES.search(d) else .1)
    if ABS_DEF.search(d): sc -= .25
    if pos == 'n' and CONC_DEF.search(d): sc += .1
    if not s and pos != 'adj': sc -= .1
    return round(max(0, min(1, sc)), 3), lex or '-', s.name() if s else None

def main():
    lex = json.load(open(os.path.join(ROOT, 'dist/lexicon.json')))
    items, by_pos, n_ok = {}, {}, 0
    for k, e in sorted(lex.items()):
        sc, lexn, syn = score(k, e)
        if sc >= THRESH:
            items[k] = [sc, lexn, syn, e['sets'][0]]; n_ok += 1; by_pos[e['pos']] = by_pos.get(e['pos'], 0) + 1
    out = dict(_note='Sinh bởi scripts/vocab-img/imageability.py – KHÔNG sửa tay. items: "từ#loại" → [điểm, lexname WordNet, synset, bộ đầu tiên]. Chỉ mục ≥ ngưỡng.',
               v=V, threshold=THRESH, total=len(lex), imageable=n_ok, by_pos=by_pos, items=items)
    if '--write' in sys.argv:
        json.dump(out, open(os.path.join(ROOT, 'content/lexicon/vimg-select.json'), 'w'), ensure_ascii=False, indent=0, sort_keys=False); open(os.path.join(ROOT, 'content/lexicon/vimg-select.json'), 'a').write('\n')
    if '--pilot' in sys.argv:
        n = int(sys.argv[sys.argv.index('--pilot') + 1])
        quota = dict(n=round(n * .6), v=round(n * .25)); quota['adj'] = n - quota['n'] - quota['v']
        hk = lambda k: hashlib.sha1(k.encode()).hexdigest()
        pick = []
        for pos, q in quota.items():
            pool = sorted([k for k, v in items.items() if lex[k]['pos'] == pos], key=hk)
            seen_set, seen_lex = {}, {}
            for k in pool:                      # rải đều: ≤ 2 mục/bộ, ≤ q/4 mục/lexname
                st = items[k][3].rstrip('0123456789'); lx = items[k][1]
                if seen_set.get(st, 0) >= 3 or seen_lex.get(lx, 0) >= max(3, q // 3): continue
                seen_set[st] = seen_set.get(st, 0) + 1; seen_lex[lx] = seen_lex.get(lx, 0) + 1; pick.append(k)
                if sum(1 for x in pick if lex[x]['pos'] == pos) >= q: break
            for k in pool:                      # bù đủ khi giới hạn rải đều làm thiếu
                if sum(1 for x in pick if lex[x]['pos'] == pos) >= q: break
                if k not in pick: pick.append(k)
        json.dump(dict(_note='60 nghĩa thử (pilot) – chọn tất định từ vimg-select.json', items=pick), open(os.path.join(ROOT, 'content/lexicon/vimg-pilot.json'), 'w'), ensure_ascii=False, indent=1)
        print('pilot', len(pick))
    print(f"imageable {n_ok}/{len(lex)} (≥{THRESH}) by_pos {by_pos}")

if __name__ == '__main__': main()
