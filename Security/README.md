# Security

Everything about how MoneyKeel protects credentials, tokens and user data.

| Document | What it covers |
|---|---|
| [security-posture-v1-2026-08-18.md](security-posture-v1-2026-08-18.md) | How broker tokens and secret keys are isolated: what the backend is, where each secret lives, what the phone can and cannot see — **and the one gap to close before Plaid** (§6). Every claim cites the file and line it was verified in. |

## The rules this folder exists to hold us to

1. **A secret never ships in the app binary.** Anything in `app.config.js` → `extra` is extractable
   from the installed app. Public identifiers only.
2. **A client credential never reads a broker token.** Server-side functions only, via the Admin SDK.
3. **Every claim in these documents cites the file and line it was checked in.** A security document
   written from intention is worse than none, because it gets believed.
4. **Gaps are named as gaps.** Section 6 of the posture document exists because "we do not do this
   yet" is information; silence is not.

## Before adding a new data provider

Work through §6 of the posture document. The pattern is the same for any provider: the short-lived
token may reach the phone, the exchange happens server-side, the long-lived token never leaves the
function layer and is encrypted at rest.
