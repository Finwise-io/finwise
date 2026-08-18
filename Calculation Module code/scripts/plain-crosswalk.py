# Rewrites the WHAT WE NEED column in plain English.
#
# Founder, 2026-08-18, reading "One classifier instead of three": "what this means?" He was right —
# it is a compressed technical phrase that tells a reader nothing. Nineteen cells had the same
# fault. The test each rewrite must pass: could a person with no finance or coding background read
# it and know what is wrong and what would fix it? A concrete example beats a definition.
import openpyxl
P = "/Users/palakjain/Vibe_Coding/finwise/Calculation Module/investment-api-performance-crosswalk.xlsx"

J = {   # keyed on the Metric column
"Contributions (gross in)":
 "A COMPLETE LIST OF WHAT EVERY BROKER'S WORDS MEAN. Each broker uses its own word for each kind of "
 "event, and when we meet a word we do not know, the app currently guesses: money coming in must be "
 "a deposit. On the founder's real Vanguard file that guess produced $1,064,493 of deposits into an "
 "account where nothing was paid in — the same $220,000 of Treasury bills, rolled three times, "
 "counted as brand-new money on every roll.",

"Withdrawals (gross out)":
 "The same complete list of broker words — and one decision from you. When a fee is charged, or tax "
 "is withheld, money leaves the account, but you did not take it out. Is that a withdrawal? Right "
 "now we have never decided, so different parts of the app can disagree. Today Vanguard's "
 "reinvestment lines (which are negative amounts) are counted as you taking money out.",

"Net cash flow (NCF)":
 "Money moved between two of YOUR OWN accounts must cancel out, or it looks like you both paid in "
 "and took out. We do cancel it — but only when both accounts are shown on the same screen. Move "
 "money from an account on one screen to an account on another and it counts twice.",

"Realized gain/loss":
 "Nothing new. Oldest shares are sold first, and a sale with no recorded purchase is reported "
 "separately rather than being given a made-up cost. It is only ever as right as the record of your "
 "buys and sells.",

"Unrealized gain/loss":
 "A LABEL SAYING WHERE 'WHAT YOU PAID' CAME FROM. There are three different ways to work it out and "
 "they give three different numbers: the true cost of each batch of shares including fees; an "
 "average that includes commission; or simply price × shares with fees ignored. Both brokers we "
 "connect to send us nothing, so we use the weakest of the three — and the screen does not say so.",

"Simple Dietz":
 "Not built, and probably should not be. The version below it is better and needs nothing extra.",

"Modified Dietz (money-weighted)":
 "BUILD THIS — it is the fair way to measure a short period when money moved in or out. It needs two "
 "things: what the account was worth at the start, and the dates money moved. We have the dates. We "
 "do not keep a starting value per account, which is the same missing piece that breaks three other "
 "rows in this sheet.",

"IRR / money-weighted return (XIRR)":
 "Nothing to build. It works by trying a rate, seeing if it fits, and narrowing down — always the "
 "same answer for the same inputs. It refuses to answer in four situations rather than guessing. "
 "But it trusts the record of your deposits completely: a deposit that never happened does not make "
 "it refuse, it makes it answer confidently and wrongly.",

"Cumulative return since inception":
 "It leaves out the dividends you were paid, so it is really 'gain against what I paid', not your "
 "full return. We already have the dividends recorded — they just are not added in. It should also "
 "say how far back the broker's history actually goes.",

"Interest income (period)":
 "MINUS SIGNS THAT SURVIVE. When a transaction arrives we throw away whether it was money in or "
 "money out and keep only the size. So a payment and its matching reversal both add up instead of "
 "cancelling. That is why the app showed $2,387 of interest when $1,193 was actually paid — exactly "
 "double, because each monthly payment arrives as a pair.",

"Dividend income (period)":
 "The same minus-sign fix, plus one rule: when a dividend is automatically reinvested it arrives as "
 "two lines — the money paid to you, and the same money buying more shares. It is income ONCE, and "
 "the buying half is not new money.",

"Yield to maturity":
 "One line stating whether the bond's price already includes interest that has built up since the "
 "last payment. The same bond has two different 'prices' depending on that, and the yield changes "
 "with it. We do not currently say which we used.",

"Position weight":
 "Nothing. What counts as cash decides what we divide by, and our rule — cash means cash only — "
 "settles it.",

"Contribution to return":
 "WHAT THE ACCOUNT WAS WORTH AT THE START of the period. We use today's value instead, so a holding "
 "bought halfway through gets credited as though you had owned it the whole time.",

"Allocation and drift":
 "SOMETHING TO DRIFT FROM. We show what you actually hold, but you have never told the app what you "
 "are AIMING to hold — so there is no target, and 'drift' cannot be worked out at all. That is a "
 "product decision before it is a coding one.",

"Asset allocation by class":
 "ONE PIECE OF CODE DECIDING WHAT A HOLDING IS, INSTEAD OF THREE. There are three separate places "
 "that answer 'what kind of thing is this?' — one for a file you upload, one for a connected broker, "
 "one for a whole account — and they were written at different times with different rules. So the "
 "SAME holding gets different answers depending how it arrived: a gold fund, a bitcoin fund and an "
 "option all count as Alternatives when uploaded from a file, but as ordinary shares when the same "
 "holding comes through the broker. Your gold could sit in a different slice of the pie chart purely "
 "because of how it got in. Fix: keep the cleverest one, delete the other two, have all three doors "
 "use it.",

"Cost basis":
 "The same label described two rows above — a note saying which of the three ways of working out "
 "'what you paid' this number came from, so nobody compares two figures that were never the same "
 "measure.",

"Capital gains split (long vs short)":
 "THE REAL PURCHASE DATES. Whether a gain is taxed at the lower long-term rate depends on owning "
 "something for twelve whole months, judged per batch of shares. Both brokers send us no purchase "
 "history at all, so we build a single stand-in batch with one date. Where a date cannot be read we "
 "assume short-term, which is the cautious side — understating a tax bill is the worse mistake.",

"Portfolio period return":
 "THE ABILITY TO ASK FOR ANY DATE RANGE. It only answers six fixed periods (1 month, 3 months, and "
 "so on), so it can never be lined up against the dates on your statement. The code that accepts any "
 "two dates is already written and finished — nothing in the app calls it.",
}

wb = openpyxl.load_workbook(P); ws = wb["1. Metric Matrix"]
n = 0
for r in range(5, ws.max_row + 1):
    m = ws.cell(r, 1).value
    if m in J:
        ws.cell(r, 10, J[m]); n += 1
wb.save(P)
print(f"rewrote {n} of {len(J)} cells in plain English")

# ── and check nothing shorthand survived in anything I wrote ────────────────────────────────────
BANNED = ['classifier','provenance tag','taxonomy','T-minus','snapshot store','denominator',
          'bisection','synthetic lot','clean vs dirty','chain-link','netting','ingest']
wb = openpyxl.load_workbook(P); ws = wb["1. Metric Matrix"]
left = []
for r in range(5, ws.max_row + 1):
    for c in (7, 8, 9, 10):
        v = ws.cell(r, c).value
        if isinstance(v, str):
            for b in BANNED:
                if b.lower() in v.lower():
                    left.append((r, ws.cell(r, 1).value, b))
if left:
    print(f"  ⚠ {len(left)} still shorthand:")
    for r, m, b in left: print(f"      r{r} {str(m)[:40]} — '{b}'")
else:
    print("  no shorthand left in any column I wrote")
