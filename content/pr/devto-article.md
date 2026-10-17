---
title: "Building a 15-language FSRS vocabulary app in vanilla JS (and exporting real Anki .apkg files in the browser)"
published: false
description: "FSRS-5 scheduling in ~20 lines, a hard 380 KB gzip budget for the app shell, a hand-rolled SQLite + ZIP writer for Anki decks, and one codebase that ships as a PWA and a Manifest V3 extension."
tags: javascript, webdev, pwa, learning
cover_image: https://lexkite.com/og-default.png
---

Lexkite is a vocabulary and exam-practice app for people preparing for IELTS, TOEIC and TOEFL. It runs as a website, an installable PWA and a Chrome extension, with a UI in 15 languages. There is no framework and no build-time bundler. The only `devDependencies` are `axe-core` and `jsdom`, and both are for tests.

This post covers the engineering choices I'd want to read about if someone else had built it: the spaced-repetition scheduler, keeping a 15-language app small, writing `.apkg` files without a SQLite library, and sharing one codebase between a PWA and an MV3 extension. It also covers one browser feature we removed.

## 1. FSRS-5 in about twenty lines

Flashcard reviews are scheduled with **FSRS-5** (Free Spaced Repetition Scheduler), the algorithm Anki also ships. Each card stores a **stability** `S` (in days) and a **difficulty** `D` (1–10). Recall probability decays along a power curve, and the next interval is the point where that curve hits the user's target retention.

Here's the core (from `web/js/core.js`, trimmed):

```js
const DECAY = -0.5, FACTOR = 19 / 81, MAX_IVL = 3650;
const F = {
  // probability of recall t days after the last review
  R: (t, S) => Math.pow(1 + FACTOR * t / S, DECAY),
  // invert R(t): days until recall falls to the target r
  ivl: (S, r) => S / FACTOR * (Math.pow(r, 1 / DECAY) - 1),
  // new stability after a successful review with grade G (2..4)
  recallS(D, S, R, G) {
    return S * (Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) *
      (Math.exp(W[10] * (1 - R)) - 1) *
      (G === 2 ? W[15] : 1) * (G === 4 ? W[16] : 1) + 1);
  },
};
```

`W` holds the 19 default FSRS-5 weights. The constants are chosen so that at a 0.9 target, `ivl(S, 0.9)` equals `S` exactly: "stability" means the number of days until recall drops to 90%. The target retention defaults to 0.9, and users can set it anywhere from 0.8 to 0.95.

The formula alone doesn't make a usable scheduler. These details mattered more than I expected:

- **Learning steps.** New and lapsed cards go through short steps (1 minute, then 10 minutes) before they get a day-based interval, so a word you just met comes back in the same session.
- **Monotonic buttons.** Rounding can make "Hard" and "Good" show the same interval, which confuses people. We clamp the results so Hard ≤ Good < Easy:

```js
out[2].ivl = Math.min(out[2].ivl, out[3].ivl);     // Hard ≤ Good
out[3].ivl = Math.max(out[3].ivl, out[2].ivl + 1); // Good < Easy
out[4].ivl = Math.max(out[4].ivl, out[3].ivl + 1);
```

- **Fuzz.** Intervals of 3 days or more get ±5% jitter so that cards learned together don't all come due on the same day. Due dates snap to 4 a.m. local time, the same day boundary Anki uses.
- **Migration.** The first version used SM-2. Old cards don't carry `S`/`D`, so on their first FSRS review we estimate them from the stored interval and ease factor instead of resetting anyone's progress.

## 2. 15 languages inside a 380 KB budget

The app shell (everything the service worker precaches so the first screen works) has a hard gzip budget. `scripts/test/size-budget.mjs` runs in `npm test`, reads the `SHELL` array straight out of `web/sw.js`, gzips every file and fails the build if the total goes over:

```js
const sw = fs.readFileSync('web/sw.js', 'utf8');
const shell = [...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1]
  .matchAll(/'([^']+)'/g)].map(m => m[1]);
let shellGz = 0;
for (const u of shell) shellGz += gz(path.join('web', u));
if (shellGz > budget.shellGz) errs.push(`App shell ${kb(shellGz)} gz > budget`);
```

The budget is 389,120 bytes (380 KB). As I write this, the shell is at 377 KB. The same script caps each lazily loaded data file at 160 KB gzipped, so a large dataset has to be split into chunks, and the total size of `web/js` is capped as well. Raising any limit needs a reason in the commit message.

A 380 KB shell holds less than you'd think. The English UI dictionary alone is about 100 KB gzipped, so it has to justify every byte. Two things keep it small:

**Route-level bundles.** Heavy features (grammar lessons, mock tests, listening sets, the Anki dialog) are lists of plain script files. A route declares which bundles it needs, and `App.need` loads them in parallel while keeping execution order:

