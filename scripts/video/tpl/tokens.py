# Design tokens for the clean video templates (docs/VIDEO-TEMPLATES.md). ONE source of truth: render_tpl.py and qc_tpl.py import this file.
W, H, FPS = 1080, 1920, 30
SAFE = dict(x0=48, x1=924, y0=232, y1=1497)          # platform UI: top 12 %, bottom 22 %, right 14 % never hold text
COLS, GUT = 12, 24
COLW = (SAFE['x1'] - SAFE['x0'] - (COLS - 1) * GUT) / COLS   # 51 px
def col(i): return round(SAFE['x0'] + i * (COLW + GUT))          # left edge of column i (0..11)
def span(a, b): return round(col(b) + COLW) - col(a)             # width of columns a..b inclusive
BASE = 8                                                          # vertical rhythm: every y snaps to 8 px
def snap(y): return int(round(y / BASE) * BASE)

TYPE = dict(label=48, body=60, h2=76, h1=96, display=128)        # one scale (x1.25), nothing below 48 px
LEAD = 1.18                                                       # line height = size x LEAD
FONTS = dict(display='BricolageGrotesque-ExtraBold.ttf', head='BeVietnamPro-ExtraBold.ttf', body='BeVietnamPro-Bold.ttf')

# brand colours = web/js/kit.js (NAVY/NAVY2/RED/CREAM + the Kit accents); no other hues
C = dict(navy=(15, 61, 62), navy2=(23, 89, 90), red=(229, 80, 47), cream=(255, 247, 234), yellow=(255, 201, 74),
         green=(47, 191, 113), white=(255, 255, 255), mint=(220, 238, 232), ink=(15, 61, 62))

# motion: three durations, one easing family (quint cubic-beziers)
DUR = dict(fast=0.2, base=0.3, slow=0.5)
EASE = dict(out=(0.22, 1, 0.36, 1), inn=(0.64, 0, 0.78, 0), inout=(0.83, 0, 0.17, 1),
            spring=(0.34, 1.56, 0.64, 1))                         # spring = ONE overshoot then settle (card spring-in); qc no_jitter allows exactly one reversal for it
BOUNCE = 18                                                       # correct-answer bounce: a 18 px hop up and back over DUR.slow (one reversal)
TRAVEL = dict(rise=40, slide=120)                                 # entry travel in px (rise = from below, slide = from the right)
MIN_READ = 0.8                                                    # s a text block stays fully visible
MIN_PX = 48

def bezier(p, x):
    """CSS cubic-bezier(p) evaluated at progress x in [0,1] (Newton + bisection on the x curve)."""
    x1, y1, x2, y2 = p
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    cx, bx = 3 * x1, 3 * (x2 - x1) - 3 * x1; ax = 1 - cx - bx
    cy, by = 3 * y1, 3 * (y2 - y1) - 3 * y1; ay = 1 - cy - by
    fx = lambda t: ((ax * t + bx) * t + cx) * t
    t = x
    for _ in range(8):
        d = (3 * ax * t + 2 * bx) * t + cx
        if abs(d) < 1e-6: break
        t2 = t - (fx(t) - x) / d
        if not 0 <= t2 <= 1: break
        t = t2
    lo, hi = 0.0, 1.0
    for _ in range(30):
        if abs(fx(t) - x) < 1e-6: break
        if fx(t) < x: lo = t
        else: hi = t
        t = (lo + hi) / 2
    return ((ay * t + by) * t + cy) * t

