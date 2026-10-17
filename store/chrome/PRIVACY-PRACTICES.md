# Lexkite – Chrome Web Store "Privacy practices" tab

Matches the code of extension v2.6.351 (`extension/manifest.json`, `background.js`, `content.js`) and the policy at https://lexkite.com/privacy. Update this file whenever permissions or data flows change.

## Single purpose
```
Lexkite helps users learn English vocabulary while browsing: look up and translate words or text the user selects on any web page, save them with their context, and review them with spaced-repetition flashcards, reminders and a vocabulary card on the new tab page. An optional, off-by-default writing check explains the English mistakes in what the learner types and links each one to a grammar lesson and their mistake notebook.
```

## Permission justifications

**storage**
```
Stores the user's saved words, review schedule, progress and settings locally in the browser so the flashcards work offline and persist between sessions.
```

**alarms**
```
Schedules the daily study reminder chosen by the user and a 15-minute check that updates the badge with the number of cards due and detects words about to be forgotten.
```

**notifications**
```
Shows the daily study reminder and the optional "golden moment" review reminder. Both can be turned off and respect quiet hours set by the user.
```

**contextMenus**
```
Adds "Look up with Lexkite" and "Translate selection" to the right-click menu when the user has selected text.
```

**scripting**
```
After installation or an update, injects the extension's own bundled content script into tabs that were already open so word lookup works without reloading them. On youtube.com it reads the caption track list of the video being watched so the user can tap words in the subtitles. No remote code is executed.
```

**search**
```
The new tab page provided by the extension contains a search box; chrome.search.query sends the user's query to their default search engine instead of hard-coding a provider.
```

**Host permission (http://*/*, https://*/*)**
```
The core feature works on any web page the user reads: double-click a word or select text to see its meaning or translation, save it with the sentence it appears in, optionally highlight words the user has already learned, tap words in YouTube subtitles, and (only if the user turns on the off-by-default Writing check) underline English mistakes in the text box the user is typing in, with a one-tap fix and a short explanation. The same permission lets the background service worker call the dictionary and translation services listed in the privacy policy (Google Translate, Free Dictionary API, Wiktionary, Tatoeba, Datamuse, MyMemory, Openverse, LanguageTool only if the user enables Writing check's "Advanced check", lexkite.com/api/ai for the on-demand "Deep explanation" (free AI; Chrome's built-in on-device AI is used instead when it is already available), and the user's own Gemini key only if they add one) and lexkite.com for optional sync. Page content is processed locally; only the word or text the user chooses is sent to those services.
```

**New tab override (chrome_url_overrides)** – not a permission, but reviewers ask:
```
Shows one vocabulary flashcard from the user's own saved words each time a new tab opens, with a search box using the default search engine. It can be disabled from the card itself or from the extension settings.
```

## Remote code
- **Are you using remote code?** → **No, I am not using remote code.**
- Justification (if asked): all JavaScript is inside the package. The build (`scripts/build-extension.sh`) strips URLs of third-party script libraries from the bundled web-app code and fails if any remote script load remains. The extension only fetches JSON/text data (dictionary results, translations, subtitles).

## Data usage (checkboxes)

Tick these categories:

| Category | Tick? | What exactly |
|---|---|---|
| Personally identifiable information | **Yes** | Name and email of the user's Google account, received from lexkite.com only when the user chooses to sign in and sync; shown in the popup and used to sync learning data. |
| Health information | No | |
| Financial and payment information | No | |
| Authentication information | **Yes** | The user's own Gemini API key, if they add one; stored only on the device and sent only to Google's Gemini API. (Google sign-in itself happens on lexkite.com, not in the extension.) |
| Personal communications | **Yes** | Only when the user chooses "Report a problem" in the popup: the category and description they write, an optional screenshot they attach, and their email only if they ask for updates – sent to lexkite.com (/api/report) together with the extension version and the **domain** of the current tab (never the full URL or page content). |
| Location | No | The extension sends no location; IP addresses are not stored. |
| Web history | No | The extension does not record visited pages. It stores the title/URL of a page only when the user saves a word from that page (counted under "Website content"). |
| User activity | **Yes** | Daily anonymous usage counts (number of lookups, saves, popup and new-tab opens) with a random device identifier, plus install/update counts. No clicks, keystrokes or page data. |
| Website content | **Yes** | The word or text the user selects, the sentence around it, and the page title/URL of words the user saves. Sent to lookup/translation services to get a result, and to lexkite.com only if the user signs in to sync. **Deep explanation:** only when the user taps "🤖 Deep explanation", the selected English text and its sentence are sent to lexkite.com/api/ai (processed by Google Gemini or Cloudflare Workers AI) with a random device identifier for the daily free limit – unless Chrome's built-in AI already runs it on the device. **Writing check (off by default):** the text the user types in a text box is checked on the device; only if the user also enables "Advanced check" is that text sent to LanguageTool (api.languagetool.org, max 20 requests/min). Never password/email/number/payment-card fields, banking or payment sites, or sites the user turned off. Not sent to us. |

Certify all three statements:
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** `https://lexkite.com/privacy`

## Distribution
- Visibility: **Public**; regions: all; price: free (no in-app purchases).
- Contact email shown on the store: `support@lexkite.com` (forwarded to the owner's Gmail via Cloudflare Email Routing). The developer account email must be verified in the dashboard.

## Notes for the reviewer (optional "Test instructions" field)
```
No account is needed. Open any article, double-click an English word to see the lookup card, or select a sentence to translate it. Click the toolbar icon for the popup. Open a new tab to see the vocabulary card (can be turned off with "Turn off" at the bottom). Writing check is off by default: turn on "Writing check" in the popup, then type "She have a apple" in any text box (e.g. a comment box) and click the underlined word.
```
