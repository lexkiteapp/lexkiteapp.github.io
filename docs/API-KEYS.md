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