# ---- template 1b "Teacher on location" (docs/VIDEO-TEMPLATES.md §8): topic plate instead of the studio gradient
# Plates = anchor/bg/<name>.png (lexkite-footage, 1536x2720 flat2d-warm). Only plates a human checked for "no people, no readable text"
# are listed; tags = the lesson topics/areas a plate may illustrate (qc_tpl.py plate_topic gate).
PLATES = dict(
    airport_gate=dict(tags=['travel', 'airport', 'flight', 'boarding'], series='AIRPORT ENGLISH', people=0, text=0, checked='2026-10-24', horizon=1590, ref=('seat back', 1700, 2050, 0.85)),
    airport_gate_night=dict(tags=['travel', 'airport', 'flight'], series='AIRPORT ENGLISH', people=0, text=0, checked='2026-10-24', horizon=1630, ref=('bench', 1620, 2000, 0.85)),
    hotel_lobby=dict(tags=['travel', 'hotel', 'check-in'], series='HOTEL ENGLISH', people=0, text=0, checked='2026-10-24', horizon=1640, ref=('door', 1370, 1760, 2.1)),
    restaurant_night=dict(tags=['food', 'restaurant', 'ordering', 'dinner'], series='RESTAURANT ENGLISH', people=0, text=0, checked='2026-10-24', horizon=1480, ref=('chair', 1560, 2000, 0.95)),
    restaurant_day=dict(tags=['food', 'restaurant', 'ordering'], series='RESTAURANT ENGLISH', people=0, text=0, checked='2026-10-24', horizon=1560, ref=('booth back', 1440, 2010, 1.2)),
    coffee_shop_day=dict(tags=['food', 'social', 'coffee', 'cafe', 'ordering'], series='CAFE ENGLISH', people=0, text=0, checked='2026-10-24', horizon=1650, ref=('table', 1640, 2000, 0.75)),
    # 24/10 batch pipeline: plates checked on a contact sheet (no people, no readable text; bank/clinic/city_street_day REJECTED: wall signs);
    # 'vision' = checked by the pipeline agent, owner confirms on the first batch sheet (docs/VIDEO-TEMPLATES.md §9)
    office_open_plan=dict(tags=['work', 'tech', 'office'], series='OFFICE ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1500, ref=('desk', 1780, 2120, 0.75)),
    meeting_room=dict(tags=['work', 'meeting', 'office'], series='MEETING ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1560, ref=('chair', 1640, 1880, 1.0)),
    coworking=dict(tags=['work', 'tech', 'office'], series='OFFICE ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1500, ref=('chair', 1830, 2060, 0.9)),
    exam_hall=dict(tags=['exam', 'study', 'exams'], series='EXAM ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1480, ref=('desk', 1620, 1980, 0.75)),
    library=dict(tags=['study', 'exam', 'library'], series='LIBRARY ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1880, ref=('reading table', 1950, 2150, 0.75)),
    clothing_store=dict(tags=['shopping', 'store'], series='STORE ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1640, ref=('fitting-room door', 1320, 1720, 2.0)),
    supermarket=dict(tags=['shopping', 'food', 'store'], series='STORE ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1560, ref=('cart', 1570, 1680, 1.0)),
    pharmacy=dict(tags=['health', 'pharmacy'], series='PHARMACY ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1560, ref=('counter', 1550, 1790, 1.0)),
    living_room=dict(tags=['home', 'daily', 'social'], series='HOME ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1640, ref=('sofa', 1570, 1700, 0.9)),
    kitchen=dict(tags=['home', 'daily', 'food', 'kitchen'], series='KITCHEN ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1540, ref=('counter', 1560, 1820, 0.9)),
    park=dict(tags=['social', 'daily', 'park'], series='PARK ENGLISH', people=0, text=0, checked='2026-10-24 vision', horizon=1580, ref=('bench', 1660, 1740, 0.85)),
)
# hosts with a PRO matte + mouth meta in the footage bank; voice = Kokoro voice used for EVERY line of that host's video
HOSTS = dict(ama=dict(voice='af_bella', eye=0.60), carlos=dict(voice='am_fenrir', eye=0.57), mia=dict(voice='af_heart', eye=0.52), jake=dict(voice='am_michael', eye=0.55))
# eye = eye row as a fraction hair-top -> neck on the matte (measured on frame 0 of the talk clips, 25/10). Real shoulder width for the size check:
SHOULDER_M, EYE_M = 0.42, 1.55
SWAY = dict(deg=0.35, period=6.0, pivot_y=2600)   # host idle sway: rotation about a pivot under the frame (hips), whole periods per video (loop), Lanczos warp
PLATE = dict(blur=3.5, push=0.035, max_push_per_s=0.0025, sat=1.0, lift=0.03, host_match=0.35, stage_luma=226, scrim_rest=0.0, max_zoom=1.36)
# v4 (owner 25/10 'lighter wash'): NO full-width cream scrim any more – the plate stays vivid (less depth blur, full saturation, 3 % cream lift) and a soft
# cream PANEL sits only behind the text cards of the current beat (feathered rounded rect, morphs between beats). panel alpha adapts per beat so the luma
# UNDER the type stays >= stage_luma (qc plate_contrast measures it under every beat's panel). scrim_rest = panel alpha with no text (frame 0 + loop end).
# Plate placement (owner 25/10 'physically plausible'): the plate is zoomed (<= max_zoom, never past the source resolution) and shifted so its horizon
# (PLATES.horizon, eye-level line) lands on the host's eye line; the push-in is centred on that point. qc host_perspective checks it + the host size
# against the plate's reference object (PLATES.ref: px top/bottom in the 1536x2720 plate + real height in m; measured by eye 25/10, owner to confirm).
PANEL = dict(alpha=0.86, max_alpha=0.95, pad=36, radius=44, feather=22)   # scrim_rest = scrim alpha with no text on screen (frame 0 + loop end: clean plate); depth blur px, total push-in, cream scrim alpha/extent, saturation, host colour-match strength

# ---- ONE framing standard for every host (owner 24/10, 2nd round: head-pixel height was the wrong metric – Carlos (realistic proportions) came out
# waist-cropped with wide shoulders, Ama/Mia (big-head style) small). Measured on the MATTE by hostframe.py, then re-measured on screen:
#   shoulder = shoulder-corner silhouette width (px) – the size the eye compares; fit = how far the solver may move it to bring the crop line closer
#   top = hair top y (same for everyone) · cx = body centre x (shoulder midpoint, not the mouth) · crop = target y of the rest-pose fingertips
#   crop class 'mid-thigh': (1920 - fingertips) / shoulder in [crop_min, crop_max] = hands fully visible, frame cuts the thigh above the knee.
#   Tightly framed sources (Carlos gc4 ends at the upper thigh) get their legs continued by edge rows: <= max_ext px on screen, logged.
# qc_tpl host_frame_std = this check per video; batch gate (batch_report / rubric_tpl --batch): shoulder widths within +-shoulder_tol of the batch
# median, head tops within px_tol, crop class for every host. Proportions differ (Carlos ~2.6 shoulder widths hair->fingertips, Ama ~3.2), so with
# equal shoulders the crop line cannot also be pixel-identical: crop_spread (in shoulder widths) is the honest cap on that difference.
# v4 (owner 25/10): WAIST-UP medium shot, host ~47 % of the frame height (top 1024 -> frame bottom). crop = target screen y of the WAIST
# (waist = halfway shoulder corner -> rest-pose fingertips on the matte); crop class 'waist-up': (1920 - waist) / shoulder in [crop_min, crop_max]
# (frame bottom between just above the waist and the hip). Scale stays <= 1.0: every host is a native DOWNscale of the 1080x1916 matte (no upscale blur).
HOST_LOCK = dict(shoulder=392, fit=0.03, shoulder_tol=0.05, top=1024, cx=540, crop=1861, crop_min=-0.35, crop_max=0.6, crop_spread=0.6,
                 px_tol=4, max_ext=120, max_scale=1.0)
CAPTION = dict(size=76, y=928, max_words=4, stroke=6, pill=(255, 201, 74), sync_ms=80)   # word-level karaoke band between the cards and the host's head
VIDEO = dict(min_mbps=8.0, min_s=25, max_s=40, max_mb=60, target_kbps=8600)              # samples: >= 8 Mbps 1080x1920 (owner 25/10)
SHARP = dict(min_ratio=0.80)                                                              # host-region Laplacian variance, encoded / rendered frame
# hosts used by the batch pipeline (one natural-talk clip each; PRO matte + mouth meta in the footage bank)
HOST_CLIPS = dict(ama='ga4_talk_natural', carlos='gc4_talk_natural', mia='gm1_talk_natural')
# hook truth (docs/VIDEO-TEMPLATES.md §9): "Stop/Never saying" only when the Groq judge says the learner line is a real error
HOOKS = dict(strong=[('Stop saying this.', 'Stop saying'), ('Never say this.', 'Never say'), ('Natives never say this.', 'Natives never say')],
             soft=[('Americans usually say this.', 'Americans usually say'), ('Sound more natural.', 'Sound more natural:')])
RUBRIC_MIN = 90