```js
const loadOne = src => new Promise(res => {
  const s = document.createElement('script');
  s.src = src; s.async = false;            // parallel download, ordered execution
  s.onload = () => res(true); s.onerror = () => res(false);
  document.head.appendChild(s);
});
App.need = (...names) => Promise.all(names.map(n =>
  bundleP[n] || (bundleP[n] = Promise.all(BUNDLES[n].map(loadScript)))));
```

On a fast connection with enough memory, the remaining bundles are prefetched during idle time with `<link rel=prefetch>`. That puts them in the HTTP cache without executing them, so the first page doesn't stall. When `saveData` is on, the connection is 2G/3G, or the device has 2 GB of RAM or less, we skip the prefetch and load bundles on demand.

**Lazy i18n groups.** UI strings live in `web/js/i18n/en/<group>.js`, and `scripts/build-i18n.sh` concatenates them into one `en.js`, except for the groups marked lazy (currently the Anki and report dialogs). Those features load their own strings when they open.

The pipeline (`docs/I18N-PIPELINE.md`) is honest about who writes what. English is written by hand in the same commit as the feature. The other 13 locales are machine-translated from English in a GitHub Action. Short labels (three words or fewer: buttons, tabs, nav items) get hand-written translations that always override the machine output. CI then checks every locale for missing keys, broken `{placeholders}` and stray Vietnamese diacritics. The source keys are Vietnamese because the app started as a Vietnamese-only project, so leftover Vietnamese is the most likely leak.

The most useful rule in that document is easy to miss: **never call `t()` at module load time.** Language files load asynchronously, so a constant like `const LABELS = [t('Review')]` gets frozen in the fallback language. Use a function or a getter instead:

```js
const LABELS = () => [t('Ôn tập'), t('Từ mới')];      // evaluated at render time
const mode = { get name() { return t('Luyện nghe'); } };
```

`scripts/test/i18n-switch.mjs --scan` flags violations by file and line. A second pass drives the app in Vietnamese, switches to Spanish, Japanese and Arabic with the dictionary arriving late, and scans the DOM for leftover Vietnamese.

## 3. Writing real `.apkg` files in the browser

Users asked to take their words to Anki. A CSV export would have been easy, but it drops the review schedule. An `.apkg` file is a ZIP archive containing a SQLite database (`collection.anki2`). Shipping a SQLite build to the browser for one export button would have blown the budget. So `web/js/anki.js` writes both formats itself, with no WASM and no ZIP library.

**ZIP** is the easy half: a CRC32 table, a local header per file, a central directory, and an end record. Compression comes from the platform:

```js
let data = raw, method = 0;                       // 0 = stored
if (canDeflate && raw.length > 64) {
  const z = await pipeThrough(raw, new CompressionStream('deflate-raw'));
  if (z.length < raw.length) { data = z; method = 8; }  // 8 = deflate
}
const h = new DataView(new ArrayBuffer(30));
h.setUint32(0, 0x04034b50, true);                 // local file header signature
h.setUint16(8, method, true);
h.setUint32(14, crc32(raw), true);
h.setUint32(18, data.length, true); h.setUint32(22, raw.length, true);
```

**SQLite** is the interesting half. Writing a database is much simpler than running one: there are no updates, no free list and no journal. You only need the on-disk format. Each row becomes a *record* (a header of serial types plus a body), packed into *table B-tree leaf pages*. Interior pages are added when one leaf isn't enough, and long payloads spill into overflow pages. Varints are big-endian, 7 bits per byte:

```js
function putVarint(b, o, v) {                // v ≥ 0, < 2^56; returns bytes written
  if (v < 128) { b[o] = v; return 1; }
  const g7 = [];
  while (v > 0) { g7.push(v % 128); v = Math.floor(v / 128); }
  const n = g7.length;
  for (let i = 0; i < n; i++) b[o + i] = g7[n - 1 - i] | (i < n - 1 ? 0x80 : 0);
  return n;
}
```

