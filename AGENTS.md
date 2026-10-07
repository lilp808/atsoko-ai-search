# AGENTS.md — ai-search-demo (folder-local rules)

This folder is a **Markdown-only spec** for the AI Search demo.
Its own rules win over WorkStation root rules while working inside this folder.

## 1. Scope

- Work ONLY inside `ai-search-demo/`. Do NOT edit `backend-api-vps/` or `dashboard-admin-panel/`.
- Source of truth for backend behavior: real code in `../backend-api-vps/routes/`.
  If this folder's Markdown disagrees with that code, the code wins — flag it and fix the Markdown.
- User-facing chat: Thai by default when the user writes Thai. Docs stay in English with Thai explanations where useful (portable across tools).

## 2. Bootstrap for every new chat in this folder

1. Read in order: `README.md` → `BACKEND-API-REFERENCE.md` → `AI-PROMPT-CONTRACT.md`
2. If the task touches filter semantics, open the cited lines in `../backend-api-vps/routes/properties.js` before answering.
3. Share a short plan, then implement.

## 3. Hard rules

- Never invent query params. Allowed list is in `BACKEND-API-REFERENCE.md §2.1` only. Post-process must strip any other keys (especially `remarks / landlord_name / landlord_contact` — guest gets 401, public demo must never emit them).
- `redirect_querystring`: build only from confident filters with `URLSearchParams` (skip `confidence/explanation_th`), must return `success:true` against `GET /api/properties`.
- Do not hardcode API keys (`OPENTYPHOON_API_KEY` comes from env).

## 4. Backend quirks agents get wrong (source: `../backend-api-vps/routes/properties.js`)

- Price field: `status` contains `sale` → filter/sort on `price_alternative`, else `price`; `price_mode=sqm` compares `(priceField / size)` and requires `size > 0`.
- `type=warehouse` matches `Warehouse OR Factory` — do not narrow it.
- Location (`province/district/sub_district`) is exact `LOWER(TRIM())` match: AI must emit English dropdown values (`GET /api/options/all`); uncertain Thai text goes to `keyword`, never guess.
- Property ID `AT[number][S|R|SR]`: full match (`/^AT\d+(R|S|SR)$/i`) → backend returns 1 row, frontend goes to detail page (`is_property_id_search=true`); bare `AT123` is prefix match.
- Guest (no token) sees only `publication_status='published'` with secrets stripped — verify demo queries with plain `curl` against `https://api.thaiindustrialproperty.com` (local: `http://127.0.0.1:3000`), no auth needed.

## 5. Typhoon contract (`AI-PROMPT-CONTRACT.md` wins for prompt text)

- OpenAI-compatible client: `baseURL https://api.opentyphoon.ai/v1`, model `typhoon-v2.5-30b-a3b-instruct`, JSON-only output, `JSON.parse` fail → fallback `{ keyword: userText }`.
