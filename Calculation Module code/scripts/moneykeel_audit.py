"""The 2026-08-25 audit — every finding, and which row each one lands on.

Written after reading the last 48 hours of work against the three standards: the vocabulary
standard, the identifier standard, and the objectives-and-verification standard.

A finding is kept here rather than in the builder so the list can be read on its own, and so the
column the founder reads and the list I reason from are the same text. Numbers are A01 upwards,
never reused, never renumbered — the same rule the questions follow.

Three scopes:
  FILE   — true of the whole master file. Printed on the Reference tab, not on every row.
  ROW    — lands on the named figures.
  RULE   — lands wherever a pattern appears, worked out at build time rather than typed.
"""

COLUMN = 'Audit finding — 2026-08-25 review'

# ── the findings themselves ────────────────────────────────────────────────────────────────────
# (number, scope, one line the founder can act on)
FINDINGS = [

 # ---- the stamp that is not a stamp -------------------------------------------------------
 ('A01','FILE', 'Row status reads VERIFIED 2026-08-22 on all 163 figures because the builder types '
                'that exact text on every row it appends. Nobody read a screen to earn it. Rung 2 '
                '(S08) and rung 3 (S09) have not started and the founder\'s verdict column (S13) '
                'does not exist, so nothing in this file has been verified in the sense the '
                'objectives standard uses the word.'),
 ('A48','FILE', '126 of 163 rows read NOT DETERMINED for the decisions that govern the figure and '
                '37 read NOT DETERMINED for what the figure says when it cannot be computed — and '
                'every one of those same rows is stamped VERIFIED.'),

 # ---- the retired word is still the working word -------------------------------------------
 ('A02','FILE', 'The vocabulary standard retired the word engine on 2026-08-25. It is still the '
                'working vocabulary of the inputs tab (Which engine uses it, Engine ID), both '
                'engine columns of the reconciliation tab, column R of every screen tab, and 20-odd '
                'column notes on this tab. Identifier type E is retired and is still being issued '
                'live on the inputs tab.'),
 ('A03','FILE', 'moneykeel_naming_spec_unique-identifier_v01.md still lists type E in its pieces '
                'table and does not list type F, while its own examples use MK-PL-F-012. Rule 4 and '
                'the worked example are still written in engine language.'),
 ('A04','FILE', 'This tab describes two columns that no longer exist — Name of Underlying Engine, '
                'Engine ID — and names others with (S02), (S04), (S11) suffixes the headers do not '
                'carry.'),
 ('A22','FILE', 'The vocabulary standard names four categories of function. The functions tab has '
                'six. "3 · DEPENDENT (feeds an action only)" holds 74 functions and contradicts the '
                'standard\'s own definition of DEPENDENT — a chain that ends at a screen.'),

 # ---- the specification does not describe the file -----------------------------------------
 ('A05','FILE', 'The Specification runs S01-S15, S18-S21, then S16 and S17. On a tab whose stated '
                'purpose is that a piece of work can be named by its number, the numbers are out of '
                'order.'),
 ('A06','ROW',  'S01 says COMPLETE, 163 of 163 carry both forms of the formula. MK-NW-M-006 carries '
                'neither. It is 162 of 163.'),
 ('A07','FILE', 'S02 says 59 rows name inputs carrying their identifiers; 77 do. Its second figure '
                '— 72 rows naming an input that is on no row of the inputs tab — matches nothing '
                'countable in the file, and the reconciliation tab\'s GAPS section, which S02 points '
                'at as the place the gap is counted, is a heading with no rows under it.'),
 ('A08','FILE', 'S20 says 69 figures name no function, then breaks it down as Plan 23, Menu 20, '
                'Cash flow 13, Net worth 9 — which is 65. The functions_per_metric tab carries the '
                'missing four: Home 2, Performance 1, shown-on-more-than-one-screen 1.'),
 ('A09','FILE', 'S12 says COMPLETE for functions, all 455 read from the code. The sweep reads only '
                'exported top-level declarations. 88 module-private functions in the same three '
                'folders are invisible to it, and 5 exported names that are defined in two files '
                'each are collapsed to one row. Rung 1 — every engine in the code has a row in the '
                'file — is therefore not met, and S12 should read PARTIAL.'),

 # ---- the gate that cannot fire ------------------------------------------------------------
 ('A10','FILE', 'The reconciliation gate matches identifiers with MK-[A-Z]{2}-[MEIDS]-\\d{3}. That '
                'class carries the retired E and has no F. So no function identifier is ever '
                'matched, the Function ID column contributes nothing, and check 4 — UNKNOWN '
                'FUNCTION, a figure depending on a function that is in no row — has never been able '
                'to fire.'),
 ('A11','FILE', 'The gate\'s orphan-input check looks for the text NO INPUT ID, which appears '
                'nowhere in the file. The builder writes "NOT DETERMINED — no input list on record" '
                'and "[NOT AN INPUT — another engine\'s answer]" instead. That check has never '
                'fired either.'),
 ('A26','FILE', 'The 28 screen rows that carry no figure are built one cell short: their core-screen '
                'answer is written into "Your name for it (72-metric file)" and their row status into '
                '"Core screen?", leaving Row status empty. Two hard-coded pad counts in the builder '
                '(17 and 20) against 26 columns.'),

 # ---- the same calculation, written twice --------------------------------------------------
 ('A12','ROW',  'moneyWeightedReturn is defined twice and the two are different methods: '
                'src/domain/performance/moneyWeighted.ts:80 solves an internal rate of return by '
                'bisection; Calculation Module code/engines/window-return.ts:69 is Modified Dietz. '
                'Both are called the money-weighted return. Only the first has a row in this file; '
                'the sweep keeps whichever folder it walks first and drops the other in silence.'),
 ('A13','FILE', 'Four more names are defined in two files each and silently collapsed to one row: '
                'classifyHolding (import/holdingsImport.ts and engines/classify.ts), rmdDivisor '
                '(decumulation/index.ts and engines/rmd.ts), round2 (_shared/num.ts and '
                'engines/money.ts), parseReceipt (services/economicData.ts and '
                'services/receiptScan.ts). This is S19 — duplicate calculations in the code — and it '
                'is worse than not started, because the file shows one row where there are two '
                'implementations.'),
 ('A14','ROW',  'This file states three different formulas for what it calls a return: '
                'Sum(return x value) / Sum(value), Modified Dietz, and earned / average value held. '
                'Three methods give three answers. One of them has to be the definition.'),

 # ---- the assumptions column ---------------------------------------------------------------
 ('A15','RULE', 'MK-ST-F-055 is round2 — Math.round(n * 100) / 100. This file reports it as "Rounds '
                'the answer to a whole number" and "Multiplies by 100 — a percentage, or an option '
                'contract treated as 100 shares". Both are false: it rounds to two decimals, and the '
                'hundred is the rounding scale. The pair is carried onto net worth and onto every '
                'figure whose chain reaches it.'),
 ('A16','RULE', 'The two commonest entries in the assumptions column are not assumptions but notes '
                'to myself: "Leaves some rows out of the answer — check which" (48 functions) and '
                '"Multiplies by 100 ... Worth checking which" (23). The 2026-08-25 commit said '
                'assumptions now name the actual value rather than the shape of the problem; these '
                'still name the shape.'),
 ('A17','RULE', '"Uses a built-in i of 0", on 11 functions, is the loop counter — let i = 0.'),
 ('A18','RULE', '"Treats a year as twelve equal months" fires on any division by 12, a month index '
                'included; "Treats a month as 30 days" fires on any multiplication by 30. Neither is '
                'read as arithmetic, so both carry false positives.'),
 ('A19','FILE', 'A function\'s body is read from its own line to the start of the next EXPORTED '
                'function, so every module-private helper below it is swallowed and its assumptions '
                'are attributed upwards. classifyHolding is three lines and only delegates; this '
                'file gives it findHeaderRow\'s loop counter as its assumption.'),
 ('A20','FILE', 'Comments are stripped before assumptions are read, by design. So an assumption the '
                'author stated in prose — the kind a founder would want to see — cannot appear at '
                'all, and 241 functions read "None found".'),
 ('A21','FILE', 'functions_summary shows 0 in "Handed nothing, but reads the stored data" for all '
                '455 functions. The store is detected only as the text useStore or getState() inside '
                'the captured body; those folders contain 18 getState() calls and exactly one row '
                'carries the phrase. A zero that reads as a finding is a detection gap.'),
 ('A23','ROW',  'MK-ST-F-055 (round2) is filed under "1 · ACTION — does something and displays '
                'nothing; it cannot put a wrong number in front of a person", while it rounds net '
                'worth.'),

 # ---- the inputs tab -----------------------------------------------------------------------
 ('A24','FILE', 'All 48 input rows are stamped VERIFIED 2026-08-22. The reconciliation tab, built '
                'from the code three days later, says 9 of them are named by no engine at all and 29 '
                'more only partly agree. 10 of 48 agree in both directions.'),
 ('A25','FILE', 'MK-XS-I-010 names two engines and carries no engine identifier, and one of the two '
                '— "the institution-words table" — is prose, not an identifier. MK-XS-I-002, -008, '
                '-009 and -017 each name two engines and carry one identifier. The identifier '
                'standard\'s rule 4 says neither side is allowed to be silent.'),
 ('A49','ROW',  'This row carries no name on screen, on a tab whose stated rule is that the label is '
                'copied exactly as it is worded on screen.'),

 # ---- formulas: the file and the code do not say the same thing ------------------------------
 ('A27','ROW',  'The maths column states Modified Dietz — (ending - beginning - net money in) over '
                '(beginning + flows weighted by when they arrived). The words column states '
                'something else entirely — Sum(return x value) / Sum(value), a value-weighted '
                'average of holding returns. Two different formulas for one figure, and the second '
                'is not a money-weighted return whatever the words call it.'),
 ('A28','ROW',  'Three contradictions on one row. The maths says 1,000 futures; the assumptions say '
                'the code falls back to 500 when the path count is missing. The words describe a '
                'best-to-worst range; the decision says that band was removed. The maths shows no '
                'rounding, the decision says nearest 5, the assumption says whole number.'),
 ('A29','ROW',  'The maths names the classes {brokerage, retirement, other investments}. The words '
                'name Stocks / Funds, Bonds & CDs, Alternatives and Unclassified. Different lists, '
                'and Unclassified appearing in one of them decides whether an unclassified account '
                'is counted as an investment.'),
 ('A30','ROW',  'Yield to maturity: this file states the root solve — value = Sum(coupon/(1+y)^t) + '
                'face/(1+y)^n. The code (src/domain/bonds/index.ts:37) is approxYTM, the '
                'straight-line approximation (coupon + (face-value)/n) / ((face+value)/2). Measured '
                'gap 4 to 27 basis points, widening with the discount and the maturity: a 25-year 2% '
                'bond priced at 60 reads 4.50% where the stated formula gives 4.77%. This is a '
                'figure the founder can check against a broker statement, so it is a kind-B '
                'reconciliation that will fail.'),
 ('A33','ROW',  'Yield to maturity is computed with annual compounding over whole-year periods. US '
                'bonds pay semi-annually and yield is quoted bond-equivalent (semi-annual, doubled). '
                'Neither the file nor the code says which convention it means, and the two do not '
                'agree.'),
 ('A31','ROW',  'This file says years to maturity is the gap divided by 365, and repeats it in the '
                'assumptions as "treats a year as 365 days". The code divides by 365.25.'),
 ('A32','ROW',  'Rate sensitivity: this file states change in value = -duration x change in rate x '
                'value. The code computes no duration at all — it reprices every cash flow at the '
                'yield plus and minus one percent. It also rounds the remaining life to whole years '
                'and prices from the APPROXIMATE yield, so pricing the bond at its own current yield '
                'does not reproduce its own value; the delta is measured from a number the model '
                'cannot reproduce.'),
 ('A34','ROW',  'Long-term or short-term: this file says the lot must be held 365 whole days. The '
                'IRS test is MORE than one year — a lot bought on 1 January and sold on 1 January '
                'the next year is short-term. The rule as written is one day early and mislabels the '
                'tax character of a gain at exactly the boundary.'),
 ('A35','ROW',  'The required-withdrawal divisor table lists ages 73-90, 92, 95 and 100 and '
                'interpolates the rest. Ages 93, 94, 97, 98 and 99 do not equal the published IRS '
                'Uniform Lifetime divisors. On a $500,000 pre-tax balance the required amount comes '
                'out short by $184 at 94, $811 at 97, $926 at 98 and $1,066 at 99. Taking less than '
                'the required amount is penalised by the IRS, so this errs in the direction that '
                'costs the person money.'),
 ('A36','ROW',  'Required-withdrawal start age: this file says 73 for those born 1951-1959 and 75 '
                'for 1960 or later. The code returns 73 for EVERY birth year below 1960, and 73 '
                'again when the birth year is missing. Neither side names the age 72 (and 70 and a '
                'half) start ages that apply to earlier birth years, and neither says what should '
                'happen when the birth year is unknown rather than quietly assuming one.'),
 ('A37','ROW',  'The required withdrawal uses the Uniform Lifetime table for everybody. The Joint '
                'Life and Last Survivor table applies when the sole beneficiary is a spouse more '
                'than ten years younger, and gives a smaller required amount. Not named anywhere in '
                'the file.'),
 ('A38','ROW',  'Social Security claim factor: this file\'s rule is stated per month. The code '
                'rounds the claim age to a whole year before counting months, so claiming at 62 and '
                'six months is priced as 63 — 3.3% of the benefit, about $83 a month for life on a '
                '$2,500 benefit. The code\'s own note above the function says "month-precise".'),
 ('A39','ROW',  'Full retirement age: the code returns 66 for every birth year at or below 1954. The '
                'published ages are 65 for 1937 and earlier and 65 plus two to ten months for '
                '1938-1942. Outside the 55-70 group, but it is a silent wrong answer rather than a '
                'refusal.'),
 ('A40','ROW',  'Lifetime Social Security = monthly x 12 x (life expectancy - claim age): no '
                'inflation and no discounting, while the retirement paycheck on another screen grows '
                'Social Security with inflation. Two assumptions about one stream, and this is the '
                'figure people use to choose a claim age.'),
 ('A41','FILE', 'Not one kind-A figure names its source in this file. The objectives standard '
                'requires the publication and the year in the FILE and a re-check when the year '
                'rolls. The citations exist only as code comments — IRS Rev. Proc. 2025-32 in '
                'tax.ts, the words "post-2022" in rmd.ts, nothing at all for the Social Security '
                'factors — and a year-roll guard exists for the tax tables alone.'),
 ('A42','ROW',  'Roth conversion tax is stated as approximately the sum over bands. Three things '
                'that decide whether a conversion is worth doing for someone aged 55-70 are named '
                'nowhere: that the conversion stacks on top of existing ordinary income, the IRMAA '
                'surcharge on Medicare premiums two years later, and the share of Social Security '
                'that becomes taxable as a result.'),
 ('A43','ROW',  'Debt payoff: this file\'s formula is one balance rolled forward at the rate over '
                'twelve until it clears. The code (src/domain/debt/index.ts:140) also orders debts by '
                'avalanche or snowball, rolls a cleared debt\'s payment into the next, defers loans '
                'whose first payment has not arrived, settles due-in-full debts as dated lumps, '
                'clears at a one-cent tolerance and gives up at 600 months with a never-pays-off '
                'flag. None of that is in the file, and the roll-over is what makes the answer '
                'right.'),
 ('A44','ROW',  'Retirement pot: the file writes pot = balance × (1+r)^n + Σ(contribution × '
                '(1+r)^(n−year)) and stops there. Three things the code settles and the file does '
                'not: a contribution is treated as arriving at the END of its year, which changes '
                'the answer by a factor of (1+r) against the other reading; contributions grow at '
                'their own rate, which DEFAULTS TO ZERO when nobody sets one; and r is a nominal '
                'return, with inflation applied to the spending side rather than here — so whether '
                'the headline is in today\'s money depends on a convention stated nowhere. '
                '(projectNestEgg, src/domain/retirement/index.ts:324.)'),
 ('A45','ROW',  'Education saving: monthly needed = gap over months assumes no return whatever on '
                'money saved between now and the first term, while the retirement pot on another '
                'screen compounds its contributions. Two treatments of the same idea, and this one '
                'overstates what the person must put aside.'),
 ('A46','ROW',  'Interest income falls back to a built-in 0.042 — described in the code as roughly '
                'the US Aggregate Bond yield — when a bond fund carries no rate of its own. No '
                'source, no year, and no re-check when the year rolls.'),
 ('A47','ROW',  'Current yield is the annual coupon over the recorded value. If that value is a '
                'dirty price it carries accrued interest and the yield is understated. Nowhere does '
                'the file say which of the two it is.'),
 ('A51','ROW',  'When a debt states no minimum payment the required payment is taken as the interest '
                'plus one percent of the balance. Where the one percent comes from is not said, it '
                'is not marked as anyone\'s decision, and it sets both the payoff date and the '
                'monthly debt figure on the cash-flow screen.'),
 ('A50','ROW',  'The import road calls the classification engine without the institution type, the '
                'institution sub-type or the person\'s own answer, and hard-codes hasSecurityIdentity '
                'to true (src/domain/import/holdingsImport.ts:137). So the engine\'s first two rules '
                '— the person\'s own answer outranks the institution, and a fund the institution '
                'itself declares to be money-market — cannot fire on an imported holding, which is '
                'the road most holdings arrive by.'),
]

