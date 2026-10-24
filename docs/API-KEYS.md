# API key manager (Admin → Khóa API / API keys)

Lexkite keeps every provider key (Gemini, Groq, OpenRouter, Anthropic, OpenAI, Resend, Brevo, Cloudflare) in one encrypted pool. Server code picks keys from that pool and rotates them automatically. Admins manage the pool at `https://lexkite.com/admin.html#keys`.

| Piece | File |
|---|---|
| Shared pool, rotation, health checks, alerts | `functions/api/_keys.js` |
| Admin API `POST /api/keys` | `functions/api/keys.js` |
| Admin panel (lazy-loaded tab) | `web/js/admin-keys.js` (+ the `keys` view in `web/js/admin.js` and a tab button in `web/admin.html`) |
| Gemini + Workers AI wiring | `functions/api/ai.js` (`geminiCall`, `geminiKeys`, `waiRun`) |
| Tests | `scripts/test/keys.mjs` (`npm run test:keys`, part of `npm test`) |
| Infra registry | `infra/resources.json` → `api-keys` |

## 1. One-time setup

1. Generate a 32-byte encryption key on your own machine. Do not commit it or paste it into chat:
   ```sh
   openssl rand -base64 32
   ```
2. In Cloudflare, go to **Pages → lexkite → Settings → Variables and Secrets (Production)** and add the **secret** `KEYS_ENC_KEY` with that value. Add it to Preview too if you test there.
   - Without wrangler OAuth, use the API token flow: `printf '%s' "$KEY" | CLOUDFLARE_API_TOKEN=$(cat ~/.config/lexkite/cf-token) npx wrangler pages secret put KEYS_ENC_KEY --project-name lexkite`.
3. Redeploy Pages. The D1 tables are created automatically on first use.
4. Open **Admin → Khóa API**. Keys from the old Gemini list (D1 `config.gemini_keys`, set from the old Settings dialog) are imported automatically and encrypted. `GEMINI_KEY` and the Workers AI binding show up as read-only `env` rows.
5. Optional: set `REPORT_NOTIFY_EMAIL` to choose who receives alert emails. Alerts go out through the `MAIL` service binding (`lexkite-mail`).

> **Never lose `KEYS_ENC_KEY`.** If you change or lose it, every stored key becomes unreadable and is skipped (`last_err = decrypt`). Re-add the keys after you rotate it.

## 2. Storage

D1 database `lexkite-sync`:

- **`api_keys`** has these columns:
  - `id` (`k_<12 hex>` for stored keys, `env:<VAR>` for env rows)
  - `provider`, `label`
  - `enc_key` (`v1.<iv>.<ciphertext>`: AES-GCM with `KEYS_ENC_KEY`, AAD `apikey:<id>`)
  - `last4`
  - `status`: `live` / `dead` / `quota` / `disabled`
  - `weight` (0–1000; 0 means never picked)
  - `added_by`, `created`, `last_ok`
  - `last_err` (HTTP code + class only, never the provider message)
  - `err_count`, `uses_today`, `quota_day`, `cooldown_until`, `notes`
  - `source`: `db` / `env`
  - `ref` (the env var name)
  - `fp` (a SHA-256 fingerprint used for dedup; it is never sent to the browser)
  - `checked`
- **`api_key_events`**: one row per failed call (`kind`, `code`). It feeds the "errors / 24 h" counts. Rows older than 7 days are pruned lazily.
- **`key_alerts`**: the alerts that are currently open.
- **`key_audit`**: every `/api/keys` operation, including the email, op, ok flag and details (ids, last4 and counts only). Rows older than 180 days are pruned.
- **`config`** keys `keys:health` (time of the last full health check) and `keys:mail:<kind>` (anti-spam window).

### Read-only sources

These keys are listed in the panel but their values never come from the panel:

- **Cloudflare env variables:**
  - `GEMINI_KEY` → gemini
  - `GROQ_API_KEY` / `GROQ_KEY` → groq
  - `OPENROUTER_API_KEY` → openrouter
  - `ANTHROPIC_API_KEY` → anthropic
  - `OPENAI_API_KEY` → openai
  - `RESEND_API_KEY` → resend
  - `BREVO_API_KEY` → brevo
  - `CF_AI_TOKEN` → cloudflare-ai

  Each present variable gets an `env:<VAR>` status row, so its health and usage are tracked. You can disable an env row or change its weight. You cannot delete it. If the variable disappears from env, its row is removed.
- **Workers AI binding** (`env.AI`): shown as row `env:AI` (provider `cloudflare-ai`). It has no key. The row tracks health and neuron exhaustion.
- **Legacy Gemini list** (`config.gemini_keys` / `gemini_key`): when `KEYS_ENC_KEY` is set, these keys are imported once, encrypted. Without it they show as in-memory `legacy:` rows.
  - The plaintext legacy list is **left in place**, because `scripts/video/library.mjs` still reads it.
  - Deleting a key in the manager also removes it from the legacy list, so it is not imported again.
  - Keys added in the new manager are **not** visible to `library.mjs`.

