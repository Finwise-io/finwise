# FinWise AI proxy (QA finding F-1)

Privileged provider keys (Anthropic, Google Vision) must never ship in the mobile bundle — anything
in `app.config.js` `extra` is extractable from the app binary. This Cloud Function holds the key
server-side; the app calls the function's URL (a non-secret) via `AI_PROXY_URL`.

## Deploy
```bash
cd functions && npm install
firebase functions:secrets:set ANTHROPIC_API_KEY   # paste your sk-ant-… key
firebase deploy --only functions
```
The deploy prints the function URL, e.g.
`https://us-central1-<project>.cloudfunctions.net/aiTips`.

## Wire the app
Set it in your build env (do **not** commit it):
```
AI_PROXY_URL=https://us-central1-<project>.cloudfunctions.net/aiTips
```
`src/services/economicData.ts → analyzeExpenses` reads `extra.AI_PROXY_URL` and POSTs
`{ expenses, monthlyIncome, inflationRate }`; the function returns the parsed `ExpenseAnalysis`.

## Contract
- **Request** `POST` JSON `{ expenses: {category,store,amount}[], monthlyIncome, inflationRate }`
- **200** → `{ summary, tips[], totalSavingsMin, totalSavingsMax }`
- **4xx/5xx** → app catches and shows on-device tips (graceful degradation).

> Requires the Firebase **Blaze** plan (Cloud Functions). Until deployed, AI Tips fall back to
> on-device suggestions — no key is ever bundled.
