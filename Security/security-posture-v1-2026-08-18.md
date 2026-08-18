# Security posture — how user credentials and broker tokens are protected

**Version 1 · 2026-08-18 · verified against the shipping code, not against intention.**

Every claim below names the file and line it was checked in. Where the answer is "not done", it says
so — a security document that only lists strengths is a marketing document.

---

## The question this answers

> Are we securely isolating user access tokens within an encrypted database vault, and never
> exposing item tokens or client secret keys to the front-end client?

Short answer: **the isolation is real and verified; the "encrypted vault" is partly true and the gap
is named in §6.** Nothing secret reaches the phone — that part is airtight and tested.

---

## 1 · What the backend actually is

| | |
|---|---|
| Runtime | **Firebase Cloud Functions v2, Node.js 20**, plain JavaScript |
| The broker relay | `functions/snaptrade.js` — the entire server-side surface |
| Database | Firestore |
| Identity | Firebase Auth |
| Client | React Native / Expo (TypeScript) — a pure *client* of the relay |

There is no separate server framework and no server we operate. Google runs the infrastructure; we
deploy functions to it. That is a deliberate reduction in attack surface: no OS to patch, no ports
to leave open, no long-lived process holding secrets in memory between requests.

---

## 2 · The three secrets, and where each lives

| Secret | Where it lives | Can the phone see it? |
|---|---|---|
| SnapTrade **client ID** + **consumer key** (our org credentials) | Firebase Secrets Manager, injected only into the deployed function | **No** — never in the repo, never in the bundle |
| Each user's **SnapTrade userSecret** (their broker token) | Firestore, `snaptrade_users/{uid}` | **No** — rule denies all client access |
| Firebase client config, Sentry DSN, relay URL | `app.config.js` `extra` block — ships in the binary | **Yes, by design** — these are public identifiers, not secrets |

**Proof the org keys are genuinely out of reach:** on 2026-08-17 an attempt to read them from this
machine was blocked by the permission layer. `scripts/snaptrade-purge.js` states the invariant in its
own header — *"needs the org keys, which stay in YOUR hands"*. The founder pastes them per run; they
are not stored locally.

---

## 3 · Client isolation — verified, not assumed

**`firestore.rules:65-67`**

```
match /snaptrade_users/{uid} {
  allow read, write: if false;
}
```

Total denial, for every client credential, including the owning user's own. Only the Cloud Function
reaches these records, through the Admin SDK, which bypasses rules because it runs server-side. The
comment above the rule states the invariant so it is explicit rather than implied by the default-deny.

**`functions/snaptrade.js:88-94`** — every call is authenticated before anything else happens:

```js
const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
uid = (await admin.auth().verifyIdToken(token)).uid;
```

The caller proves who they are with their own Firebase sign-in token. The function then looks up
**that uid's** secret and signs the broker request itself. The phone never holds, sees, or transmits
a broker token at any point in the flow.

**Connecting an account** sends the phone only a login URL that **expires in five minutes**
(`functions/snaptrade.js:14-15`) — never a token, and useless if intercepted after the window.

**The client bundle is clean — checked, not trusted.** `grep` across `src/` and `app.config.js` for
`CONSUMER_KEY`, `userSecret`, `client_secret`: no hits. The `extra` block carries only public config.

The rule was learned the hard way and is written into `app.config.js:134-136`:

> *privileged provider keys (Anthropic / Google Vision) must NEVER be bundled into the client —
> anything in `extra` ships in the app binary and is extractable.*

---

## 4 · On the device

App state persists as an **AES-256-encrypted blob**; the key lives in the iOS Keychain / Android
Keystore via `expo-secure-store` (`src/store/secureStorage.ts`). Biometric app-lock sits in front.

**Known limitation, documented in that file:** if the Keychain module is unavailable (a dev build
missing the native module), the key falls back to ordinary storage so the app keeps running. Correct
for development; worth knowing it exists. A rebuild upgrades it automatically.

---

## 5 · Other server-side protections

- **AI provider keys are server-side only** (F-1, QA 2026-06-18). The app calls a proxy that holds
  the key; only the proxy's non-secret URL is bundled.
- **Firestore privilege escalation fixed** 2026-06-17: a household self-claim path allowed a user to
  join another household. Closed, with emulator rules tests guarding it.
- **Plaintext password storage removed** (F-3).
- **Crash reporting** via Sentry — the DSN is a public ingest key, safe to bundle.

---

## 6 · THE GAP — read this one

**The user's broker token is stored in Firestore without application-level encryption.**

It is protected by Google's encryption at rest, the deny-all rule, and project IAM. That is real
protection against every ordinary attack. But the field itself is plaintext to anyone with
project-owner access or a database export.

Plaid's own checklist language — *"encrypted database vault"* — is normally read as **field-level
encryption on top of the platform's**, and we do not have that today.

**Why it matters now:** Plaid is the beta provider (pivot decided 2026-08-02). Its `access_token` is
long-lived and grants ongoing account access. It should not be the first thing we store under the
weaker arrangement.

### Recommended fix, before Plaid stores its first token

1. **Envelope-encrypt the token field** with Cloud KMS (or minimally an AES key held in Secrets
   Manager). Decrypt only inside the function, at call time.
2. **Never log a token** — audit the relay's error paths for accidental inclusion.
3. **Delete on disconnect** — verify the record is removed, not orphaned.
4. **Rotate on suspicion** — a documented path to invalidate and re-link.

Small change: one encrypt/decrypt helper in the relay plus a migration for existing records.

### Plaid maps onto the existing pattern one-to-one

| Plaid artifact | Where it must live |
|---|---|
| `link_token` (short-lived) | The phone — that is what it is for |
| `public_token` (one-time) | Exchanged **server-side** only |
| `access_token` (long-lived) | **Never leaves the function layer**, encrypted at rest |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Secrets Manager, injected into the function |

The relay already has the right shape. What it needs is the encryption layer in §6.

---

## 7 · Housekeeping

- `.env` on the founder's laptop holds an Anthropic key and a Google Vision key. **Neither is
  bundled** — verified: the Vision path reads from `extra`, where the key was deliberately never
  placed, so it falls back to manual entry. They belong in Functions secrets rather than on a laptop.
- **Institution download files never leave this machine** (standing order 2026-08-17). They live in
  `Calculation Module/real-downloads/`, which is gitignored; committed tests read them from disk and
  hard-code no value from them.

---

## Verification log

| Claim | Checked in |
|---|---|
| Clients cannot read broker secrets | `firestore.rules:65-67` |
| Every relay call is authenticated | `functions/snaptrade.js:88-94` |
| Connect link expires in 5 minutes | `functions/snaptrade.js:14-15` |
| No secret in the client bundle | `app.config.js:126-140`, grep over `src/` |
| Org keys are not retrievable from this machine | Permission-layer denial, 2026-08-17 |
| Device state is encrypted at rest | `src/store/secureStorage.ts:1-12`, `src/store/useStore.ts:1077` |
| Backend runtime | `functions/package.json` — Node 20, firebase-functions ^5 |
