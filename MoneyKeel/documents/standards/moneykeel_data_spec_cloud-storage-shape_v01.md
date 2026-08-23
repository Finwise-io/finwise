# Cloud storage — the shape history has to live in before desktop

For approval. Written 2026-08-22, prompted by the founder: desktop ships within a month of the app,
and cloud storage is critical.

**In two sentences:** three histories the app depends on never leave the phone, so the same person
opening the same account on desktop would see different numbers with no warning. They cannot simply
be added to what is synced today, because everything shares one document with a hard one-megabyte
ceiling.

## What is true today, read from the code

**Synced** — the whole app state as a single encrypted field on one document per person
(`users/{uid}.appStateEnc`), rewritten in full two seconds after any change: accounts and balances,
holdings with their lots and purchase prices, month-end net worth points, daily net worth points,
the profile, the plan settings, goals, budget, big costs.

**Never leaves the device** — three histories, each read by the app, none in the synced field list:

| What | Field | What depends on it |
|---|---|---|
| The daily record — every account and every holding each day, units and price kept apart | `snapshotDays` | Beginning values · change in account value · the performance walk |
| The daily cash-and-investments baseline | `invDaily` | The "Return on cash + investments" line on Net worth |
| The transaction ledger — every buy, sell, contribution, withdrawal, dividend and interest line | `transactions` | Contributions · withdrawals · income · realised gain · the change walk. Read in 32 places. |

**What that means for desktop as it stands.** Balances, holdings and the net-worth trend arrive.
The performance walk, dividends, interest, realised gains and every beginning value do not. Two
devices, two sets of numbers, no warning on either.

## Why they cannot go into what is synced today

Firestore caps one document at one megabyte, and the entire app state is one document. The daily
record runs about 5.7 kilobytes a day once encrypted, so the ceiling arrives in roughly six months —
and the sync swallows its failures, so it would arrive silently.

## The proposed shape

Everything stays encrypted on the device before it is sent. Nothing becomes readable by the server.

| What | Where it lives | Size | Why this shape |
|---|---|---|---|
| Settings, profile, accounts, holdings, plan | `users/{uid}` — the state document, as now | 200–400 KB | Small, read on every open |
| The daily record | `users/{uid}/days/{YYYY-MM}` — one document per **month**, holding that month's days | ~170 KB a month | Far inside the ceiling; a device fetches only the months it needs |
| The daily cash-and-investments baseline | inside the same monthly day document | negligible | It is a daily point like the others |
| The transaction ledger | `users/{uid}/ledger/{YYYY-MM}` — one document per month | 8–100 KB a month | Same reason; a quiet month costs almost nothing |

**Two years of daily records is 24 documents.** The retention rule already in the code stands: two
years of days, month-ends kept beyond that.

## How two devices stay honest

**A month document is never replaced wholesale.** Days are held as fields keyed by their date, and a
write touches only its own day. A desktop write can therefore never wipe a day the phone recorded.

**The daily record supersedes by day.** A day already present is replaced by the later reading of
that same day — the rule the record engine already applies.

**The ledger merges by identity, not by order.** Every imported line already carries the frozen
import key built in Track 1: the same line imported on the phone and on the desktop is one line,
byte for byte. Merging is therefore safe by construction, and importing the same file twice on two
devices adds nothing the second time.

## Moving what already exists

On the first run of the updated app, the device holding the history uploads it month by month,
**newest month first**, so the app is usable while the rest catches up. The upload is safe to repeat:
the same day key and the same import key land in the same place.

A person who has never had the history — a fresh install, or the desktop first — starts with what is
in the cloud, and gains history as the device that holds it comes online once.

## Failures must be visible

Sync failures are swallowed today. With one device that is a nuisance; with two it is quiet
divergence, which is the wrong number in a finance app wearing a disguise. Required with this
change:

- A failed write is retried, and if it keeps failing the person is told plainly — "your last change
  hasn't reached the cloud yet".
- The state document and the history documents carry the moment they were last written, so a device
  can say how fresh what it is showing is.

## If desktop ships before the history moves

Then every figure that needs the ledger or the daily record must **refuse, not print zero**. Zero
dividends because the record is on another device is a lie the app would be telling.

Draft wording, for the founder to approve or rewrite:

> This device doesn't have your account history yet — it's on the device where you imported it.
> Open MoneyKeel there once while you're online, and this fills in.

Figures affected: dividends and interest received, realised gain, the performance walk and its
beginning value, change in account value, and the Return on cash + investments line.

## What it costs

| Users | Storage at full two years | Firestore cost |
|---|---|---|
| 100 | ~420 MB | pennies — inside the free allowance |
| 10,000 | ~42 GB | roughly $7 a month |

Writes are one a day per person. Reads matter more than storage: a device should fetch the months it
needs, never the whole history on every open.

## What needs the founder's verdict

1. Approve the shape — history in monthly documents beside the state document.
2. Does desktop launch **with** history, or with the refusal above?
3. Approve or rewrite the refusal wording.
4. Two years of daily records, month-ends beyond — still right, now that it is stored for every
   device rather than one?

## Complies with

- `moneykeel_naming_spec_file-and-folder-naming_v01.md`
- `moneykeel_calc_spec_objectives-and-verification_v01.md` — objective 1: one figure, one answer,
  on every device.
