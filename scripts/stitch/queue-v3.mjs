// Sinh hàng việc Stitch v3 (scripts/stitch/batch.mjs) theo thứ tự ưu tiên:
//   (a) màn "hand" chưa có mẫu Stitch (docs/stitch-coverage.json) – di động sáng + tối, rồi bản máy tính;
//   (b) màn có lỗi thật do cổng new-ui-qa (PR #172, run 41393646513: 64 FAIL = 3 lỗi thiết kế) → bản vẽ lại sửa đúng lỗi;
//   (c) 3 phương án (generate_variants) cho màn yếu nhất: Hôm nay, Ôn, Luyện, câu hỏi bài học, trang Phương pháp học.
//   (d) bản tiếng Đức/Ả Rập (RTL) + trạng thái rỗng/lỗi/tải;
//   Dùng: node scripts/stitch/queue-v3.mjs > out/stitch/v3/queue.json
import fs from 'node:fs';
const RULES = `Lexkite – English learning app (IELTS · TOEIC · TOEFL · CEFR) shipped in 15 UI languages incl. German, Russian, Vietnamese, Arabic (RTL): design every label for +40% longer text, wrap instead of truncating, never shrink buttons. Use the project design system (Lexkite Kit / Tactile Gamified Prep): Plus Jakarta Sans, deep teal #0F3D3E brand, coral CTA with tactile bottom ledge, cream light background, rounded 16-24px cards. App shell: mobile bottom tab bar with exactly 5 tabs Today, Vocab, Skills, Tests, Me; desktop left sidebar with the same 5 items. No hearts or lives anywhere. No photos and no drawn people: where the teacher appears, leave an empty rounded placeholder labelled "teacher-slot" (the 2D teacher Ama or Carlos is inserted by code). Material Symbols Rounded icons. Every tap target at least 44x44 px, text contrast at least 4.5:1, icons at least 3:1. Realistic content, no lorem ipsum.`;
const DARK = `Convert this exact screen to the dark theme. Keep the identical layout, components and every text string. Page background #10191B, cards #172427, raised surfaces #1E2F33, primary text #E8F1F0, secondary text #A9BDBB, brand teal accents lightened for contrast; keep the coral CTA. Text contrast at least 4.5:1, icon contrast at least 3:1, no large light panels or white cards.`;
const A = {
  placement: 'Placement test: question 7 of 20 progress bar, CEFR level hint, one multiple-choice grammar question with 4 large answer cards, "I don\'t know" secondary button, Check CTA, teacher-slot small at top.',
  'hub-vocab': 'Vocab tab hub: search field, "Continue" card (deck name, 42/120 words, due today 18), daily goal ring, grid of 6 topic tiles with icons and word counts, "My decks" list with Anki import entry, "Word of the day".',
  'hub-skills': 'Skills tab hub: 4 large skill cards Listening, Reading, Writing, Speaking each with band estimate and progress bar, plus Pronunciation and Grammar rows, a "Recommended next" card with a 10-min task.',
  'hub-tests': 'Tests tab hub: exam picker chips IELTS / TOEIC / TOEFL / CEFR, readiness score card (band 6.5 target 7.0), full mock test card (2h 45m), quick test card (15 min), computer-based test practice row, past results list.',
  library: 'Library + topic page: topic header (Travel · 240 words · B1), filter chips (All, New, Learning, Mastered), list of word rows with part of speech, IPA, audio button and mastery dots, sticky "Study 20 words" CTA.',
  deck: 'My decks: list of personal decks with counts and due badges, "New deck" button, "Import from Anki (.apkg)" card, empty-state illustration area for no decks (icon only), deck card overflow menu.',
  dict: 'Dictionary: large search field with recent searches, then a word card bottom sheet for "resilient" – IPA UK/US with play buttons, part of speech tabs, CEFR badge, 2 definitions with translated meaning, 3 example sentences, collocations chips, "Add to deck" CTA.',
  mistakes: 'Mistake notebook: summary chips (Grammar 12, Vocabulary 8, Pronunciation 5), list of mistake cards showing wrong answer struck through and correct answer, rule tip, "Practise these 25" CTA, filter by date.',
  reading: 'Reading practice: passage card with title and estimated time, highlighted vocabulary, below question set (True/False/Not Given) with 3 questions, timer chip, Submit CTA; tab for passage/questions on mobile.',
  pron: 'Pronunciation: target sound /θ/ header with mouth diagram area, minimal pairs list (think/sink, three/free) with play and record buttons, last attempt score 82%, waveform strip, "Record" big round button 64px.',
  games: 'Vocabulary games: grid of game cards (Reflex, Speed type, Match pairs, Word builder) with best score and play button, today\'s challenge banner, XP earned this week, leaderboard teaser row.',
  stats: 'Statistics + badges: streak calendar heatmap, words learned chart (7 days bars), time studied, accuracy by skill bars, badges grid (8 badges, 3 locked), share progress button.',
  grammar: 'Grammar: units list grouped by CEFR level (A1-C1) with completion rings, current unit "Present perfect vs past simple" card with Learn and Practise buttons, quick reference table preview.',
  mock: 'IELTS full mock test intro: sections list Listening 30m, Reading 60m, Writing 60m, Speaking 14m with status, rules checklist, headphone check row, Start test CTA, Quick test 15 min alternative.',
  settings: 'Settings: groups Learning (daily goal, exam target, reminders time), Appearance (theme Light/Dark/System segmented control, text size), Language (app language with 15 options entry, native language), Audio (voice, speed), Privacy, About; toggles 44px.',
  account: 'Account & sync bottom sheet: avatar initials circle, email, sync status "Synced 2 min ago", devices list (phone, browser add-on), buttons Sign out and Delete account (danger, separated), backup/export data row.',
  report: 'Report a problem / feedback form: category chips (Bug, Wrong answer, Translation, Idea), text area, attach screenshot toggle, contact email field, Send CTA, privacy note.',
  'streak-modals': 'Streak modal dialog: "7-day streak!" milestone with flame icon and week dots, streak freeze status (1 freeze left), Continue CTA and Share secondary button; centered card over dimmed app.',
  'share-card': 'Shareable progress card 1080x1350 style shown in a share sheet preview: Lexkite logo text, "Band 6.5 → 7.0", 1,240 words learned, 32-day streak, QR-free clean layout, buttons Save image / Share.',
};
const X = {
  'ext-popup': 'Browser extension popup 360x560: Lexkite header with logo text, quick translate field, word of the day card, today\'s review count with Review CTA, toggles "Translate on hover" and "Writing check", footer links Open app / Settings.',
  'ext-newtab': 'Browser new tab page (desktop 1280): large greeting and clock, centered search, word of the day hero card with IPA and audio, review due card, daily goal ring, small quick links row; calm teal background.',
  'ext-word': 'Web page with Lexkite extension word popup (desktop): article text with the selected word "meticulous" highlighted, floating popup card with IPA, play audio, translation, short definition, Add to deck button, small floating action button bottom-right and a toast "Added to deck".',
  'ext-writecheck': 'Writing check overlay on a web text editor (desktop): email text with wavy underlines on 3 errors, suggestion card for one error showing original → correction, explanation, Accept / Ignore buttons, score chip "Clarity 78".',
  'email-digest': 'Weekly digest email 600px wide: header logo text, "Your week" stats row (words 84, minutes 126, streak 12), top mistakes list, next goal card, CTA button "Continue learning", footer unsubscribe; email-safe simple layout.',
};
const B = {
  'lesson-feedback': 'Lesson question screen in German UI after a correct answer: question area with prompt, audio Play and Slow buttons (44px) and a teacher-slot (96px) beside the prompt; feedback footer sheet "Richtig! +2 XP · Ama: Super!" with the long German explanation "Wir verwenden das Present Perfect, wenn…" and Weiter CTA. CRITICAL: the feedback footer must NEVER cover the Play/Slow buttons or the teacher-slot – the content area scrolls above the footer and reserves bottom padding equal to the footer height.',
  'lesson-map': 'Today lesson path map in Russian UI: vertical path of round lesson nodes (72px) with Material icons – done, current (pulsing ring), locked, special nodes "Работа над ошибками", "История", "Radio"; every node icon must have at least 3:1 contrast against the node fill, locked nodes still readable; labels under nodes wrap to 2 lines.',
  'story-quiz': 'Story quiz sentence builder: story panel at top, target sentence slots, then a word bank of tiles including very short words "I", "a", "Hi", "the" – every tile at least 44px wide and 44px tall (min-width 44px with padding), tiles wrap in rows with 8px gaps, Check CTA.',
};
const C = {
  home: 'Today tab (home): greeting with streak and daily goal ring, "Continue lesson" hero card, lesson path preview with 3 nodes, review due card (18 words), daily quests list (3), exam countdown chip.',
  review: 'Review tab / spaced repetition: due today 18 counter, card-stack preview of a flashcard (word, IPA, play), rating buttons Again / Hard / Good / Easy with next intervals, session progress, upcoming reviews 7-day bar chart.',
  practice: 'Practice hub: weak areas detected (3 cards with skill, accuracy, Practise button), mistakes to fix, mixed 10-min workout CTA, listening/speaking/writing quick drills grid.',
  'lesson-question': 'Lesson multiple-choice question: top progress bar with close button, prompt "Choose the correct word", sentence with gap, audio play/slow buttons, teacher-slot, 4 answer cards, Check CTA pinned at bottom.',
  method: 'Learning method page (info): hero "How Lexkite teaches" with 4 steps (Learn, Practise, Review with spaced repetition, Test), research-backed bullet cards, comparison of daily 15 min plan, FAQ accordion, CTA Start learning.',
};
const q = [];
const pair = (id, spec, device = 'MOBILE') => { q.push({ id, mode: 'light', kind: 'gen', device, prompt: `${RULES}\n\nScreen (${device === 'DESKTOP' ? 'desktop 1280px' : 'mobile 390px'}, light theme): ${spec}` });
  q.push({ id, mode: 'dark', kind: 'edit', device, from: `${id}/light`, prompt: DARK }); };
