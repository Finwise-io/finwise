# Adds column K — RECOMMENDATION — to the Metric Matrix.
#
# Founder, 2026-08-18: "Add a column stating recommendation… I do not want Claude to work with wrong
# formulas or assume all formulas stated are correct as they are not, and many include flawed
# assumptions such unexplainable amount sits under change in investment value."
#
# Column J says what is MISSING. Column K says what the formula SHOULD BE — including where the
# formula written in column C is itself wrong. That distinction matters: a metric can have every
# input it needs and still be computed the wrong way.
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side

P = "/Users/palakjain/Vibe_Coding/finwise/Calculation Module/investment-api-performance-crosswalk.xlsx"
wb = openpyxl.load_workbook(P); ws = wb["1. Metric Matrix"]
WRAP = Alignment(wrap_text=True, vertical="top")
THIN = Border(*[Side(style="thin", color="DDDDDD")] * 4)
BAD  = PatternFill("solid", fgColor="FBE3E3")     # the formula itself is wrong
OK   = PatternFill("solid", fgColor="EAF3EC")     # formula stands

ws.column_dimensions["K"].width = 66
c = ws.cell(4, 11, "RECOMMENDATION — is the formula itself right, and if not what should it be?")
c.fill, c.font, c.alignment, c.border = PatternFill("solid", fgColor="7A2E2E"), Font(color="FFFFFF", bold=True, size=10), WRAP, THIN
ws.cell(3, 11, "RED = the formula in column C is WRONG or incomplete as written, and this cell says what it should be. "
               "GREEN = the formula stands; any problem is in the inputs (column J), not the arithmetic.")
ws.cell(3, 11).alignment = WRAP; ws.cell(3, 11).font = Font(bold=True, size=9, color="7A2E2E")