(The arithmetic uses `Math.floor` instead of bit shifts because Anki IDs are millisecond timestamps, which don't fit in 32 bits.) Page 1 begins with the 100-byte header `"SQLite format 3\0"`, and the `sqlite_master` table lists the root page of each table.

To check the output, `scripts/test/anki.mjs` runs the real `sqlite3` CLI on the generated file (`pragma integrity_check` must return `ok`). It also exports 10,000 cards, re-imports them, and fails if either step takes longer than 6 seconds. A separate script, `scripts/test/anki-real-check.py`, opens the package with Anki's own Python library for a manual end-to-end check.

**Keeping progress.** If the user opts in, cards that already have a day-based schedule are exported as Anki review cards with a due date, an interval and an ease factor derived from the FSRS difficulty. The raw FSRS memory state goes into the card's `data` column, so Anki's FSRS can continue from it:

```js
const mem = JSON.stringify({ s: S, d: D, dr: retention });   // FSRS memory state
const ef  = 1.3 + (10 - D) / 5;                              // D=1 → ~3.1, D=10 → 1.3
return { type: 2, queue: 2, due: CRT_BACK + (dueDay - today), ivl,
         factor: Math.round(Math.min(3.1, Math.max(1.3, ef)) * 1000), data: mem };
```

Each note's GUID is derived from a hash of the word, so exporting the same words again updates the existing notes in Anki instead of creating duplicates.

**Reading Anki files** uses the same code in reverse, plus a random-access ZIP reader (`Blob.slice`, so a deck with hundreds of MB of media only reads the bytes it needs). Recent Anki versions write `collection.anki21b`, which is the same SQLite database compressed with Zstandard. For that one case we vendor `fzstd` (MIT, pure JS, about 8.5 KB). It's loaded only when an `.anki21b` file actually appears:

```js
const name = z.has('collection.anki21b') ? 'collection.anki21b'
  : z.has('collection.anki21') ? 'collection.anki21'
  : z.has('collection.anki2') ? 'collection.anki2' : null;
let raw = await z.get(name);
if (name === 'collection.anki21b') raw = (await loadZstd()).decompress(raw);
const db = sqliteOpen(raw);
```

Imported fields are HTML, and we never put them into `innerHTML`. They're converted to plain text, and any `<`/`>` left after conversion is replaced with a lookalike character, so even a template that forgets to escape can't render a tag.

## 4. One codebase: PWA and MV3 extension

The extension is the web app. `scripts/build-extension.sh` rsyncs `web/` into `extension/app/` and then applies the Chrome Web Store rule that matters most: **no remotely hosted code.** Code paths that load SDKs from a CDN on the web are already disabled when running inside the extension. The build also deletes those URLs from the copied files, then greps for any surviving remote `import()`, `.src =` or `importScripts()` and fails if it finds one. The same applies to inline scripts, which MV3's CSP forbids, so the build strips them from the extension's `index.html`. Data such as JSON, audio and images may still come from the network. Code may not.

On the web, `web/sw.js` uses three strategies:

- **Content-addressed audio and static assets:** cache-first. The file name never changes, so a cached copy is always correct.
- **Everything else from our origin:** network-first with a 2.5-second timeout that falls back to the cache, so a weak connection doesn't leave you staring at a spinner.
- **Navigation fallback only for navigations.** An earlier version returned the cached `index.html` for any slow request, including JS files. The result was a "MIME type text/html" error and a broken feature, so now HTML is never served in place of a script.

**Sync** is optional and cheap. Firebase handles sign-in and nothing else. The learning data lives in Cloudflare D1 behind a Pages Function (`functions/api/sync.js`). The client splits the card collection into shards (`meta`, `cards_0…n`) and hashes each one. A pull sends the hashes it already has, and the server returns only shards whose hash differs. A push uploads only changed shards. Conflicts resolve per card by most recent activity. The losing copy's saved example contexts are merged into the winner (up to five), so you don't lose a sentence you saved on your phone.

## 5. Lessons learned

**We removed View Transitions.** Same-document `document.startViewTransition()` made route changes look smooth until people pressed Back on long pages. Chrome captured the old page snapshot, our router scrolled to the top, and the result was misaligned, overlapping or blank regions during the transition. We'd already added guards for transitions the browser cancels (a fallback that always renders, plus a timeout). The commit that ended it replaced the whole block with a CSS fade on the content area, disabled under `prefers-reduced-motion`:

```css
#view { animation: viewIn .18s ease-out; }   /* opacity only: no transform, */
@keyframes viewIn { from { opacity: 0; } }   /* so fixed dialogs keep their containing block */
@media (prefers-reduced-motion: reduce) { #view { animation: none; } }
```

That's ten fewer lines, and Back navigation now renders cleanly. To keep it that way, we run a navigation test across Chromium, WebKit and Firefox, on desktop and mobile viewports, that checks for exactly this kind of mis-paint.

**Budgets beat good intentions.** Every "it's only 20 KB" made sense on its own, and the shell grew anyway. Once the size check failed the build, splitting data and lazy-loading strings became the default.

**Machine translation needs guardrails, not trust.** Ambiguous English source strings were the biggest source of bad translations. "Resume" came out as *CV*, and "Look up" came out as *look upward*. Writing unambiguous English and hand-translating short labels fixed more than switching translation engines would have.

**File formats are friendlier than they look.** The SQLite file format spec and the ZIP spec are both short and precise. A deliberately minimal, write-once implementation with a test that runs the real `sqlite3` was less work than integrating a general-purpose SQLite build, and it stays within the size budget.

---

If you want to try the review flow or the Anki export, the app is at [lexkite.com](https://lexkite.com/en/?utm_source=devto&utm_medium=referral&utm_campaign=launch). It's free and doesn't require an account. Questions about the FSRS code or the SQLite writer are welcome in the comments.

*IELTS, TOEIC and TOEFL are trademarks of their respective owners. Lexkite is an independent product and is not affiliated with or endorsed by them.*