## 3. Rotation and health (`_keys.js`)

- **`candidates(env, provider)` / `pick(env, provider)`**
  - Only keys that are `live`, not cooling down, and have weight above 0 are eligible.
  - Keys are ordered by **weight × free calls left today** (`cap − uses_today`).
  - Keys with equal scores take turns (round-robin).
  - Duplicate values (an env key that also exists as a stored key) are tried once.
- **`report(env, id, 'ok' | 'err', code, { text, retryAfter })`**
  - ok → `uses_today + 1`, `last_ok`, `err_count = 0`, status back to `live`.
  - 401/403, or Gemini `400 API_KEY_INVALID` → **dead**. A 403 about "location not supported" counts as transient instead.
  - 429 / 402 / `RESOURCE_EXHAUSTED` / Workers AI 4006 (neurons used up) → **quota**, with a cooldown:
    - daily quota: until the next reset (midnight Pacific for Gemini, midnight UTC for the others)
    - per-minute quota: `retryDelay` or `Retry-After`, at least 30 s
    - otherwise the provider default (Gemini 1 h)
  - Network error / 5xx → **transient**. After 3 in a row the key cools down for 15 min.
  - When a key becomes unusable and the provider has no usable key left, alerts are checked right away (at most once per 10 min per isolate).
- **Health check** (`healthCheck`) calls each provider's free endpoint, up to 4 keys at a time. A successful ping does not count toward `uses_today`, and it revives keys marked `dead`.

  | Provider | Endpoint |
  |---|---|
  | Gemini | `GET models/gemini-2.5-flash` (through the US-pinned `lexkite-gemini` Worker) |
  | Groq | `/openai/v1/models` |
  | OpenRouter | `/api/v1/key` |
  | Anthropic | `/v1/models` |
  | OpenAI | `/v1/models` |
  | Resend | `/domains` (a sending-only key's `restricted_api_key` reply counts as valid) |
  | Brevo | `/v3/account` |
  | Cloudflare | `/user/tokens/verify` |

  The check runs:
  - manually: the **Test now** / **Test all** buttons
  - lazily when the panel opens and the last check is older than 6 h (in `waitUntil`)
  - lazily from `/api/ai` traffic when the last check is older than 24 h (in `waitUntil`, at most once per hour per isolate)

### What changed in `ai.js` (same behaviour from the outside)

- `geminiKeys(env)` now returns the pool's Gemini keys that are not disabled or dead. The quota circuit breaker in `_quota.js` still scales the Gemini cap by this count, and still keeps each provider below 80 % of its free tier.
- `geminiCall` tries the candidates in pick order and reports each result. If every key fails it returns `null`, and `/api/ai` falls back to Workers AI exactly as before.
- Workers AI calls go through `waiRun`, which reports to `env:AI`. Once the 10k neurons are used up, the row cools down until midnight UTC. While it cools down, `/api/ai` answers with the same 503 the client already handles.
- The old Gemini dialog in Settings / Services (`geminiStatus` / `geminiSet` / `geminiRemove` in `functions/api/admin.js`) still works. Keys added there are imported into the pool within about 60 s.

## 4. Admin API (`POST /api/keys`)

All ops require `adminGate`: own origin, 120 requests/min per IP, and a Firebase ID token whose email is in `ADMIN_EMAILS`. Write ops are limited to 30/min per admin, and `test`/`health` to 6/min per admin.

| op | body | notes |
|---|---|---|
| `list` | `provider, status (live/dead/die/quota/disabled/env), q, sort (created/uses/last_ok/errors), dir, page, per` | rows plus `summary` (one card per provider), `alerts`, `threshold` (0.2) and `health` |
| `add` | `lines` (one key per line; `NAME=value` and quotes are accepted), `provider` (`auto` or an id), `label`, `weight`, `test` | at most 50 lines; encrypts and saves immediately, then tests; returns `added[{id, provider, last4, status}]` and `skipped[{line, reason: unknown/format/duplicate}]` |
| `set` | `ids[]`, `enabled`, `weight`, `label`, `notes` | bulk; labels and notes that look like keys are rejected |
| `delete` | `ids[]`, `confirm: 'DELETE'` | **signed in within the last 15 min** (otherwise `401 reauth`); env rows are skipped |
| `test` | `ids[]` (≤ 50) | pings now |
| `health` | – | tests every key that is not disabled, then refreshes alerts |
| `alerts` | – | evaluates alerts and sends mail |
| `export` | same filters as `list` | CSV with no key values (cells starting with `=+-@` are escaped against formula injection) |
| `audit` | `page` | `key_audit`, 50 rows per page |

Every op is written to `key_audit`, including denied ones (rate limit, reauth). Write ops are also written to `admin_log` as `keys.<op>`.

As a safety net, any response body that matches a key-like pattern (`AIza…`, `gsk_…`, `sk-…`, `re_…`, `xkeysib-…`) is replaced with `500 leak-guard`.

## 5. Alerts

- **crit** `nolive:<provider>`: the provider has enabled keys but none of them is usable.
- **warn** `cap:<provider>`: remaining free capacity today is below 20 %. Capacity is the free calls left on usable keys divided by the total cap of enabled keys. For providers with no known cap, it is usable keys divided by enabled keys.
- Alerts show as a banner in the panel. The panel has its own banner because the Drive banner lives inside `admin-drive.js`.
- Email goes through `lexkite-mail`, at most **one per alert kind per 24 h**. When a mailed alert clears, a "recovered" email is sent, under the same 24 h window.

## 6. Security checklist

- Admin-only (`adminGate`). Delete requires reauth plus a typed `DELETE`.
- Key values never leave the server after they are saved. Responses, CSV, logs, audit rows and emails carry `last4` only. `last_err` stores only the code and class.
- The paste box uses `autocomplete=off`, is masked (`-webkit-text-security`), and has password-manager opt-outs. It is cleared before the request is sent, and the response never echoes values.
- Every op is audit-logged and rate-limited. Request bodies are capped at 64 KB.

## 7. Tests

`node scripts/test/keys.mjs` runs offline, with D1 simulated by `node:sqlite` and fake providers. It covers:

- encryption round trip and AAD binding
- that no key leaks in any response, the audit log or emails, plus the leak guard
- pick and rotation, including ties, weight × remaining quota, cooldown on 429, dead on 401/400, 3 network strikes, and the `ai.js` failover
- provider auto-detect, with the server and client regexes kept in sync
- filters, sort and paging, including the URL-hash state
- that non-admins and foreign origins are rejected
- bulk enable, disable, weight, test and delete, including reauth and read-only env rows
- legacy import and removal
- the 20 % alert threshold and the 24 h mail anti-spam
- the rate limit on `test`

## 8. AI pool for background jobs (`scripts/lib/ai-pool.mjs`)

Every background AI job goes through one provider-agnostic client: `lexicon-expand`, `explain`, `script-bank`, the `vocab-img` naming judge, and (through `scripts/content-qa/lib.mjs` `agree`) the content-QA judge rule. Tests: `node scripts/test/ai-pool.mjs` (mocked providers, part of `npm test`).

**Routes, in default order**

| Route | What | Credentials | Budget (per run) |
|---|---|---|---|
| `lexai` | Gemini / Gemma from the Lexkite key pool (this page), via `/api/lexai` (GitHub OIDC). The server rotates keys and never marks a key dead for a per-model 429/503. | OIDC only | `--calls` of the job |
| `gc-cf` | GrabCast `/api/owner-ai/generate` `provider: cloudflare` (~70 Cloudflare keys, Llama 3.3 70B; the `model` field is ignored by GrabCast) | secret `GRABCAST_AI_KEY` | `AI_POOL_GC_MAX` (lexicon 300, explain 200, script-bank 60) |
| `cf2` | Workers AI on **account 2** (REST): `@cf/openai/gpt-oss-120b`, then Llama 3.3 70B | `CF_AI_TOKEN_2` + `CF_ACCOUNT_2` | neurons granted by the coordinator (`LEASE_AI_B_NEURONS` / `--neurons`; `infra/jobs.json` → `reservations.workers_ai_b.grants`) |
| `gc-gemini` | GrabCast `provider: gemini` | `GRABCAST_AI_KEY` | shared with `gc-cf` |
| `gc-groq` | GrabCast `provider: groq` (108 keys; returned `bad_request` on 24/10, so it is last) | `GRABCAST_AI_KEY` | shared with `gc-cf` |

The **main-account Workers AI is never reachable** from background jobs. `/api/lexai` strips `env.AI` (`stripBackgroundAI`) and no longer has any Workers AI fallback. `ai-pool.mjs` has no route to the main account, and the test fails if one appears.

**One prompt source.** `functions/api/lexai.js` `build()` makes `{ sys, user, temp }` for every mode. The Gemini route calls `/api/lexai` normally. Other routes fetch the same prompt with `{ …, prompt: true }`, which never calls a model, and then call their provider. `{ mode: 'ping' }` returns the number of usable Gemini keys without calling a model.

**Chains**

- Generation: `lexai → gc-cf → cf2 → gc-gemini → gc-groq`.
- Judge A: `lexai → gc-gemini → cf2 → gc-cf → gc-groq`.
- Judge B: `cf2 → gc-cf → lexai(gemma) → gc-groq → gc-gemini`. Judge B must come from a **different model family** than judge A's actual answering model.
- GrabCast silently falls back between its own providers, so the family is always checked on the model that **really** answered.

**Quality guard (`TASKS`, `TIERS`)**

- Tier L (generate + judge): Gemini 3.x flash/pro, gpt-oss-120b, Llama 3.3 70B, Qwen3 235B, Kimi K2.
- Tier M (judge only): flash-lite, Gemma 3 27B, gpt-oss-20b, Llama 4 Scout, Qwen3 32B.
- Tier S (forbidden): anything smaller, or any unknown model.
- Llama is additionally forbidden for generating `xgen` / `xtr` / `lxtr` / `translate`. It was measured on 22/10 writing 13/30 explanations wrong, and on 24/10 it left ja/th/hi/ar blank.
- `content-qa` `agree()` does not count a tier-S judge.

**Cooldowns** are per `(route, model)`:

- `PerDay` → until midnight Pacific
- 429 / `PerMinute` → 65 s
- a 403 for one model → 20 min for that model only
- 3 network/5xx errors → 15 min

Only route-wide failures rest the whole route: `keys=0`, GrabCast 401/403, account-2 `10000 Authentication error` or `4006` neurons. `health()` runs once at the start of each job. It pings `lexai`, makes one tiny call per GrabCast provider, and runs one tiny account-2 call.

**Neutral skip.** When no route (or no second family) answers, the pool returns `null`. Jobs then write nothing for those items. They do not go to the review queue, so they are not burned; the next run retries them. Content without two agreeing judges from different families never ships.

**Logs.** Every answer is logged as `[ai-pool] ✓ <mode> ← <route> <model>`. Per-route/model counts and budgets go to `reports/lexicon-expand.json` → `ai`, and to `reports/ai-pool-<job>.json`.

## 9. Capacity estimate (Admin → API keys → "🧮 Background AI capacity")

`scripts/ai-capacity.mjs` computes the queued workload from the repo and the measured free limits (`MEASURED`). It writes `web/data/ai-capacity.json`, which is refreshed by every `lexicon-expand` run. The admin card combines that file with the **live** Gemini key count of the pool. It shows live keys per route, estimated calls/day, and days to finish the queue. When 0 Gemini keys are live it says "cannot finish", because explanations and 13-language translations need Gemini or account-2 gpt-oss.

**Measured free limits (24/10)**

- Gemini 3.x flash: ~20 RPD per model per key. 4 flash models are rotated, so that is about 80 generation calls per key per day.
- flash-lite: ≥ 135 RPD per key (judging only).
- GrabCast CI key: 3,000 calls/day × 90 %, minus ~1,100 for vocab-img, leaves about 1,600 text calls/day.
- Account 2: 10,000 neurons/day, waiting for the Workers AI permission.
- Groq: 0 for now.

**Queued workload, in calls (24/10)**

| Work | Generation | of which Gemini/gpt-oss only | Judging |
|---|---|---|---|
| lexicon 12,000 words (10/call: lxgen + lxtr + 2 judges) | 2,400 | 1,200 (lxtr) | 2,400 |
| explanations, usage + grammar (1,732 questions × 15 langs) | 3,342 | 3,342 | 5,220 |
| script bank (21,323 scripts, 20/call) | 1,067 | 0 | 1,067 |
| vocab-img naming judge | – | – | ≈ 400/day (ongoing, set by drawing pace) |
| **Total** | **6,809** | **4,542** | **8,687** |

The task estimate of "~2.9k explanation calls" counted generation only. With two judges per batch, explanations need about 8.5k calls.

**Days to finish vs live Gemini keys.** Formula: `daysFor`. GrabCast and Llama take judging and lxgen/vgen; the Gemini-only work (lxtr, xgen, xtr) bounds the total.

| Gemini keys | 0 | 1 | 2 | 5 | 10 | 15 | 20 | 30 |
|---|---|---|---|---|---|---|---|---|
| days | ∞ | 56.8 | 28.4 | 11.4 | 5.7 | 3.8 | 2.8 | 1.9 |

**Recommendation: about 8–10 keys, each from its own Google Cloud project** (quota is per project, not per key). That gives about 6–7 days.

- Past ~10 keys, the jobs' own daily caps become the limit: lexicon `--calls 400` means ≥ 12 days for 4.8k calls, explain `--calls 400` per set, and script-bank `--calls 60`. Raise those caps together with the key count. Otherwise 20 keys do not finish faster than 10.
- With 0 keys, only lxgen, vgen and judging can run, on GrabCast Llama. Everything that needs a second family or Gemini-only generation is neutral-skipped until a key or account-2 gpt-oss is live.