# (recommendation, formula-itself-wrong?)
R = {
"Beginning market value (BMV)": (
 "FORMULA IS FINE; IT IS UNOBTAINABLE AS WRITTEN. 'Sum of position market values as of T-10' assumes "
 "a stored history nobody has. DO NOT let the app back-solve it (BMV = EMV − flows − gain): that is "
 "circular and it inherits every ledger error, which is exactly how our beginning value came out at "
 "MINUS $448,028 against a statement's $378,022. RECOMMENDATION: store a daily per-account snapshot "
 "from first connection, and where no snapshot exists show NO beginning value and no return that "
 "depends on one. Absent beats invented.", True),

"Wealth generated (net gain/loss)": (
 "THE ARITHMETIC IS RIGHT AND THE LABEL IS WRONG — this is the flawed assumption the founder means. "
 "EMV − BMV − NCF is a correct identity, but what it produces is a RESIDUAL: whatever is left after "
 "everything else is accounted for. Our app prints it as 'change in investment value', which claims "
 "it measured a market movement. It measured nothing. Every error anywhere else in the ledger lands "
 "here wearing that label — with nothing moved, a $500 phantom deposit becomes a $500 'market loss', "
 "indistinguishable from a real one. RECOMMENDATION: split it in two. Show market movement ONLY where "
 "it was measured from actual prices, and show the remainder on its own line as 'we could not account "
 "for $X'. A person can act on 'unexplained'; nobody can act on a loss that never happened.", True),

"Contributions (gross in)": (
 "FORMULA INCOMPLETE AS WRITTEN. 'Sum of external cash/securities in' is right in principle but does "
 "not say what makes something external, which is where all the damage happens. RECOMMENDATION: state "
 "it as a rule over a CLOSED list of event types — external money in ONLY, never inferred from the "
 "sign of an amount, and an unrecognised word counts in nothing and is shown to the person. A "
 "reinvested dividend, a sweep between an account's own sub-balances, and a matured bond paying out "
 "are all INTERNAL and none is a contribution.", True),

"Withdrawals (gross out)": (
 "SAME INCOMPLETENESS, plus the decision this row's own trap names. RECOMMENDATION: define a "
 "withdrawal as money leaving the person's control, and classify fees, tax withheld and margin "
 "interest as COSTS on their own line — value leaves, but it is not money they took out. Enforce it "
 "in one place so no screen can disagree.", True),

"Net cash flow (NCF)": (
 "FORMULA STANDS. One addition: netting internal transfers must be evaluated across EVERY account the "
 "person holds, not per screen, or a transfer between two of their own accounts double-counts.", False),

"Simple return": (
 "FORMULA IS CORRECT BUT MUST NOT BE USED HERE, and this row already says so: it is valid only when "
 "net flow is zero. RECOMMENDATION: do not show it for any window where money moved. Our version "
 "compounds the problem by measuring from whatever day the app was installed rather than a date the "
 "person chose.", True),

"Modified Dietz (money-weighted)": (
 "THE RIGHT DEFAULT FOR SHORT WINDOWS, and it is the formula we should adopt. It needs only a "
 "beginning value and dated flows. RECOMMENDATION: make this the headline period return once the "
 "snapshot store exists, and keep IRR as the 'your personal return' figure alongside it.", False),

"IRR / money-weighted return (XIRR)": (
 "FORMULA STANDS and our implementation is sound. RECOMMENDATION: keep the rule that it is NOT "
 "annualised for short windows — this row's trap is real, and annualising ten days produces absurd "
 "figures.", False),

"Cumulative return since inception": (
 "FORMULA AS WRITTEN IS RIGHT; OUR IMPLEMENTATION IS NOT. Ours omits distributions received, so it is "
 "gain-over-cost rather than a cumulative return. RECOMMENDATION: add income per holding, which the "
 "ledger already carries, and state the lookback limit beside it.", True),

"Unrealized gain/loss": (
 "FORMULA STANDS. The risk is that 'cost basis' means three different things across providers. "
 "RECOMMENDATION: store which definition each number came from and never compare two that differ.", False),

"Realized gain/loss": (
 "FORMULA STANDS. RECOMMENDATION: keep the rule that a sale with no recorded purchase is reported "
 "separately rather than assigned a made-up cost — a made-up zero cost reports the whole sale as "
 "profit and taxes it.", False),

"Interest income (period)": (
 "FORMULA STANDS; THE SUMMING IS WRONG. Summing 'interest transactions' must use SIGNED amounts. We "
 "discard the sign when a transaction is imported, so a payment and its reversal both add — which is "
 "why the app showed $2,387 against $1,193 actually received. RECOMMENDATION: preserve the sign at "
 "import, and carry direction in its own field the way the FDX standard does rather than inferring "
 "it from the number.", True),

"Dividend income (period)": (
 "FORMULA NEEDS ONE MORE RULE. RECOMMENDATION: count a reinvested dividend as income ONCE and treat "
 "the matching purchase as internal. Never let either leg touch contributions. Show cash and "
 "reinvested separately — they mean different things to a retiree living off income.", True),

"Accrued interest / accrued income": (
 "NOT A DERIVED METRIC AND SHOULD NOT BE TREATED AS ONE. RECOMMENDATION: capture the accrual where a "
 "source provides it — Vanguard's file has an 'Accrued Interest' column, $1,289.40 on one real "
 "purchase — and hold it apart from cost basis, which it currently inflates silently.", True),

"Current yield (bond)": (
 "FORMULA STANDS: annual coupon ÷ current price, where the coupon is paid on FACE value and the price "
 "is what it is worth today. RECOMMENDATION: confirming the coupon must come from the description "
 "text is permanent, not temporary — verified in FDX 6.3 and 6.4 that no standard carries it.", False),

"Yield to maturity": (
 "FORMULA STANDS. RECOMMENDATION: record whether the price used already includes interest built up "
 "since the last payment. The same bond has two prices and two yields depending on that, and we do "
 "not currently say which.", False),

"Contribution to return": (
 "FORMULA AS WRITTEN IS RIGHT — 'weight AT BMV' — and our implementation ignores that. We weight by "
 "today's value, so a holding bought halfway through the period is credited as if held throughout. "
 "RECOMMENDATION: implement it exactly as this row states, once beginning values exist.", True),

"Allocation and drift": (
 "FORMULA STANDS but half its inputs do not exist for us: there is no target allocation, so drift "
 "cannot be computed. RECOMMENDATION: either capture a target, or show allocation only and stop using "
 "the word drift.", False),

"Fees drag": (
 "FORMULA STANDS. RECOMMENDATION: it cannot be computed until fees have a line of their own; today "
 "they fall into the residual and are reported as investment performance.", False),

"Net worth trend series": (
 "NOT A FORMULA PROBLEM — A HONESTY PROBLEM. RECOMMENDATION: label every change figure with the date "
 "it is actually measured FROM, so a figure measured from install day says so. And state the "
 "retention limit rather than letting older history disappear silently.", True),

"Asset allocation by class": (
 "FORMULA STANDS. RECOMMENDATION: one piece of code deciding what a holding is, used by all three "
 "doors, so the same holding cannot land in different slices depending on how it arrived.", False),

"Portfolio period return": (
 "FORMULA STANDS — money-weighted across holdings, which is correct. RECOMMENDATION: allow any date "
 "range, so it can be laid beside a statement. The code that does this already exists and is unused.", False),

"Portfolio vs benchmark trend": (
 "FORMULA IS WRONG AS IMPLEMENTED. Valuing every past date with TODAY'S share count draws a history "
 "the person never held. RECOMMENDATION: count only the shares owned on or before each point, using "
 "purchase dates already on the record.", True),

"Capital gains split (long vs short)": (
 "FORMULA STANDS — judged per batch of shares on its own purchase date, never per holding. "
 "RECOMMENDATION: keep 'unreadable date means short-term'; erring the other way understates a tax "
 "bill, which is the worse mistake.", False),

"Uninvested cash in an account": (
 "FORMULA IS RIGHT AND THE SURROUNDING CODE UNDOES IT. We subtract money-market funds from cash AND "
 "separately drop them from the holdings list, so the money is in neither place. RECOMMENDATION: "
 "subtract once, keep the fund visible as a holding.", True),
}

wrong = 0
for r in range(5, ws.max_row + 1):
    m = ws.cell(r, 1).value
    if m in R:
        text, is_wrong = R[m]
        cell = ws.cell(r, 11, text)
        cell.alignment, cell.border, cell.fill = WRAP, THIN, (BAD if is_wrong else OK)
        wrong += 1 if is_wrong else 0
    elif ws.cell(r, 9).value:
        cell = ws.cell(r, 11, "Formula stands. No change recommended — see column J for anything the inputs still need.")
        cell.alignment, cell.border, cell.fill = WRAP, THIN, OK
wb.save(P)
print(f"column K added · {len(R)} metrics reviewed · {wrong} where the FORMULA ITSELF is wrong or incomplete")
