# FinWise — TestFlight test plan (v1.0.1, build #21)

What to manually test on your phone to confirm the new features + changes from the 2026-06-20 work.
Each test: **what to do → what you should see.** ⭐ = highest priority (most likely to break / most important).

> **Before you start:** for the destructive tests (account deletion), use a **throwaway test account**, not your
> main one. Have a real email you can receive password-reset mail at. Make sure your iPhone has **Face ID or a
> passcode** set up (for the app-lock tests).

---

## 0. Does it even run? ⭐
- [ ] **App launches** — open FinWise from TestFlight. *Expect:* it opens to the login/auth screen, no crash.
  *(The first two builds failed to package; this confirms the fix.)*

## 1. Sign up + recovery code ⭐
- [ ] **Create a new account** (use a test email). *Expect:* after signing up, a **"Save your recovery code"** screen appears with a code like `K7Q2-9FBR-…` and the privacy message ("end-to-end encrypted… not even FinWise can read it").
- [ ] **You can't skip it** — the **Continue** button is disabled until you tick "I've saved it somewhere safe." *Expect:* must acknowledge to proceed.
- [ ] **Share / save** — tap "Share / save…". *Expect:* the iOS share sheet opens so you can save the code (Notes, etc.). **Save it — you'll need it in test 4.**
- [ ] Finish onboarding normally. *Expect:* lands on Home, no errors.

## 2. The encryption proof ⭐ (the whole point)
- [ ] Add some real-looking data (an account balance, income). Wait ~5 seconds (auto-sync).
- [ ] Open the **Firebase console → Firestore Database → `users` → your new account's document.** *Expect:*
  - a field **`appStateEnc`** that is a long block of **unreadable gibberish**, and
  - **no** readable `appState` with your numbers in plain text.
  *(If you can still read your balances there, tell me — the encryption isn't taking.)*

## 3. Log out and back in — data survives + decrypts ⭐
- [ ] Settings → **Sign out**, then **sign in** again with the same email/password. *Expect:* all your data is back exactly as you left it (the app decrypted it with your password).
- [ ] *(Optional, stronger:)* delete the app, reinstall from TestFlight, sign in. *Expect:* data still loads — proves the key rebuilds from your password on a fresh device.

## 4. Forgot password → restore with recovery code ⭐
- [ ] On the login screen tap **Forgot password** → enter the test email. *Expect:* a clear note that data is end-to-end encrypted and you'll use your recovery code after resetting.
- [ ] Open the reset email, set a **new password**.
- [ ] Sign in with the **new password**. *Expect:* a **"Restore your data"** box asks for your recovery code.
- [ ] Enter the recovery code from test 1. *Expect:* it unlocks and **all your data comes back**.
- [ ] Sign out and back in with the **new password** again. *Expect:* data loads normally — **no** recovery prompt this time (the new password is now the key).
- [ ] *(Edge:)* try the "I don't have it — start fresh" option on a different test account. *Expect:* it continues with an empty/fresh slate (old data stays locked).

## 5. Regenerate recovery code
- [ ] Settings → **Security → Recovery code → Generate**. *Expect:* a new code appears; confirm. The **old** code should no longer work if you later test a restore with it.

## 6. Biometric app lock ⭐
- [ ] Settings → **Security → App lock** toggle ON. *Expect:* a Face ID / passcode prompt appears to confirm; once approved, the toggle stays on.
- [ ] Send the app to the background for **2+ minutes**, then reopen. *Expect:* a **🔒 "FinWise is locked"** screen; tapping **Unlock** runs Face ID and lets you back in.
- [ ] Fully close and reopen the app with lock on. *Expect:* it asks to unlock on launch.
- [ ] Toggle App lock **OFF**. *Expect:* it asks for Face ID to confirm turning it off too.
- [ ] *(Safety check:)* you should never get permanently locked out — Unlock always retries.

## 7. Delete account ⭐ (use the throwaway account)
- [ ] Settings → Account → **Delete account** → confirm → enter your **password**. *Expect:* "Account deleted," you're signed out and returned to the login screen.
- [ ] Check **Firebase console** — the user's document under `users` is **gone**, and the login no longer works. *Expect:* fully removed (this is what Apple requires).

## 8. Net worth is consistent everywhere (B-49)
- [ ] Note the **net worth** shown in the **top bar chip**. Open the **Net Worth** tab and the **Home** "net worth" figure. *Expect:* all three match.
- [ ] **Add or edit an account**, then recheck the top bar, Net Worth tab, and the **Retirement** nest-egg number. *Expect:* they all update together to the same basis (no divergence).

## 9. "Savings rate" labels (B-52)
- [ ] On the **Net Worth / analytics** screen, find the **"Savings rate (of take-home)"** stat with its caption. *Expect:* it clearly says it's of take-home pay.
- [ ] On the **Insights** screen, the investing nudge should say **"investing about X% of your gross income."** *Expect:* two clearly different labels, no bare "savings rate."

## 10. AI tips fall back gracefully (no key shipped)
- [ ] Open the **Tips** screen and run the analysis. *Expect:* it shows **on-device tips** (or a friendly message) — **not** a crash and **not** an "API key" error. *(AI proxy isn't deployed yet, by design.)*

## 11. Login error messages (hardened auth)
- [ ] Try logging in with a **wrong password**. *Expect:* a generic "That email or password is incorrect" (doesn't reveal whether the email exists).
- [ ] Try **registering with an email that already exists.** *Expect:* "Account already exists" with a "Sign in" option.

## 12. Accessibility (optional, if you want to check)
- [ ] Turn on **VoiceOver** (Settings → Accessibility). Swipe through the **bottom tabs**, the **Menu** and **net-worth** chips at the top, and the **Add expense** button on Home. *Expect:* each is announced with a sensible name (e.g. "Money tab," "Net worth …, button").

---

### If something fails
Tell me **which test number**, what you did, and what you saw (a screenshot helps). The riskiest ones are
**#2, #3, #4 (encryption + recovery)** and **#6, #7 (app lock + deletion)** — those are brand-new plumbing, so
they're where to look hardest.
