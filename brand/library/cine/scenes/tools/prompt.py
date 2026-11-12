"""prompt.py <sit> <frame 1-5> – prompt for one dialogue-scene image (beats.json). f1 = from the two locked teacher refs; f2..f5 = edit of the approved f1 (same set)."""
import json, os, sys
B = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'beats.json')))
s, k = sys.argv[1], sys.argv[2]; S = B[s]
if k in ('p', 'v', 'pn', 'vn'):   # empty plates from the approved f1 (owner 12/11: modules, not finished shots) – p/pn 16:9, v/vn 9:16 · n = warm evening light
    light = 'warm golden evening light with soft lamp glow, the same place at dusk' if k.endswith('n') else 'the same daylight as 图片1'
    frame = ('the same wide framing as 图片1' if k[0] == 'p' else
             'a tall vertical 9:16 view of the same place, centred on its main counter/desk/feature, with open floor in the lower half where a standing person can be placed later')
    print(f"图片1 (image 1) is the approved first shot of this scene. Draw the SAME place with NOBODY in it: no people at all, the background, furniture and floor behind where they stood painted naturally; "
          f"same flat 2D vector art style with no black outlines, same colours, props and layout; {light}; {frame}. Eye-level camera. "
          "Absolutely no people, no hands, no animals, no text, letters, numbers or logos anywhere (blank signs and screens), no watermark.")
    sys.exit(0)
k = int(k); F = S['frames'][k - 1]
# 12/11: 'over-the-shoulder' made the model ADD a third person seen from behind (4/24 frames) or swap outfits → name who is seen from behind + hard head count
OTS = {'over-the-shoulder on Ama': 'medium shot from behind Ama: Ama is seen from behind / three-quarter back in the near foreground (her afro and coral blazer), Carlos faces the camera across from her',
       'over-the-shoulder on Carlos': 'medium two-shot from a different angle than image 1 (closer, slightly to the side), BOTH faces visible; Carlos keeps his full role outfit and stays on the staff side in the same posture (standing or seated) as in image 1'}
SHOT = OTS.get(F['shot'], F['shot'])
COUNT = ('EXACTLY TWO people in the whole image, Ama and Carlos, each appearing ONCE (count them: one woman in a coral blazer, one man in a cornflower-blue blazer); '
         'never a third person, never a duplicate of either, never swap their clothes or roles. Each keeps the SAME side and role as in image 1: Carlos (staff) stays on the staff side (behind the counter, desk, window or wheel exactly where he is in image 1) and Ama stays on the customer side; only the camera angle changes.') if 'close-up' not in F['shot'] else \
        'Only Ama\'s hand (coral sleeve, dark brown skin) and Carlos\'s hand (cornflower-blue sleeve, light brown skin) may appear; no other people.'
AMA = 'Ama (black afro hair, yellow headband, small gold earrings, coral blazer, cream top, grey trousers)'
CAR = 'Carlos (black curly hair, moustache and short beard, cornflower-blue blazer, white shirt, khaki trousers' + ('' if S['role_look'] in ('none', '') else ', ' + S['role_look']) + ')'
STYLE = ('Flat 2D vector cartoon illustration in exactly the art style of the reference characters: clean flat colour shapes, NO black outlines, soft simple shading, '
         'bright friendly palette (cream, mint, coral, teal, warm yellow). Same faces, hair, skin tones, proportions and outfits as the references.')
NEG = ('Absolutely no text anywhere: no letters, words, numbers, logos or labels on signs, menus, screens, papers, cups or badges (use blank surfaces or simple icons). '
       'Each hand has exactly five fingers, no extra arms, no other people, no watermark. Landscape 16:9 composition, both characters fully inside the frame with room around them.')
if k == 1:
    p = f"Image 1 is the woman {AMA}; image 2 is the man {CAR}. {STYLE} Scene: {S['set']} Shot: {SHOT}, eye level. {COUNT} {F['action']} Visible props: {', '.join(F['props'])}. {NEG}"
else:
    p = (f"Image 1 is the approved first shot of this scene. Keep the SAME place, furniture, colours, lighting and the SAME two characters ({AMA} and {CAR}) exactly as in image 1. "
         f"{STYLE} New camera shot of the same scene: {SHOT}. {COUNT} {F['action']} Visible props: {', '.join(F['props'])}. {NEG}")
print(p)