for (const [id, s] of Object.entries(A)) pair(id, s);
for (const [id, s] of Object.entries(X)) pair(id, s, id === 'ext-popup' ? 'MOBILE' : 'DESKTOP');
for (const [id, s] of Object.entries(B)) pair(id, s);
pair('lesson-feedback-desktop', B['lesson-feedback'], 'DESKTOP');
for (const [id, s] of Object.entries(C)) { pair(id, s, 'MOBILE');
  q.push({ id, mode: 'light', kind: 'variants', count: 3, from: `${id}/light`, prompt: `Three stronger alternatives of this screen that keep every element and rule: clearer hierarchy, one primary CTA, better spacing, long German labels still fit. ${RULES}` });
  for (let v = 1; v <= 3; v++) q.push({ id: `${id}-v${v}`, mode: 'dark', kind: 'edit', device: 'MOBILE', from: `${id}-v${v}/light`, prompt: DARK }); }
// Vòng 2 – bản máy tính (sidebar) cho các hub/màn (a)
for (const [id, s] of Object.entries(A)) pair(`${id}-desktop`, s, 'DESKTOP');
// Vòng 3 – 15 ngôn ngữ: bản tiếng Đức (chữ dài nhất) và tiếng Ả Rập (RTL) sửa từ chính màn sáng (giữ bố cục), rồi sang tối.
const LANG = { de: 'Translate every UI string to German (keep realistic, long German labels such as "Wiederholungen fällig", "Wortschatz-Übersicht"). Nothing may be truncated or overflow: wrap to two lines, grow buttons vertically, keep tap targets at least 44x44 px. Keep layout, colors and components.',
  ar: 'Translate every UI string to Arabic and mirror the whole layout right-to-left (dir="rtl"): tab bar order, icons with direction (arrows, chevrons, progress) flipped, text right-aligned, numbers stay Western. Keep colors, components and tap targets at least 44x44 px.' };
