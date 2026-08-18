# Calculation Module — engines

**Every calculation the app trusts lives here.** Founder order, 2026-08-18:

> *"Make sure you put all the code in calculation module code — so we know which code we are using,
> and if any link is using stale code not in the folder it will fail and we will know."*

## The rules

1. **Pure TypeScript.** No React, no React Native, no Expo, no store, no screens. An engine takes
   values and returns values. That is what lets the whole module run in plain Node and in a browser
   bench, outside the app.
2. **One concept, one engine.** If two places answer the same question, one of them is deleted —
   not kept "for now".
3. **A guard test fails the build** when app code still calls a superseded path instead of the
   engine here. Stale code does not sit quietly; it breaks the suite and names itself.
4. **Every engine is proved against a real institution file** where one exists, not against
   invented data.

## What is here

| Engine | Answers | Replaces |
|---|---|---|
| `events.ts` | What kind of event is this broker line? | the sign-guess in `snaptrade.ts` |
| `money.ts` | How much money moved, and which way? | `Math.abs` at import and in screen sums |

## Running them outside the app

    npx jest "Calculation Module code"