TEXT = {n: t for n, s, t in FINDINGS}
SCOPE = {n: s for n, s, t in FINDINGS}

# ── which rows each ROW finding lands on ───────────────────────────────────────────────────────
ON_ROW = {
  'MK-NW-M-006': ['A06'],
  'MK-XS-M-004': ['A27','A14','A12'],
  'MK-PF-M-009': ['A14','A12'],
  'MK-PF-M-006': ['A14'],
  'MK-PF-M-007': ['A14'],
  'MK-XS-M-002': ['A28'],
  'MK-XS-M-003': ['A29'],
  'MK-NW-M-026': ['A30','A33','A31'],
  'MK-NW-M-025': ['A31'],
  'MK-NW-M-028': ['A32'],
  'MK-NW-M-027': ['A47'],
  'MK-NW-M-044': ['A47'],
  'MK-NW-M-036': ['A34'],
  'MK-NW-M-037': ['A34'],
  'MK-PL-M-012': ['A36','A41'],
  'MK-PL-M-013': ['A35','A37','A41'],
  'MK-PL-M-015': ['A35','A37','A41'],
  'MK-PL-M-017': ['A38','A39','A41'],
  'MK-PL-M-019': ['A38','A39','A41'],
  'MK-PL-M-020': ['A40','A41'],
  'MK-PL-M-023': ['A42','A41'],
  'MK-PL-M-031': ['A43'],
  'MK-NW-M-015': ['A44'],
  'MK-PL-M-026': ['A44'],
  'MK-PL-M-033': ['A44'],
  'MK-CF-M-022': ['A44'],
  'MK-PL-M-036': ['A45'],
  'MK-PL-M-037': ['A45'],
  'MK-NW-M-024': ['A46'],
  'MK-NW-M-043': ['A46'],
  'MK-NW-M-045': ['A46'],
  'MK-PL-M-004': ['A49'],
  'MK-CF-M-003': ['A49'],
  'MK-CF-M-005': ['A49'],
  'MK-XS-M-001': ['A23'],
  'MK-NW-M-007': ['A50'],
  'MK-NW-M-008': ['A50'],
  'MK-NW-M-020': ['A50'],
  'MK-NW-M-011': ['A51'],
}


def for_row(mid, assumption_cell='', formula_words=''):
    """The findings that land on one figure, numbered and in order.

    RULE findings are worked out from what the row actually says, not typed against an identifier,
    so they stay true when the row changes.
    """
    hits = list(ON_ROW.get(mid, []))
    a = str(assumption_cell or '')
    if 'MK-ST-F-055' in a: hits.append('A15')
    if 'Worth checking which' in a or 'check which' in a: hits.append('A16')
    if 'built-in i of 0' in a: hits.append('A17')
    if 'twelve equal months' in a or 'month as 30 days' in a: hits.append('A18')
    hits.append('A01')                      # true of every row, and the one that matters most
    seen, out = set(), []
    for h in hits:
        if h in seen: continue
        seen.add(h); out.append(h)
    return '\n'.join('%d. %s — %s' % (i, h, TEXT[h]) for i, h in enumerate(out, 1))


def reference_rows():
    """The findings that belong to the file rather than to any one row."""
    return [('AUDIT %s' % n, t) for n, s, t in FINDINGS if s in ('FILE', 'RULE')]
