# Store assets v2 (Stitch v2 UI): which file goes into which slot

Built on CI by the **"Ảnh + video cửa hàng"** workflow (`.github/workflows/store-shots.yml`), which runs one pipeline for all three stores:

| Job | Script | What it makes |
|---|---|---|
| `cws` | `scripts/store-shots.mjs` | Shots of the real add-on |
| `app` | `scripts/play-shots.mjs` | Shots of the real web app from the same commit (the iOS and Android apps wrap it) |
| `video` | `MODE=app scripts/store-video.mjs` | Promo video, Kokoro voice of Ama |

All of them use the shared frame and copy in `scripts/lib/store-frame.mjs` + `scripts/lib/app-shots-copy.mjs`.

**Where the files are:**
- Run artifact **`lexkite-store-assets-v2`**.
- Orphan branch **`store-assets-v2`**, so tens of MB of PNG/MP4 stay out of main history, the same as `ios-shots`.

Get them with:

```bash
git fetch real store-assets-v2 && git worktree add --no-track /tmp/sa2 real/store-assets-v2
```

Every PNG is 24-bit RGB with no alpha, except the Play icon, which Play requires to be 32-bit. The scripts check sizes and colour type and fail the run on any mismatch. Locales: `en`, `vi` (others follow once copy exists in `app-shots-copy.mjs`).

## Screen order (same on every store and in every language)

| # | Screen | Headline (en) |
|---|---|---|
| 1 | `#/home` Today + daily path | Learn English a little every day |
| 2 | `#/lesson?demo=1` lesson | Short lessons that really stick |
| 3 | `#/vocab` Vocabulary | Words you will actually remember |
| 4 | `#/skills` Skills | Listening, speaking, reading & writing |
| 5 | `#/call` Call Ama & Carlos | Video calls with Ama & Carlos |
| 6 | `#/streak` (dark) | Keep your streak alive |
| 7 | `#/tests` (dark) | Practice tests with explanations |

## App Store Connect (iOS)

Screenshots and previews can only change on a **new version**: App Store → "+ Version" → Prepare for Submission. Locales: English (U.S.) = `en`, Vietnamese = `vi`.

| Slot (Media Manager) | Files |
|---|---|
| iPhone 6.9" Display | `appstore/<lang>/iphone-69-1..7.png` (1320×2868) |
| iPhone 6.5" Display | `appstore/<lang>/iphone-65-1..7.png` (1284×2778). Optional, because Apple scales 6.9" down; upload it so older phones get crisp shots |
| iPad 13" Display | `appstore/<lang>/ipad-13-1..7.png` (2064×2752). Required: the app targets iPhone + iPad (`TARGETED_DEVICE_FAMILY = 1,2`) |
| App Preview (6.9" and 6.5" iPhone) | `video/app-preview-886x1920.mp4` (886×1920, H.264, 30 fps, AAC stereo, 15–30 s). Poster frame: about 3 s, or `video/poster.png` |

## Google Play Console (Android)

Grow users → Store presence → Main store listing. Locales: en-US = `en`, vi-VN = `vi`. Changes go live after Play's review; no new build is needed.

| Slot | File |
|---|---|
| App icon | `play/icon-512.png` (512×512, 32-bit). This is the current icon; there is **no logo change** |
| Feature graphic | `play/<lang>/feature-1024x500.png` |
| Phone screenshots (2–8) | `play/<lang>/phone-1..7.png` (1080×1920) |
| 7" / 10" tablet screenshots (optional) | `appstore/<lang>/ipad-13-1..7.png`. Play accepts any 16:9–9:16 side ≤ 3840 px, and 2064×2752 fits |
| Video (YouTube URL) | Upload `video/promo-1080x1920.mp4` to YouTube as **Unlisted** in YouTube Studio, then paste the URL. The YouTube API is still in `manual` mode (`functions/api/youtube.js`), so the upload is manual |

## Chrome Web Store (add-on)

Developer Dashboard → item → Store listing. The Language dropdown takes `en` (default) and `vi`. Changes go live after CWS review.

| Slot | File |
|---|---|
| Screenshots (1–5) | `cws/<lang>/screenshot-1..5.png` (1280×800) |
| Small promo tile | `cws/promo-440x280.png` |
| Marquee promo tile | `cws/promo-1400x560.png` |
| Promo video (YouTube URL) | Same Unlisted YouTube URL as Play, or the existing add-on video (`store/chrome/YOUTUBE.md`) |

## Checklist before upload

- The run summary lists every file, with `cws=success app=success video=success`.
- Each image has been checked by eye in light and dark: no clipped text, no leaked icon names, contrast is fine. Results are in the PR description.
- iOS needs a new version anyway (1.0 → next). The coordinator submits through CI (`ios-shots.yml` `asc=upload` can push shots), and the owner presses Submit.