for (const id of [...Object.keys(C), ...Object.keys(A)]) for (const [lg, p] of Object.entries(LANG)) {
  q.push({ id: `${id}-${lg}`, mode: 'light', kind: 'edit', device: 'MOBILE', from: `${id}/light`, prompt: p });
  q.push({ id: `${id}-${lg}`, mode: 'dark', kind: 'edit', device: 'MOBILE', from: `${id}-${lg}/light`, prompt: DARK }); }
// Vòng 4 – trạng thái rỗng / lỗi mạng / đang tải (no-cuts: mọi state đều có mẫu)
const STATES = { empty: 'Show the EMPTY state of this screen for a brand-new learner (no data yet): friendly icon illustration (no people), one-line explanation, one primary CTA to get started; keep header and tab bar.',
  error: 'Show the OFFLINE / ERROR state of this screen: inline banner "You are offline – showing saved content", cached content dimmed where unavailable, Retry button 44px; keep header and tab bar.',
  loading: 'Show the LOADING state of this screen: skeleton placeholders with the same card shapes (no spinners in the middle of text), header and tab bar stay interactive.' };
for (const id of ['hub-vocab', 'hub-skills', 'hub-tests', 'library', 'deck', 'mistakes', 'stats', 'home', 'review', 'practice']) for (const [k, p] of Object.entries(STATES)) {
  q.push({ id: `${id}-${k}`, mode: 'light', kind: 'edit', device: 'MOBILE', from: `${id}/light`, prompt: p });
  q.push({ id: `${id}-${k}`, mode: 'dark', kind: 'edit', device: 'MOBILE', from: `${id}-${k}/light`, prompt: DARK }); }
fs.writeSync(1, JSON.stringify(q, null, 1));
