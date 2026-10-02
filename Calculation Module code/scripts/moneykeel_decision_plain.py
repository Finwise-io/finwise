"""WHAT IS THE DECISION? — written by hand, or honestly marked as not yet written.

FOUNDER, 2026-09-28, quoting one of his own rows back at me:

    "balance authority rule gains the derive-from-holdings fallback when the broker reports no usable
     total (missing/zero)" — don't know what this means?

He is right, and it is not cosmetic: a decision nobody can read is a decision nobody can apply, so the
log would have been 407 rows of paper. He asked for three things — a column saying WHAT the decision
is, numbering where a row holds several, and plain English.

I TRIED TO DO IT MECHANICALLY FIRST AND IT FAILED. A glossary swapping each code word for plain words
turned his example into "the rule for which figure an account's balance comes from gains the adding up
what the account holds instead" — worse than the original. Swapping words is not writing a sentence,
and shipping 407 of those would have been the same fault as the jargon: text that looks like an answer.

So: the numbering is mechanical, because splitting on the semicolons the changelog already uses works.
The sentence is written BY HAND, row by row, in HAND_WRITTEN below. Every row without one says
"NOT YET WRITTEN IN PLAIN ENGLISH" on its face and shows the raw text underneath, so nothing is hidden
and the count is visible on every build. It is a ratchet: it may only fall.
"""
import re

# ── HOW A ROW IS WRITTEN ─────────────────────────────────────────────────────────────────────────
# HIS OWN WORDS LEAD, VERBATIM, AND ARE NEVER PARAPHRASED AWAY (founder, 2026-09-29, of four rows
# where his quote had survived into the plain column: *"for these the text in \" \" is better to
# understand. leave that as is"*).
#
# He is right, and it is not only a matter of taste: "if the odds are zero — don't show zero" is
# shorter, plainer and more exact than anything I would write about it, and it is also the thing he
# can recognise as his. So where a row quotes him, the quote OPENS the answer, word for word, and
# the explanation follows it. My words explain his; they never replace them.
#
# ── WRITTEN BY HAND ──────────────────────────────────────────────────────────────────────────────
# Keyed by a distinctive phrase from the source row. The value is what the decision IS, in words he
# would use, numbered when the row holds more than one. These always win over the raw text.
HAND_WRITTEN = {
 'open them from build but make sure it meets new design standards':
  'The six Cash flow screens that had no drawing — Log income, Month detail, Bill calendar, Paycheck months, Monthly income, Worth a look — are approved as built, on condition that each meets the screen standard. Each was audited against it the same day and the gaps fixed; the v02 drawings show the result.',
 'The Look back drawing v01 is approved':
  "The Look back drawing v01 is approved. It is now the screen's design of record, and the last open check of the Performance module closes.",
 # ── Net worth module, 2026-10-01 — his nine rulings while the module was taken through the seven steps ──
 'Quite Instrument v08 - approved all screens from A to G':
  'All seven frames of Quiet Instrument v08 are approved: A with data by category, B all collapsed and the down case, C the first day, D the missing-data banner, E the change walk, F the fix sheet, G the add sheet.',
 'Add Account by hand v01 - approved':
  'The Add-an-account-by-hand screen design is approved.',
 'Account detail screen should be same as Account Portfolio screen':
  'The account-detail v01 drawing is rejected. The screen once called Account detail IS the Account portfolio screen, one screen with one design: frame 2 of Performance v17.',
 'I have already approved Perf v17 for perf module':
  'Performance v17 is approved in full, for the Performance module — all five frames.',
 'Investment v07 - archive it as it is old version of performance':
  'investments_v07 is archived. It is an old version of the Performance screen, not a design for the Bonds, Other investments or Holding detail screens.',
 'Forget about these screens - Home, Insights, Import holdings, Job safety, Stress test':
  'The Net worth module is SEVEN screens: Net worth, Account portfolio, Add account by hand, Itemize, Bonds, Other investments, Holding detail. Home, Insights, Import holdings, Job safety and Stress test are not part of it.',
 'Mark these three as approved as of now':
  'Bonds v01, Alternatives v01 and Holding detail v01 are approved as of 2026-10-01, subject to his review on a TestFlight build.',
 'why you keep asking like a broken record':
  'The way into Itemize is one link on the Account portfolio, shown when an account holds money and nothing is recorded inside it. Itemize v01 is the design and is built from; I decided it rather than asking him a fourth time.',
 'The Itemize door was decided and built on the Account portfolio':
  'Work every failing step of the Net worth module through, without asking him anything, and report the result in the Word format he asked for.',
 'B47 FINDING 3': (
  "When you link a brokerage, the app takes the account's total straight from the broker. Vanguard sent "
  "back no total at all, while the account really held $132,000 — so it showed $0. Four decisions:\n"
  "1. When the broker gives no total, or gives zero, add up EVERYTHING THE ACCOUNT HOLDS instead: every "
  "holding in it at today's price — stocks, ETFs, funds, bonds, CDs, Treasuries — plus any options, "
  "plus the uninvested cash sitting in it. Not just the shares: an account is whatever is in it.\n"
  "2. Where a holding has no price, use what was paid for it — never nothing, because a holding priced "
  "at zero would quietly shrink your whole net worth.\n"
  "3. If the broker DOES send a real total, that still wins. We only add it up ourselves when there is "
  "nothing usable to take.\n"
  "4. Only for accounts held in US dollars, and an account that is genuinely empty stays at zero. A "
  "foreign-currency account's holdings are priced in that currency, so adding them up would produce a "
  "dollar figure that is not real; and an empty account is empty, not unknown."),

 'hide the number, keep the shape': (
  "Under hide-balances the odds dial stays fully visible — the percentage and the arc both. Only the "
  "target amount in dollars is dotted out. Hiding your balances is about money figures, not about "
  "whether your plan is working."),

 'one card disagreeing with itself': (
  "A total must equal the lines printed above it, and where they disagree it is the LINES that are right. "
  "The income card showed a household take-home of about $10,442 a month over a take-home line of about "
  "$9,242 — the total was corrected down to the lines."),

 'the tax estimate STAYS FEDERAL': (
  "Our tax estimate covers federal income tax only, and says so on the screen. Three decisions:\n"
  "1. We do not add payroll tax to it. Payroll tax applies to wages, and our gross figure also holds "
  "rent, dividends and bonuses — applying 7.65% to all of that would be wrong, not just rough.\n"
  "2. We do not guess state tax, because it cannot be known without asking.\n"
  "3. We work out the one thing we can, name the gap in dollars, and let you correct it."),

 'a 401(k) is asked only where': (
  "The app asks about a 401(k) only where you could legally have one — that means a wage, or "
  "self-employment earnings. His challenge: \"If someone is not working, how can they contribute to "
  "401K?\" They cannot. A pension, Social Security, rent or dividends give nobody the right to "
  "contribute, so the question is not asked of someone with no earned income."),

 'Every statutory constant is typed in from its PUBLISHED source': (
  "Every figure set by law is typed in from the published source — the IRS or the SSA — and never "
  "from our own constants. It came from his question of how he can trust the formulas given how many "
  "errors his reviews find; the answer was to stop checking the code against itself. The first run "
  "against the published figures found three errors: the IRA limits were a year out of date, the "
  "bigger catch-up allowance for ages 60 to 63 was missing entirely in an app built for ages 55 to 70, "
  "and four of the required-withdrawal divisors were slightly wrong."),

 'interest and dividends': (
  "Interest and dividends are taxed but are not money you can spend, unless you tell us they reach your "
  "bank. Two decisions:\n"
  "1. In most accounts they are reinvested where they are earned and never arrive, so they are taken out "
  "of your spendable take-home.\n"
  "2. The tax on them still comes out, because it is real — so simply deleting them would have been "
  "wrong in the other direction."),

 'TWO TOTALS, NEVER ONE': (
  "The income screen shows two totals and labels each: what lands in your bank each month, and what the "
  "year is taxed on. They are different numbers about the same wages. Mixing them is how a take-home "
  "figure comes to include a bonus nobody has been paid yet."),

 'audit` folder and type': (
  "Records of checking the work get their own folder. His ruling: checking the work is its own kind of "
  "paper. Filing a device-test sheet under the standards folder hid the record of what had been verified "
  "against which build."),

 'Always use same words': (
  "One word per concept in everything a person can read. His words: \"Always use same words to describe "
  "same thing in the app. There is no score for creative writing use different terms to describe same "
  "thing.\" Two words for one thing read as two different numbers. A test reads the agreed list and fails "
  "the build on any retired word."),

 '~400 market simulations': (
  "The screens said the plan was tested against about 400 possible futures. It had been 1,000 since an "
  "earlier fix, and the screens were never updated. The number on screen must be the number the "
  "calculation actually ran."),

 'card ADDS UP': (
  "The pay card's own rows must add up: your gross pay, minus tax, minus your 401(k) contributions, "
  "equals your take-home — to the dollar, with a 401(k) row shown. It came from his first device pass, "
  "where the card contradicted itself because each earner was being given the whole married-couple tax "
  "allowance separately."),

 'What-if (Look ahead) redesigned': (
  "The Look ahead screen — “What if I save more?” — was redrawn. Three decisions:\n"
  "1. Your age and the age you plan to retire are set with sliders on the screen itself, not on a "
  "separate page, and they save to the same two answers the rest of the app reads.\n"
  "2. The difference the extra saving makes, and the projected nest egg, each carry a tappable “i” "
  "that explains where the figure comes from.\n"
  "3. The screen no longer asks you to fill in your plan first before it will show you anything."),

 # THIS ROW IS SPLIT IN TWO, and the text below is NOT what either half shows. DEC-0002 held the
 # four-tab architecture (in force) AND the third tab's name "Spending" (replaced by his Expenses
 # ruling of 2026-09-03). On his instruction — "split DEC - 0002" — each half's wording now comes
 # from moneykeel_decisions_splits.json and overwrites what is here.
 #
 # SO WHY IS IT STILL HERE? Because the decision's KEY is computed from this text, and a key is what
 # tells the next sweep the row is already recorded. Deleting it on 2026-09-30 changed the key, the
 # changelog sweep stopped recognising the row, re-added it as a new decision (DEC-0517) and DEC-0002b
 # was lost. Nothing reads this as copy; it is the row's identity. Leave it.
 'THE CASH FLOW SURFACE': (
  "Cash flow becomes ONE screen with four tabs — This month, Income, Spending, Debts — replacing the "
  "two separate Cash flow and Budget screens. Four decisions:\n"
  "1. The Budget screen is retired; its job is now the Spending tab.\n"
  "2. Income is entered through a pop-up that asks whether your pay is steady or varies.\n"
  "3. You can move between past and future months.\n"
  "4. Big one-off bills get their own “big-ticket” list, so a bill that lands once a year is not lost "
  "inside a monthly average."),

 'Which 12 months are you entering?': (
  "When you enter a year of income, the app asks which twelve months you mean — the calendar year, or "
  "the next twelve months from now. Three decisions:\n"
  "1. Every month you enter carries its own month AND year, so entering across a New Year does not "
  "overwrite the wrong month.\n"
  "2. Both ways of asking write to the same twelve calendar slots underneath, so the answer means the "
  "same thing however it was entered.\n"
  "3. When a receipt is scanned, the total is read from the total — never from a line about how it was "
  "paid, which is not what you spent."),

 'Spending tab conformance': (
  "The Spending tab shows the month’s total at the top, then each recent expense with a small label "
  "saying where it came from — entered by hand, or imported. Two decisions:\n"
  "1. A card compares each category against what you planned to spend on it.\n"
  "2. On day one the tab shows three doors to get started rather than an empty screen."),

 'Empty-state odds strip RESOLVED': (
  "On a brand-new account, the Home screen shows a locked EXAMPLE of the odds dial — “Sample: 84% to "
  "age 92” — so you can see what the screen will look like once your own numbers are in. The "
  "alternative design, which invited you to answer three questions instead, is dropped."),

 'Disconnect promise UNIFIED': (
  "When you disconnect a linked bank or broker, the app asks you to choose: keep the numbers as an "
  "account you maintain by hand, or delete the connection’s data. The same promise is stated in the "
  "consent screen, in Settings and on the account page — one promise, worded the same everywhere, so "
  "disconnecting never quietly loses your history."),

 'Emergency-cushion card': (
  "The emergency fund card — “X months of essentials” — comes back into scope on the Net worth "
  "screen, below the main figures. It is drawn as a mock and approved before any code is written."),

 # REWRITTEN 2026-09-30, on his question: "is this an exception? As we already have approved standards
 # for fonts - 20 for heading, and so forth." It read as a new exception and it is not one — it is his
 # OWN amendment of 2026-07-15, already on the screen-design standard, applied to two named tables
 # thirteen days later. My wording never said so, and it named a list the app no longer has.
 'Type-size question CLOSED': (
  "NOT A NEW EXCEPTION — this applies the money-size rule already on the standard. That rule is his own "
  "amendment of 2026-07-15: a money figure is at least 17 points, and a REFERENCE TABLE may use 12 to "
  "15 points. On 2026-07-28 he closed the question of which tables count: a dense table of holdings "
  "keeps its smaller size, because twenty rows at hero size cannot be read. The 17-point floor applies "
  "to the big headline figures and to money standing on its own.\n"
  "IT DOES NOT TOUCH THE 20-POINT HEADING RULE, which is a different decision about titles, and it is "
  "not an exception to the type scale either: 13 and 15 are both steps on the scale "
  "(11 · 13 · 15 · 17 · 20 · 24 · 30 · 38).\n"
  "ONE LIST IT NAMED IS GONE: the original row cited \"the winners and laggards list\", which the "
  "Performance design he approved on 2026-09-25 (mock v14) removed. The holdings table on an account's "
  "page is the live example."),

 'Legacy modules (Estate, Insurance': (
  "Estate, Insurance, Tax organizer, Job safety and Credit STAY in the first launch. They are not cut: "
  "each remains a row on the launch sign-off list and each has to pass it."),

 'Chart colors: the UX doc': (
  "Every chart in the app moves to one colour set, checked to be readable by people who are "
  "colourblind — so Cash is the same colour everywhere it appears. Two decisions:\n"
  "1. Every affected chart is redrawn in the new colours as a picture first.\n"
  "2. Nothing changes in the app until those pictures are approved."),

 'STANDING RULE ADOPTED': (
  "A STANDING RULE: every approval he gives gets a dated row in the design Changelog the same day, "
  "beside the mock it approves. An approval that lives only in a conversation is lost."),

 'BUILD-46 PAYLOAD BUILT': (
  "All sixteen items on the build-46 walk approved at once — his words, “build all 16” — and each "
  "built with a test that pins it. Among them: the Social Security odds use the age you actually claim "
  "at on every screen; a holding with no price shows what you paid rather than nothing; a sale of a "
  "bond or another investment writes a record of the sale; one formula for the market average, used "
  "everywhere; and shares that vest land in the month they vest on every screen."),

 'BUILD-47 WALK BUILT': (
  "All twenty-five items on the build-47 walk approved at once — his words, “Approve all 25” — and "
  "each built with a test that pins it. Among them: an honest cap on HSA contributions; claiming "
  "Social Security now at 68 or 69; the required-withdrawal card checks whether you have already "
  "taken it; bond and other-investment editors record the date a value was true; and one shared "
  "component for the five big headline figures, so hidden balances cannot leak through one of them."),

 'VALIDATED COLOR PALETTES ADOPTED': (
  "He said yes to the final chart palette, so the app adopts it: a fixed colour per asset class — "
  "stocks blue, cash green, real estate amber, bonds indigo, other investments orange, personal "
  "property pink, mixed grey — chosen and checked to be distinguishable by colourblind readers. "
  "COLOURS ONLY: no layout, wording or number changed with them, which was the mock’s own condition."),

 'STALENESS STAMPS BUILT': (
  "When a linked account’s figures are three or more days old, the Home and Net worth headline boxes "
  "carry one amber line inside the box naming the institution, the date the figures are from, how many "
  "days old that is, and how to refresh. It sits left-aligned with the lines around it, and it appears "
  "INSIDE the box rather than beside it — his change to the approved mock."),

 'MOCK-BATCH VERDICT ROUND BUILT': (
  "A round of mock decisions, each answered. Four of them:\n"
  "1. The separator dot between two facts uses the DARKER version — his pick, for eyes between 55 and "
  "70.\n"
  "2. Net worth rows carry a small label saying where each figure came from.\n"
  "3. A bond that has matured shows a banner, and marking it paid out writes a record of the payment.\n"
  "4. “Add” and “Record” become a chooser that opens the real editor for the thing you picked, with "
  "its own fields — rather than one form pretending to fit everything."),

 'LOADING/OFFLINE DECIDED+BUILT': (
  "Two decisions about what you see before the app has its data:\n"
  "1. When a refresh fails, Home says so in a banner, states honestly how old the figures are, and "
  "clears itself when the next refresh works.\n"
  "2. The grey loading bars in the mock are REJECTED — his question about them was right. Instead no "
  "screen draws at all until the data is ready. It takes under a second and it stops the flash of "
  "empty screens on a cold start."),

 'B47 WALK FINDINGS 1-2 FIXED': (
  "Two findings from his walk of build 47:\n"
  "1. The company-share editor gains a field for the ticker symbol, which fetches the live price to "
  "start you off and stays editable.\n"
  "2. It gains a real Done button at the bottom. The link at the top of the screen was invisible from "
  "the end of a long form, and the form says it saves as you type."),

 'ONE debt editor shaped by repayment': (
  "One debt editor, not two, and it changes shape according to how the debt is repaid. Three shapes:\n"
  "1. A loan with fixed payments asks for the payment OR the date it will be paid off — each works "
  "out the other.\n"
  "2. A credit card asks for the minimum and what you actually pay.\n"
  "3. A debt due in one lump asks for the amount and the date, and that then appears in cash flow and "
  "on the bill calendar as a dated bill. This replaces two debt forms that had drifted apart."),

 'Coasting box copy': (
  "The “where you stand” box says one sentence per situation, in plain terms: either today’s savings "
  "alone get you there by a given age, or they do not get you there even by 80. It also names the "
  "growth rate it assumed, so the sentence can be checked."),

 'Full page rebuilt to mock v2: price hero': (
  "The page for a single holding was rebuilt. Three decisions:\n"
  "1. The price leads, with a graph under it and buttons to change the period shown.\n"
  "2. Everything else — the position, how it compares, the lots you bought, dividends, gains and tax "
  "— is laid out as one kind of table, so the page reads the same way all the way down.\n"
  "3. When a holding has no price, the headline shows what you PAID instead, to three decimal places "
  "for the average — never a made-up value."),

 'All cash-bucket account types merge under one group header': (
  "In the By type view of Net worth, everything that is effectively cash sits under ONE heading: "
  "“Cash and cash equivalents”. Before, a CD, a money-market fund and plain cash each had their own "
  "heading, which made three small groups of the same thing."),

 'Decision-row grammar: every row a complete first-person question': (
  "Every row on the Plan screen is a complete question in your own voice: “When can I retire?”, "
  "“Can I afford it?”, “When should I claim Social Security?”, “Which account do I draw from first?”, "
  "“Is a Roth move worth it?”, “Can I spend more?”. He dropped the word “all” from the second one."),

 'FULL REDESIGN BUILT to mock v9': (
  "The whole Plan screen rebuilt to the approved mock — his words, “all mock up approved”. Four "
  "decisions:\n"
  "1. Each question gets a verdict on a sliding scale, with the condition it depends on said out loud.\n"
  "2. ONE dated “next decision” card, and a required withdrawal outranks a Social Security window.\n"
  "3. The retirement-paycheck card uses the same calculation as Home, so the two cannot disagree.\n"
  "4. The first-day door counts only the answers actually missing, and credits the accounts you have "
  "already added."),

 'What big costs are coming?" feature APPROVED': (
  "The “What big costs are coming?” feature is approved, and the screen for entering those costs is "
  "drawn as a mock. The screen builds on its approval, and the row on the Plan screen arrives with it."),

 'Orphan/legacy screens (income-detail': (
  "The older screens that nothing currently links to — the income detail page, the previous income, "
  "invest and savings screens, Tips and Rewards — are KEPT rather than deleted, because they are "
  "reusable if the app is later built for a different age group. The menu is unchanged."),

 'big-costs-v1 capture mock APPROVED': (
  "The mock for entering big upcoming costs is approved. The entry screen, the effect on the "
  "projection and the row on the Plan screen all build into build 48."),

 'ONE adopt verb': (
  "One phrase for taking a suggestion, everywhere in the app: “Use as my plan”. Swept the same day, so "
  "no screen is left saying it differently."),

 'Look-back card KEPT on the holding page': (
  "The “what if I had moved this money” card stays on the holding page. It was missing from the mock, "
  "and that was a gap in the drawing rather than a decision to remove it."),

 '"Remind me" at the claim window': (
  "A “Remind me” option at the Social Security claiming window builds into build 48, using the "
  "reminder machinery already in the app."),

 'Advice voice SOFTENED': (
  "The voice on Stress test, Insights and Tips changes from telling you what to do to stating a fact "
  "and offering a choice. Anything of the “set this as a goal” kind is removed — the app says what "
  "is true and lets you decide."),

 'Rewards, Tips, Build-credit tiles LEAVE': (
  "Rewards, Tips and Build credit come OFF the menu for the 55-to-70 audience. College planner and "
  "Estate stay. Nothing is deleted from the code — the screens remain, they are just not offered to "
  "this audience."),

 'Goal-offtrack insight': (
  "Two decisions: the insight that tells you a goal has fallen behind, with its “Add something else” "
  "link, builds into build 48. The breakdown of where an investment return came from is drawn as a "
  "mock first and built later."),

 'STEPPERS stay': (
  "The plus-and-minus steppers stay, rather than becoming sliders, because someone aged 65 and over "
  "needs to land on an exact figure. The design sheet is updated to match what is built."),

 '4%-guideline heads-up REWORDED': (
  "The warning about drawing more than about 4% a year is reworded to be about YOUR numbers rather "
  "than a rule of thumb: “above what your own numbers support long-term”."),

 'PROVIDER PIVOT: SnapTrade OUT': (
  "SnapTrade is dropped as the way accounts are linked, and Plaid is taken up for the beta. The reason "
  "is privacy: he saw connected financial data displayed inside SnapTrade’s own dashboard. The "
  "migration is the next piece of work AFTER build 48, and the app is built so the provider can be "
  "swapped without the rest changing. It also unlocks importing credit-card transactions."),

 'Provider pivot ON HOLD': (
  "The provider change is put ON HOLD while he evaluates Plaid, SnapTrade and Teller himself. No code "
  "and no dependency changes in the meantime — nothing is built on a choice not yet made."),

 '+Expense floating button removed from Home': (
  "The floating “+Expense” button comes off the Home screen. Logging an expense lives on Cash flow "
  "only, so there is one place to do it."),

 'CHIEF OF STAFF': (
  "The Home section that lists what needs your attention is headed “CHIEF OF STAFF — WHAT NEEDS YOU”, "
  "with the number of items in brackets."),

 'Return breakdown BUILT to approved mock': (
  "Under the total return for a period, the app shows what made it up: price change, gains you took, "
  "dividends and interest. Two decisions:\n"
  "1. It shows only the parts it actually has records for, rather than filling gaps.\n"
  "2. The figures come from the record of money movements only — nothing is estimated."),

 '"Everything you own and owe, in one place': (
  "The first line of the setup screen is rewritten to name what “your money picture” actually means: "
  "accounts, your home and other property, and debts — one live view. The earlier wording, “Map your "
  "whole money picture”, said nothing concrete. "),

 'First bullet FINAL: "All your assets and debts in one place"': (
  "His own wording for the first line of the setup screen: “All your assets and debts in one place”. "
  "It replaces the own-and-owe version chosen earlier the same day."),

 'First bullet CLOSED': (
  "The first line of the setup screen, settled: “All your assets and debts in one place — accounts "
  "(investment, 401k, checking, savings), your home and other property, and every debt (mortgage, "
  "cards, loans) — one live view.” His wording, with the examples named so nobody has to guess what "
  "counts."),

 'Private equity + Hedge funds OUT of phase 1': (
  "Private equity and hedge funds come OUT of the first phase — his instruction, keep it simple. They "
  "are removed from the options you can pick when adding an investment, but the app still understands "
  "them, so anything already saved as one still shows correctly."),

 'The Invest tab is renamed PERFORMANCE': (
  "The Invest tab is renamed PERFORMANCE, so the pair reads Net worth and Performance — his pick. It "
  "changes in one place and sweeps the bottom bar, the menu and the desktop sidebar together."),

 'BY TYPE view REMOVED': (
  "Three decisions about the Net worth screen:\n"
  "1. The By type view is REMOVED, which settles the open question about it.\n"
  "2. What you own is restructured into three big groups — Cash, Investments, Personal property — with "
  "the detailed classes as rows inside them.\n"
  "3. Two ways of grouping remain: By category and By institution. The Investments total is the same "
  "figure as the Performance total, by definition, so the two screens cannot disagree."),

 '"Your path ahead (from your Plan)" renamed': (
  "The Net worth section “Your path ahead (from your Plan)” is renamed “Your retirement plan” — his "
  "wording."),

 'Retirement verdict wording: working': (
  "The retirement verdict is one sentence, and the wording differs depending on whether you are still "
  "working or already retired. Two decisions:\n"
  "1. Working: “Likely — retire at 65 with about [pot], lasting past 92 with about [leftover] to "
  "spare.” Retired: “Holding — on course to last past 92, about [leftover] to spare.”\n"
  "2. The sentence appears ONLY when the chance is 80% or better, and every number in it is the middle "
  "outcome of the same simulation the odds come from — so the sentence and the percentage can never "
  "tell different stories."),

 'BANDED SECTIONS ADOPTED': (
  "Section headings become dark-green bands with white capitals, and groups inside them get a lighter "
  "green sub-band — his words on the mock, “I like this”. He then ordered the pattern applied to ALL "
  "screens, not just the one it was drawn on."),

 'CLASSIFICATION RULE: cash = cash only': (
  "Cash means cash only. Three decisions:\n"
  "1. A money-market fund is classed as Stocks and funds, not cash — it pays dividends.\n"
  "2. A CD or a Treasury bill is classed as Bonds and CDs, whatever its maturity — it pays interest.\n"
  "3. This replaces the earlier rules that treated money-market funds as cash and split CDs by whether "
  "they ran twelve months. A CD’s interest is its balance times its stated rate."),

 'collapsed counts on a quiet 2nd line': (
  "Three refinements to the Net worth screen: a collapsed group shows its count on a quieter second "
  "line; there is at least 16 pixels of space before a column of numbers; and every label on the "
  "doughnut is the same weight."),

 'Banded sections BUILT on the five tab screens': (
  "The green section bands are built on all five main screens, from ONE shared piece of screen rather "
  "than five copies — so the next change to a band changes every band. Section totals sit on the band "
  "itself, and entry screens use the lighter sub-band. The roughly 25 detail screens follow next."),

 'NW change PERCENT re-based': (
  "The percentage change on Net worth is measured on cash plus investments, NOT on your whole net "
  "worth. Three decisions:\n"
  "1. The line names its own base, so it reads “+0.5% on cash + investments” — a house and a mortgage "
  "have no market price, and including them makes a percentage that means nothing.\n"
  "2. The dollar change still covers the whole net worth.\n"
  "3. A daily record of cash plus investments is now kept, and the percentage appears only once that "
  "history exists — never guessed backwards from today."),

 'EMPTY-STATE RULE adopted': (
  "On a brand-new account, a screen keeps its full layout and shows $0 with a door to add your "
  "figures — rather than a blank screen or a different design. The one exception is the retirement "
  "view, which shows the sample gauge used on Home, everywhere in the app."),

 'Value-walk structure APPROVED': (
  "The list that explains how a value moved is approved for both Net worth and Performance, in this "
  "order: beginning value, plus what you paid in, minus what you took out, then WEALTH GENERATED as a "
  "group (dividends, interest, change in investment value), then the ending value. On the Net worth "
  "version the wording says “net worth” rather than market value, because a home and a mortgage have "
  "no market price feed."),

 'FIFTH INGREDIENT CHECK built': (
  "Each linked or imported account records how far back its source’s history actually reaches, taken "
  "from the dates on the records themselves, and that depth only ever grows. Where a figure’s window "
  "goes back further than the source shared, the app says so in one plain sentence — for example that "
  "the broker only shared three months — rather than presenting a twelve-month figure built on three."),

 'Scoping rule for the depth sentence': (
  "The sentence about how far back a source’s history reaches appears ONLY where it matters: on a "
  "twelve-month income figure, yes; on a one-day change, no. Otherwise it would imply that older "
  "income is hidden inside a number that covers one day. Also: every number on the walk sheet shares "
  "one right-hand edge."),

 'CONSISTENCY SWEEP: every fontSize': (
  "Every text size in the app snaps to one scale — 11, 13, 15, 17, 20, 24, 30, 38 — with ties rounded "
  "UP for readability at 55 to 70. That changed 622 sizes across 70 files. Hard-coded whites were "
  "replaced with the theme’s own colours in 42 files, and two tests were added so the drift cannot "
  "come back."),

 'FINAL design BUILT (part 1): three uber-groups': (
  "The Net worth screen is built to its final design: three groups — Cash, Investments, Personal "
  "property — as light-green bars you can collapse, each carrying its total, with the detailed asset "
  "classes as rows inside. The class doughnut returns to the screen, in the approved colours, with each "
  "slice labelled directly and a tap area big enough to use."),

 'MISSING-DATA BANNER + FIX-IT SHEET BUILT': (
  "When something is missing from your figures, the screen says so in a line inside the page — never a "
  "pop-up. Two decisions:\n"
  "1. Five things count as a gap: a holding with no price, a connection that has stopped updating, no "
  "dividend records, a hand-entered value that is now old, and a source that shared less history than "
  "the figure covers.\n"
  "2. The banner counts and NAMES each gap, and tapping it opens a sheet that fixes them."),

 'CHANGE WALK SHEET BUILT (final mock State E)': (
  "Tapping the change figure on Net worth opens a list showing exactly how it moved: beginning net "
  "worth, what you paid in, what you took out, wealth generated (dividends, interest, change in "
  "investment value), the debt principal you paid off, and the ending figure. The rows always add up to "
  "the end figure — anything the records cannot explain is shown as its own line rather than quietly "
  "dropped."),

 'FINAL design part 1 BUILT: SUMMARY trio': (
  "Performance is built to its final design. Two decisions:\n"
  "1. Three figures lead: the ending value, the wealth generated, and the return — with a plain "
  "sentence saying the return is for the window you picked, is not a yearly rate, and that money you "
  "added never counts as return.\n"
  "2. Under them, the value walk in the approved order, so the beginning becomes the ending line by "
  "line."),

 'FINAL design part 2 BUILT: period chips': (
  "Three decisions on Performance:\n"
  "1. Each period button carries its OWN return for that period.\n"
  "2. Where a period has no data it shows a dash rather than a zero, and the row wraps to two lines "
  "rather than squeezing.\n"
  "3. A table shows what each category earned and its return, from the records only — and it does not "
  "appear at all when nothing was received, rather than showing a table of zeros."),

 'PERFORMANCE COMPLETE: per-account collapsible walks': (
  "Each account gets its own value walk, from the same calculation as the all-accounts one. It is "
  "collapsed by default with a one-line summary of the wealth it generated, opens to the full list, and "
  "is hidden entirely when you have only one account — where it would just repeat the total."),

 'HERO CORRECTIONS BUILT to the founder': (
  "Three corrections to the Net worth headline, from his notes:\n"
  "1. The green title bar carries only the “i” — the date came off it and now appears once, on the "
  "line saying what the change is measured from.\n"
  "2. The small trend line under the headline is DELETED — his words, “the green line at the bottom”.\n"
  "3. The change line is corrected to match."),

 'THE FLAT LEDGER BUILT': (
  "What you own and what you owe leave their separate floating cards and become one continuous table. "
  "Three decisions:\n"
  "1. The green bands run edge to edge.\n"
  "2. Every row sits at the same inset, so the numbers line up down the page.\n"
  "3. Every row — bands included — reserves the same space, so nothing shifts as sections open and "
  "close."),

 'DONUT LABELS ON THE CHART': (
  "Each slice of the doughnut big enough to name carries its name, its percentage and its colour swatch "
  "beside the ring, placed at that slice’s own angle. A slice too small to label without overlapping is "
  "named on a line underneath — not dropped, because a slice with no label is a figure nobody can read."),

 'BY INSTITUTION REBUILT': (
  "The By institution view is rebuilt to work the same way as By category. Four decisions:\n"
  "1. Institution groups collapse and expand.\n"
  "2. Each remembers its own open or closed state — closing Vanguard in one view does not close "
  "Investments in the other.\n"
  "3. They sort biggest first.\n"
  "4. A closed group shows how many accounts are inside it."),

 'SIX DEFECTS FOUND AND FIXED during the rebuild audit': (
  "Six defects found while auditing the rebuild, and fixed. Among them: two buttons pointed at screens "
  "that do not exist — “Connect a brokerage” on the first-day screen and “Update the value” in the "
  "fix-it sheet — so both quietly bounced you back to Home. A test was added so a button pointing at a "
  "screen that does not exist fails the build."),

 'COMPOSITION BAR REPLACES THE DONUT': (
  "His decision: “add both. Bar replaces donut.” The doughnut and its labels are removed from What you "
  "own, and in its place is one thin stacked bar with a legend naming every slice and its percentage."),

 'CATEGORIES READ BIGGEST FIRST': (
  "His decision: categories read biggest first — in the stacked bar AND in the list beneath it, so the "
  "picture and the rows tell the same story in the same order. Inside Investments that puts Stocks and "
  "ETFs above Bonds and CDs."),

 "THIS MONTH'S CASH FLOW\" ROW DELETED": (
  "His decision: “Keep add or connect an account. Delete cashflow.” The “this month’s cash flow” row "
  "comes off Net worth, and the code behind it goes with it. The one add-or-connect button stays — it "
  "is this screen’s only way to add something."),

 'GROUPING BUTTONS NOW SHOW ON THE FIRST-DAY SCREEN': (
  "His decision, in his words: “it will give user view of what they can do in the app.” The grouping "
  "buttons appear even on a brand-new account with nothing in it. They render from the SAME control the "
  "full screen uses, so the two can never drift apart."),

 'TWO DECISIONS CONFIRMED WITH NO CODE CHANGE': (
  "Two things confirmed as already right, with nothing to change:\n"
  "1. The headline keeps its white card with the deep-green band and the green number — the "
  "solid-green version from the design handoff was declined.\n"
  "2. The cash row keeps the real account name, with “cash in this account” beneath it."),

 "TODAY'S DATE RETURNS TO THE HERO TITLE BAR": (
  "At his request the date comes back to the Net worth title bar, which reads “YOUR NET WORTH · AUG 11, "
  "2026” and stamps the day the figures are true as of. It does NOT replace the line below, which names "
  "the day the CHANGE is measured from — two different dates, both needed."),

 'ONE TITLING TREATMENT FOR THE WHOLE SCREEN': (
  "At his request every section of Net worth is titled the same way: the headline and the retirement "
  "plan leave their floating cards and wear the same full-width deep-green banner as What you own, What "
  "you owe and the emergency fund — five sections, one kind of bar, each running flush to the edges."),

 'BUILD 51 CUT': (
  "Build 51 was cut only after his explicit “cut the build” against a presented checklist, with the "
  "gates satisfied in order: scope complete at 59 of 59 rows, and the mock-match audits FINISHED rather "
  "than running alongside."),

 'GREEN TITLE BARS ARE SQUARE': (
  "At his request the green section titles have square corners — the rounded top corners are gone, so "
  "each one is a straight rule running edge to edge rather than the lid of a card. One change to the "
  "shared piece of screen, so it lands on all 29 or more banded screens at once."),

 'ONE ACCOUNT-NAMING RULE ADOPTED': (
  "One rule for naming an account, used everywhere an account is named: the institution followed by the "
  "last four digits — “Vanguard -5738”. The broker’s own wording is never shown when we have the "
  "digits. "),

 'THE "SYNC NOW" BUTTON NOW SYNCS': (
  "The “Sync now” button now syncs. It used to NAVIGATE to the account page, which has no sync control "
  "on it — so a button labelled Sync now synced nothing and left you on a page that could not help. It "
  "runs the sync where you are and says it is syncing."),

 'A DEAD CONNECTION CAN NOW SAY IT IS DEAD': (
  "A broken connection now says it is broken. A failure on one account was being noted only in the "
  "developer log, so a dead connection and a healthy quiet one looked identical — same “connected” "
  "label, same unchanging date. Failures are now recorded against the account and shown."),

 'THE NAMING RULE REFINED BY THE FOUNDER': (
  "His refinement of the account-naming rule, recorded in the requirements. Three decisions:\n"
  "1. A taxable account is the institution plus the last four digits — “Vanguard -5738”.\n"
  "2. With no digits it is the institution plus the kind of account — “Vanguard Brokerage”, “Chase "
  "Checking”, “Ally Savings”.\n"
  "3. Two accounts that would read the same are numbered, so no two rows are indistinguishable."),

 'THE RETIREMENT CARD NO LONGER GOES QUIET': (
  "The retirement card must give you its verdict even when the news is bad. It used to show nothing "
  "below an 80% chance, so both Net worth and the Plan screen fell back to a bare “See your plan” — the "
  "app went silent at exactly the moment you needed telling."),

 'PORTFOLIO RISK IS NOW MEASURED, NOT GUESSED': (
  "How much your investments swing up and down is now measured from what you actually hold, instead of "
  "being guessed from the return. The old rule of thumb called a savings account 5% volatile and could "
  "not tell the difference between bonds and shares — which makes the odds meaningless."),

 'SAMPLE + ASK, IN EVERY PARTIAL CASE': (
  "His rule: where an answer is missing, show the SAMPLE and ASK for it. The retirement verdict needs "
  "three answers — your age, what you spend, and what you have earmarked for retirement. Missing any "
  "one of them used to leave a bare “See your plan”, which neither explains nor asks."),

 'THE ⓘ NOW EXPLAINS THE WHOLE METHOD IN PLAIN ENGLISH': (
  "The “i” beside the odds explains the whole method in plain English, for someone who does not follow "
  "finance: that we play your retirement out 500 times and count how often the money lasts, and what "
  "the technical name for that actually means."),

 'THE ACTUAL NUMBERS ADDED TO THE INFO DOT': (
  "At his request the explanation names every FIGURE it assumes, not just the categories — shares at "
  "10.4% over 30 years, a 60/40 retirement mix at 7.9%, a brokerage at 8%. An assumption you cannot see "
  "the number for cannot be argued with."),

 'THE BAR FOLLOWS THE TOGGLE': (
  "The stacked bar follows whichever grouping you picked. It stayed grouped by category even on the By "
  "institution tab, so the picture and the list underneath answered different questions."),

 'THE SUB-LINE COUNTS INSTEAD OF REPEATING': (
  "The line under an account counts what is actually in it — “3 CDs and 1 Treasury in this account” — "
  "instead of repeating the heading above it, which already said Bonds and CDs."),

 'THE DEBT BAR IS NOW READABLE WITHOUT COLOUR VISION': (
  "The debt bar is readable without colour vision. It alternated red and amber — the exact pair that "
  "red-green colour blindness collapses into one muddy tone. It now uses ONE colour in four clearly "
  "different lightnesses, so the bands are told apart by brightness rather than by hue."),

 'THE 2026-08-04 RULE NOW HOLDS AT THE LIVE CLASSIFICATION POINT': (
  "The cash-means-cash rule now holds where accounts are classified as they arrive, not only in the "
  "one-off tidy-up of existing data. A holding was being classed purely by the tag the broker sends, and "
  "brokers tag both money-market funds and CDs as cash — so a position added after the tidy-up landed "
  "back in Cash. The same defect as the original, mirrored in time."),

 'ONE SIZE FOR EVERY MONEY FIGURE, AND A REAL RIGHT EDGE': (
  "Two decisions: every money figure on the screen is the same size, with totals in bold — section "
  "totals were smaller than the rows beneath them, so a total read as less important than its parts. "
  "And every number shares one true right-hand edge, totals included."),

 'THREE DEFECTS THE FOUNDER FOUND ON ONE PAGE': (
  "Three defects he found on the account page. The worst: income with no ticker on it was being matched "
  "to EVERY holding that was not a share, so the whole account’s untickered income was pinned onto each "
  "row — a CD appeared to pay dividends, which a CD cannot do, and two CDs showed the same figure "
  "twice. Untickered income is real and is counted at the ACCOUNT level, where it belongs."),

 'THE LEFTOVER IS CASH, NOT MORE OF THE BIGGEST HOLDING': (
  "When a broker’s stated total is more than the holdings it listed, the difference is treated as CASH "
  "— not added to the largest holding. On a CD-heavy account the old rule silently inflated the CDs by "
  "money that was really sitting uninvested."),

 'THE ROOT CAUSE BEHIND THE $500': (
  "A deposit only moves money into an account’s cash if that account HAS a cash figure to move it into. "
  "His Vanguard account lists its holdings individually and had no cash figure, so a $500 deposit "
  "vanished from the balance. The fix is at the root — the account now has somewhere for cash to land."),

 'BUILD 52 CUT': (
  "Build 52 was cut only after his explicit “cut the build” against a presented checklist, and the "
  "build number was read off the FINISHED build rather than guessed. The commit was pushed before the "
  "cut, so the build can be reproduced from the remote."),

 'THREE FIXES BEHIND ONE FOUNDER REPORT': (
  "Three fixes behind one thing he reported. The worst: the sheet ignored what the sync actually "
  "returned and always said “Updated” — so when nothing had refreshed it claimed success while the rows "
  "sat unchanged. A message that lies by omission is worse than no message."),

 'A LINE THAT NAMES AN ANSWER NOW LANDS ON THAT ANSWER': (
  "A line that names a missing answer now takes you to THAT answer. “Add your age and it becomes yours” "
  "went to the Plan screen, whose own “1 answer left” went somewhere else again — two taps, and still "
  "not the field you were asked for."),

 'FOUNDER RULE: everything you own counts toward retirement': (
  "HIS RULE: everything you own counts toward retirement EXCEPT your primary home and your primary car. "
  "So cash counts, because it is money you can spend; a rental counts, because you can sell it; and a "
  "SECOND car counts. Only the home you live in and the car you drive are excluded."),

 'ONE SCREEN, EVERYTHING ON IT, SAME SCREEN EVERYWHERE': (
  "The three-answers screen shows ALL THREE answers, always — never hiding one because it is already "
  "answered — prefilled with what we already hold, with the missing ones first, and the same screen is "
  "used from wherever you arrive. Hiding an answered question makes the screen change shape between "
  "visits."),

 'WHEN ALL THREE ANSWERS EXIST': (
  "Once all three answers exist, Net worth shows the real verdict sentence with its numbers and tapping "
  "the card opens the Plan screen — rather than continuing to ask for something already given."),

 'A BARE ADJECTIVE IS NOT A VERDICT': (
  "A verdict word must carry its number. Net worth was the only screen showing the word alone — Home "
  "said “78% odds of lasting to age 90” and the Plan screen said “84 in 100 paths”, while Net worth said "
  "just “Uncertain”, which tells you nothing you can act on."),

 'THREE SCREENS SAID ONE NUMBER THREE WAYS': (
  "One wording for the odds, everywhere. Home said “78% odds of lasting to age 90”, the Plan screen "
  "“78 in 100 paths last to 90”, and Net worth a bare “Uncertain” — three ways of saying one number, "
  "which reads as three different numbers. His wording is now the only one used."),

 'THE INFO-DOT CARD DID NOT SCROLL': (
  "The explanation card now scrolls. Anything past the bottom of it was simply unreachable, and the "
  "retirement explanation had just grown to several screens long — so most of what it said could not be "
  "read at all."),

 'CLAUDE DESIGN PERFORMANCE HANDOFF received': (
  "The Performance design handoff was received, filed, and checked against the built screen by rendering "
  "the screen and listing every visible string — rather than by looking at both and forming an "
  "impression. What already matched was recorded as matching."),

 'EVERY ACTIVITY ROW NOW SAYS WHERE IT CAME FROM': (
  "Every row in the activity list says where it came from. The list mixed the broker’s own records with "
  "rows you typed and showed them identically — so a $500 deposit mistyped as $5,000 was "
  "indistinguishable from the broker’s own figure."),

 'THE MASTER LIST NOW CARRIES THE DAY': (
  "The master list of what is built now records the day’s work rather than being reconstructed later: "
  "18 built items in five groups, written down the day they were built."),

 'FOUND BY THE END-TO-END WALK': (
  "Home, Net worth and the Plan screen all said “[word] — xx% odds of lasting to age nn”, but the "
  "answers screen — the very screen you land on to FIX your odds — said “0 in 100”. Found by walking "
  "the whole journey end to end rather than testing each screen alone."),

 'THE WHOLE PLAN SURFACE GOES OUT FOR REDESIGN': (
  "The whole Plan surface goes out for redesign BEFORE the next build is cut, rather than being patched. "
  "A brief is written for the designer carrying the app in one page and the approved designs."),

 'FOUNDER SETTLED THE PLAN ARCHITECTURE': (
  "He settled the structure of the Plan screen himself rather than having it explored again: the tab is "
  "TWO sections — your retirement plan, and the decisions. The brief was rewritten to say so, and the "
  "earlier version kept but superseded."),

 'THE WORD IS GONE': (
  "The verdict word is removed. The odds now read “60% odds of lasting to age 90” with nothing in front "
  "of it — no “Likely”, no “Uncertain”. Removed on all seven screens that showed it, so no screen keeps "
  "a word the others have dropped."),

 'HANDOFF IN (Plan-requirements.md': (
  "The designer’s Plan handoff arrived and was reviewed against the code rather than accepted on sight. "
  "What was adopted as drawn is recorded, and so is what was not."),

 'BUILDING THE ENGINE KILLED THE SECOND GAUGE': (
  "Building the calculation removed the need for the second dial. The target is now worked out backwards "
  "— the app finds the pot you would need on your first day of retirement to reach 80% odds — so one "
  "score plus arithmetic says everything two dials were saying."),

 'SECTION 1 IS THE TAB, not a link behind it': (
  "His ruling, “inputs on the tab”: the first section IS the Plan tab, not a link to another screen. The "
  "tab reads: your retirement plan, then the outcome, then what you are on track for, your target and "
  "the shortfall."),

 'THE LAST DUPLICATE IS GONE': (
  "The separate plan-answers screen is DELETED. The Plan tab now carries the two states that screen "
  "existed for, so there is one place to answer rather than two that can disagree."),

 'AUDITED, NOT ASSUMED': (
  "The rebuilt Plan tab was checked against the approved picture line by line — every visible string "
  "from the drawing, every visible string from the rendered screen, and the two lists diffed. Looking at "
  "both and forming an impression is not an audit."),

 'TWO RULINGS. (1) THE TARGET IS TYPED, NOT DERIVED': (
  "Two rulings about the target nest egg:\n"
  "1. It is a figure YOU type, marked as yours — “What’s your target nest egg?” — not one the app "
  "derives and presents as fact.\n"
  "2. The app’s own 80%-odds figure becomes the suggestion you can accept, rather than the answer."),

 "FOUNDER VERDICT ON THE BUILT SCREEN: 'too much information": (
  "His verdict on the built screen: “too much information on one screen” and “the way you designed it is "
  "very confusing.” It goes back to design — and the structure is settled BY HIM rather than explored "
  "again, because exploring it again is what produced the confusion."),

 'WHERE EACH DECISION ROW GOES, SETTLED': (
  "Where each decision row leads, settled: converting to a Roth opens the existing Roth screen, which is "
  "not to be redesigned; when to claim Social Security is answered in the row itself and goes nowhere; "
  "and paying off the mortgage early moves to Cash flow, where the debt is."),

 'ONE RULE FOR DECISION ROWS': (
  "One rule for a decision row: it ANSWERS IN PLACE unless the decision needs more than one thing set. "
  "Paying off the mortgage early and when to claim Social Security are answered in the row; anything "
  "needing several inputs opens its own screen."),

 "FOUND BY THE FOUNDER'S QUESTION 'what's the order": (
  "His question — “what’s the order and how are we determining it?” — found that there was NO rule. "
  "The decision rows were written one after another in whatever order they happened to sit in the file. "
  "They now have an ordering rule."),

 'All 7 drawn states checked (Pat collapsed': (
  "The third design handoff was reviewed against all seven drawn states, and the structure was accepted. "
  "Checked state by state rather than as a whole, because a design is only right in every state."),

 "Founder ruling: 'round up'": (
  "His ruling: “round up”. Both the target and the shortfall are found by hunting for the smallest "
  "amount that clears 80% odds, then rounded UP so they read like human numbers — and rounding up means "
  "the promise the screen makes is true rather than nearly true."),

 "Founder: 'good with recommendation'": (
  "Two things fixed with his agreement. The most useful line on the screen had disappeared — the design "
  "ended the section without it — and it comes back, because the line that tells you what to do next is "
  "the one you came for."),

 "Founder: 'fix it'. June's paycheck": (
  "His instruction: “fix it”. The retirement paycheck showed two bare amounts with NO NAMES beside them "
  "— a bill with the line items blanked out — directly above a note saying it was the same paycheck as "
  "Home. Each amount now says whose money it is."),

 "'if the odds are zero — don't show zero'": (
  "His decision: “if the odds are zero — don’t show zero.” Zero never appears anywhere. In its place, in "
  "the order he approved: an honest sentence first, then the routes that cost nothing, then paid advice."),

 "the three 'things that cost nothing' rows": (
  "He caught that the three “things that cost nothing” rows had arrows pointing nowhere — the same "
  "mistake as the mortgage row, made twice in one session. All three destinations were verified as real "
  "before the rows shipped."),

 "Founder: 'yes to both'": (
  "His answer: “yes to both”. The “Add a big cost” door comes back to the foot of the big one-time "
  "costs section, matching the row the design already drew — a screen that exists and cannot be reached "
  "is a screen nobody has."),

 "Founder: 'fix it now'. The target rows": (
  "His instruction: “fix it now”. The target rows and the target-reaching sentences stand down for "
  "someone already retired. A target is a “will I get there” question; once you are drawing down, the "
  "question is whether it lasts."),

 "'withdrawal should be next to amount you are withdrawing": (
  "His words: “withdrawal should be next to amount you are withdrawing not amount you will spare.” He is "
  "right, and the code confirmed it — the rate is worked out from what you draw, so it belongs beside "
  "that figure and not beside the leftover."),

 "Founder: 'I am good with plan v3'": (
  "The heading rule, approved: a FILLED dark-green band is reserved for a group that carries its own "
  "total on the right. A section without a total gets a quieter capitals label instead. So a filled band "
  "always means “there is a total here”."),

 "'We have built a lot of features but we are missing proper organization'": (
  "His words: “We have built a lot of features but we are missing proper organization.” He asked for a "
  "map of every screen — where each one can be reached from today, and where it should live — so a "
  "screen that is built and reachable from nowhere cannot hide."),

 'Founder read the first version and caught three things': (
  "He read the first screen map and caught three faults. The worst: it printed the internal route names, "
  "which had deliberately never been renamed when the tabs were — so the page looked as though the tab "
  "rename had been forgotten. The map now uses human names and plain-English purposes."),

 'under cashflow I don\'t see spending and debt tabs': (
  "His words: “under cashflow I don’t see spending and debt tabs.” A REAL BLIND SPOT, not a missing "
  "screen: a sub-tab is a state inside a screen rather than a screen of its own, so a map built from "
  "screens could not see it. The map now shows sub-tabs."),

 'FOUNDER FOUND A REAL FLAW IN MY DOCUMENT': (
  "“the latest home screen in last build does not link to insights or sharpen your plan.” Verified in "
  "the code — Home linked to NEITHER. The map was regrouped by where a screen can ACTUALLY be reached "
  "from, rather than by where it was supposed to sit."),

 'label this tab Retire under Plan': (
  "“Since we are going to label this tab Retire under Plan (parent tab). We can drop your retirement "
  "plan heading.” The heading is gone — it sat directly above “WILL MY MONEY LAST?” saying nearly the "
  "same thing twice."),

 "Founder: 'do it'. FACT moves off the light green band": (
  "“do it”. The FACT badge moves off the green tint onto a neutral one. It matters more than a badge "
  "usually would, because FACT means “this is saved” and DRAFT means “you are only trying this” — and "
  "two badges that look alike make a person think a change is saved when it is not."),

 'The sentence that tells someone how much of the required saving fits': (
  "The sentence telling you how much of the saving you need fits somewhere tax-advantaged had been "
  "written and then fed an empty value, so it could never appear at all. It is connected up and now "
  "uses a real figure."),

 "'What drives this? ›' was a single 15pt line": (
  "“What drives this?” was a tap target about 19 points tall against the 44-point minimum that exists "
  "for exactly this audience. Raised to 44. A link too small to hit reliably is a link that is not "
  "there."),

 "'info dot should be the same size as text. Can we do that?'": (
  "“info dot should be the same size as text. Can we do that?” Yes — and it is a better answer than "
  "making it bigger. The dot was a flat 13 points everywhere regardless of the text beside it, so next "
  "to a heading it looked lost and next to small print it looked oversized. It now matches its "
  "neighbour."),

 'height of the info dot circle should match the height of the text': (
  "“the height of the info dot circle should match the height of the text size. that way we are not "
  "stretching height of the row for info dot as that would look unprofessional.” So the dot stays the "
  "size of its text, and the 44-point tap area is achieved by extending the INVISIBLE touch area around "
  "it — the row height never changes."),

 'agree - keep the dials and shrink them': (
  "“agree — keep the dials and shrink them.” This settles a contradiction inside the design handoff "
  "itself, which removed BOTH dials from the expanded view. They stay, smaller."),

 "'Try all three together — one sandbox ›'": (
  "The design ended its bad-odds screen with “Try all three together — one sandbox”, pointing at a "
  "sandbox he had already folded into this tab. The link is dropped — it pointed at a screen that no "
  "longer exists separately."),

 "'IT should show for people between age group 60 and 67'": (
  "“IT should show for people between age group 60 and 67” — then, once I flagged what stopping at 67 "
  "costs, “60 to 70 it is”. THE FLAG THAT CHANGED IT: between 67 and 70 the credit for delaying keeps "
  "building, so ending the decision at 67 hides the years where waiting pays most."),

 "'i like your recommendation.' The v3 handoff ends its age-missing frame": (
  "“i like your recommendation.” The design ended its age-missing screen with “Decisions are hidden "
  "until your odds can be computed.” REJECTED — the decisions list stays visible, because hiding it is "
  "hiding the very thing a person came to see."),

 'Four sub-folders of Claude Design deliveries': (
  "Four folders of design deliveries had accumulated outside the app, all named after net worth because "
  "that was the first screen drawn, though they now also held the Performance and Plan work. One named "
  "home for them, so the newest delivery can be found."),

 'The founder ruled the claim decision belongs to ages 60 to 70': (
  "He ruled the Social Security claim decision belongs to ages 60 to 70. That had been applied on the "
  "Plan tab and NOT in Insights, which still used 62 to under-70 — the same decision behind two "
  "different gates, which is the exact fault the whole one-decision-one-place rule exists to stop. Now "
  "one gate, read from one place."),

 "'yes, I like the text.' The two-version card": (
  "“yes, I like the text.” The Social Security card is approved in two versions: at 60 and 61 it says "
  "the decision is coming up, that you can first claim at 62, and that every year you wait after that "
  "raises the amount — so the card is honest about what you cannot do yet."),

 'The word \"safe\" is swept out of ev': (
  "“do it as one sweep.” The word “safe” is removed from everything a person can read — 34 "
  "replacements across 16 files. “Safe to spend” becomes “LEFT TO SPEND”. Nothing in a plan is safe, "
  "and a word that promises safety is a promise the app cannot keep."),

 "asked what the $5,600 meant": (
  "He read the spend-more row and asked what the $5,600 meant — which found two defects in one line: "
  "the odds shown beside the control were not the odds for the amount the control was set to, and the "
  "figure itself was not labelled. A number on a screen that nobody can name is a defect even when it "
  "is right."),

 'too complex for someone with no finance background': (
  "“too complex for someone with no finance background; put it in simple terms.” The spend-more row was "
  "rewritten in plain English and MOCKED rather than built, per the mock-first rule."),

 "Founder: 'like B and C.'": (
  "“like B and C.” The plain-English version is approved. The row LEADS with the answer — “Yes, about "
  "$1,000 a month more, and nothing changes” — rather than making you read the working first."),

 "let's move Pay off the mortgage early to Cash flow": (
  "“let’s move Pay off the mortgage early to Cash flow · Debt. It does not belong under Retire.” Same "
  "control, drawn in a different place — it only ever sat under Retire because that is where it was "
  "first built."),

 "'It is too harsh.'": (
  "“It is too harsh.” He was reading a line saying a 64-year-old will likely never close a $250,000 gap "
  "by saving $500 a month. He was right twice — it was harsh, and it was also wrong in the reassuring "
  "direction about his odds."),

 'Treasury Fiscal Data': (
  "A LIVE, SILENT BUG. The ten-year Treasury yield was being fetched from a feed that had stopped "
  "working, and the app quietly used a fallback number instead — so a figure presented as today’s market "
  "rate was not. Found only because his mortgage-versus-Treasury comparison depends on that number "
  "being real."),

 'one critical factor is whether the current mortgage rate is higher or lower': (
  "“one critical factor is whether the current mortgage rate is higher or lower than the return on "
  "investment or the 10-year yield — if a person pays off the mortgage versus keeping money in a "
  "10-year Treasury.” So the mortgage decision compares your actual mortgage rate against the yield, "
  "rather than recommending paying it off on principle."),

 'Founder asked what the text will say exactly': (
  "He asked what the text would say EXACTLY. It was written out word for word, in the same sentence "
  "shape whichever way the comparison falls — so nobody can tell from the layout which answer they are "
  "about to get."),

 "Two founder findings on the first screen a person ever sees": (
  "Two findings on the first screen anyone ever sees. One: the top button read “Answer the first "
  "question” without naming what the question was — a button that names no question tells you nothing "
  "about what happens when you press it."),

 'assuming the user knows what these odds mean': (
  "“this is assuming the user knows what these odds mean and how to use it — which is not the case 99% "
  "of the time.” The two hardest screens were rewritten to that instruction: say what the odds mean "
  "before showing one."),

 "'no design created for Goals and Prepare tabs'": (
  "“no design created for Goals and Prepare tabs.” Correct — and OUR instruction caused it: the brief "
  "said Retire was the only tab being redesigned in this pass, which is the wrong thing to tell a "
  "designer when the tabs sit side by side. Goals and Prepare need landing screens too."),

 "'how to avoid this in the next brief?'": (
  "“how to avoid this in the next brief?” The honest answer is that more care would not have helped — "
  "all three errors were written while reading carefully, and two survived several reviews. So every "
  "number in a brief is now either computed by a test or explicitly labelled as his own figure, and a "
  "test fails the build when a brief and the calculation disagree."),

 "'not sure what you want me to check here'": (
  "“not sure what you want me to check here.” He was right and the framing was mine: I put three "
  "options to him as a product decision when it was a technical correction with one right answer. A "
  "correction is not a question."),

 "'Ray 64 — see what waiting is worth?": (
  "“Ray 64 — see what waiting is worth? Where does that take you, as when should I claim Social "
  "Security is below on the same screen.” The question exposed the defect: the headline carried a link "
  "to a decision that was already sitting on the same screen. A headline never carries a door the "
  "decisions list already opens."),

 'CALL IT THE TARGET NEST EGG': (
  "Two naming rules, binding on the whole surface. CALL IT THE TARGET NEST EGG — not “the number you "
  "set”, not “your target”, not “your number”. One name, so it reads as one thing wherever it appears."),

 'good with recommendation': (
  "“good with your recommendation.” The dated “next decision” card is REMOVED. It sat above the "
  "decisions list while that list deliberately left the same item out — so one obligation appeared "
  "twice, in two shapes. The obligation now leads the decisions list itself."),

 "'we can enter target number but give them an opportunity to modify it'": (
  "“we can enter target number but give them an opportunity to modify it. Add this verbiage to the "
  "question.” This closes a live hole: the shipped app filled the target in without ever saying it was "
  "ours or offering to change it — so our assumption was reading as the person’s own answer."),

 'build it, then audit 10 calculations': (
  "“build it, then audit 10 calculations, 10 features, 10 flows, 10 decisions.” The Plan redesign was "
  "built and then audited against 49 checks — the audit is part of the work rather than something that "
  "happens if there is time."),

 'we tell the user we include the mortgage payment for the remaining duration — so we state it': (
  "“we tell the user we include the mortgage payment for the remaining duration — so we state it rather "
  "than asking.” The projection now knows a loan payment STOPS when the loan is paid off, instead of "
  "carrying it forever, and the app says so rather than asking you to work it out."),

 'That settles who owns the loan': (
  "The spending question now EXCLUDES debt payments. It settles who owns the loan: the app does, taken "
  "from the loan record itself, so you never have to remember whether your spending figure already had "
  "the mortgage in it."),

 "Founder said the literal 'cut the build'": (
  "Build 53 was cut only after the literal words “cut the build” against the presented checklist — the "
  "only thing that counts under the release rule. The gates were RE-RUN fresh at the moment of the cut "
  "rather than carried over from earlier in the day."),

 "'we should change ETFs to just Funds to include Mutual funds'": (
  "“we should change ETFs to just Funds to include Mutual funds.” An ETF is one kind of fund, so "
  "someone holding a Vanguard mutual fund was reading a label that did not name what they owned. The "
  "class is renamed Stocks / Funds."),

 'income-end-to-end_v02.html APPROVED': (
  "The income mock is approved: 14 screens in one document, with the 13 earlier income mocks archived "
  "so there is one live file rather than a folder to choose from."),

 'The tax band is produced ONCE, at total income': (
  "Your tax band is worked out ONCE, from your total income, and every screen reads that one figure. "
  "The base-pay screen does not work out a band of its own — a band is set by everything you are taxed "
  "on together, so a screen that sees only your wage would show the wrong one."),

 'is the one live income mock': (
  "One live income mock, with ten superseded versions archived. Where several versions of a design "
  "exist, only one is live — otherwise the next piece of work starts from whichever file was opened "
  "first."),

 'Fifteen function names were each declared in two or more files': (
  "Fifteen calculations were each written in two or more places; now none is. 560 calculations, 560 "
  "distinct names. A second copy of a calculation cannot be fixed by fixing the first — which is how "
  "the same defect kept coming back."),

 'An orchestrator is now MK-': (
  "The one function a screen calls for its question gets its own kind of identifier, so it can be told "
  "apart at a glance from the ordinary calculations underneath it."),

 'every row now carries its function and orchestrator identifiers': (
  "Every row of the cash-flow build plan now carries the identifiers of the calculations behind it and "
  "its own status — so a row can be traced to code rather than read as a promise."),

 'Deleted taxableIncome (MK-CF-F-093)': (
  "The app carried TWO complete tax engines, both live from the same profile on the same day, and one "
  "of them could not read a filing status at all. One is deleted. ZERO numbers moved for a single "
  "filer — the two were identical arithmetic there — and it becomes correct for couples the moment the "
  "filing-status question lands."),

 'Onboarding no longer defines takeHomeMonthly': (
  "Onboarding no longer works out take-home for itself; it reads the one calculation everything else "
  "reads. It had been taxing the full gross and taking the 401(k) off afterwards, while every other "
  "screen took the 401(k) off BEFORE tax — which is what a traditional contribution is. $160 a month "
  "apart, and only for a household with a spouse."),

 'now also reads src/screens, src/components': (
  "The duplicate-calculation test was looking in too few places — it read the calculation code but not "
  "the screens. Widened, it immediately found screens declaring calculations the shared code already "
  "had. A test that looks in too few places is worse than none, because it reports clean and gets "
  "trusted."),

 'salaryByMonth is now a keyed table': (
  "Months are keyed by their actual date rather than by position — “2026-07”, not “slot 7 of twelve”. "
  "The twelve-slot version wrote January into the wrong year whenever the twelve months crossed a New "
  "Year."),

 "the partner's wage is its own block under the SAME field names": (
  "A spouse’s wage becomes its own block, using the SAME field names as your own, and the household "
  "total sums every earner. A household on $84,000 plus $54,000 had been read as $84,000 — one "
  "person’s income against two people’s spending."),

 "Every 'today' stamp in src/ now uses": (
  "Every “today” in the app is the person’s OWN calendar day, not the day in universal time. Converting "
  "local midnight to universal time moves the date back a day anywhere east of Greenwich — which made "
  "every look-back answer “nothing” on a device set to India time."),

 'a signed-in user on /onboarding now stays there': (
  "A signed-in person opening the guided setup now STAYS there. It previously bounced them back to Home "
  "in three of its four states, so the setup was effectively unreachable."),

 "'your tax band, on everything you are taxed on'": (
  "Your tax band is named as being on EVERYTHING you are taxed on — not just your wage. The band reads "
  "every source, so rent and dividends count toward which band you are in."),

 'New moneykeel_metric_register.json (211 identifiers)': (
  "A figure’s identifier is issued once against what the figure IS — its family, the words on the "
  "screen, the underlying number — and never changes. Before, a number was its POSITION in a list, so "
  "inserting one row silently renumbered every figure after it, and 93 audit findings were keyed to "
  "those numbers. A finding would have quietly reattached itself to a different figure."),

 'master` added to the permitted types': (
  "The file-naming standard gains `master` as a permitted type, and the onboarding question count goes "
  "from 37 to 38 for the new filing-status question."),

 'Approved mock income-v4': (
  "The tax rate is shown where the money is, and can be corrected there. The rate could previously only "
  "be changed on a step inside the guided setup — itself unreachable — so the figure driving every "
  "take-home in the app could not be put right where you noticed it was wrong."),

 "'Federal tax bracket' named, 'Estimated federal tax": (
  "The base-pay card names the federal tax bracket, shows the estimated tax in MONEY rather than as a "
  "percentage, and says it assumes the standard deduction. A payslip has dollars on it, not a rate."),

 "We'll use 24% everywhere your take-home matters": (
  "“We’ll use 24% everywhere your take-home matters — cash flow, budget, what’s left over. One-offs "
  "like a Roth conversion still use the tax tables.” The screen promises only what a payslip figure can "
  "answer: a rate off a payslip is an AVERAGE, and four places need the rate on your NEXT dollar."),

 'Three answers in order — TYPED off a payslip': (
  "Where your tax rate comes from, in order: TYPED off your payslip, IMPLIED by what you said lands in "
  "your bank, or OUR estimate — and each one says whose it is on the screen. A person could tell base "
  "pay exactly what lands and every other screen still estimated it, $572 a month apart."),

 'extraIncome gains reinvestedMonthly': (
  "Dividends and interest come OUT of your spendable take-home, because in most accounts they are "
  "reinvested where they are earned and never reach your bank. The onboarding screen asks “Does this "
  "reach your bank?” and says what the answer means."),

 'one line per account showing the working': (
  "What each account pays you is worked out once, per account, with the working shown line by line — so "
  "the coupons you received are no longer ADDED to the coupons you were expecting."),

 'salaryGrossByMonth no longer inverts the tax schedule': (
  "When you type your take-home instead of your gross, it is converted ONCE on the way in and stored. "
  "The old code re-ran the tax schedule backwards on EVERY read to find a gross that would produce your "
  "figure — a guess laid on top of an estimate."),

 'route /income-summary, reached from the Cash flow Income tab': (
  "A new screen showing all your income: two totals, labelled — what lands in your bank each month, and "
  "what the year is taxed on. A fresh account keeps both headings and shows no invented $0."),

 "income_salary now renders BasePayScreen with frame='onboarding'": (
  "The base-pay step in the guided setup IS the base-pay screen — one piece of screen, two frames — so "
  "the questions cannot drift apart between the two places you can answer them. It saves as you type "
  "rather than on a Save button the setup never shows."),

 "the bond's value_as_of was pinned to 2026-03-03": (
  "NOT A DECISION OF HIS — recorded here because the changelog row is marked as approved and it is not. "
  "It was my own fix: a test pinned a date and asserted the value was fresh, so it aged past the "
  "six-month line on 1 September and started failing on the calendar rather than on the code."),

 'the complete IRS Uniform Lifetime Table': (
  "Every figure set by law is typed in from the published source. The first run against the real "
  "figures found three errors: the IRA limits were a year out of date, the bigger catch-up allowance "
  "for ages 60 to 63 was missing entirely in an app built for ages 55 to 70, and four of the "
  "required-withdrawal divisors were slightly wrong from being interpolated rather than typed."),

 'Mixed-household take-home note is now a labelled fact per person': (
  "Where one person entered their take-home and the other’s is calculated, the note says so per "
  "person — “Your take-home: $5,000 (you entered) · Sam’s take-home: about $3,686 (calculated)”. The "
  "prose version was misread: the entered $5,000 was taken for gross."),

 'One term per concept: “take-home” (retired: lands in your bank': (
  "One word per concept across the income screens: “take-home” replaces “lands in your bank” and “takes "
  "home”; “calculated” replaces “worked out”, “Estimated federal tax” and “our estimate”. A test "
  "enforces it."),

 '“One term per concept” made an app-wide standing order': (
  "One term per concept becomes an app-wide standing order, written into the working rules and the "
  "vocabulary standard, and the test is widened from the income screens to the WHOLE app — which "
  "immediately caught 18 more."),

 'Synonym sweep findings: canon stragglers': (
  "The wider sweep found more stragglers under the same rule and added five new patterns to the test, "
  "so the same synonyms cannot come back."),

 'The connect door reads "Connect your bank': (
  "The door to link a bank reads “Connect your bank” everywhere. Home still said “Connect your first "
  "account”, so the same door had two names depending on where you met it. Home now takes its wording "
  "from the one list."),

 '"Add something by hand ›" opens the Add account form in one tap': (
  "“Add something by hand” opens the add-account form in ONE tap on all three screens, with the same "
  "line under it: “Your home, savings, or an account with no login.”"),

 "One door, one term: 'Link it (read-only)'": (
  "Three ways to add an account, named the same way everywhere, under one heading — “How do you want "
  "to add an account?”: Link it (read-only), Add by hand, Import from a file."),

 'Every screen title is 20 points': (
  "Every screen title is 20 points. At the time 31 screens used 24 and Cash flow used 30 — so the same "
  "kind of heading changed size as you moved between screens."),

 'A screen does not need a title': (
  "A screen does not need a title — the Net worth tab keeps none. This WITHDRAWS the same day’s "
  "opposite instruction, “we cannot have screen without title”."),

 'MoneyKeel at the top of every screen': (
  "The app name sits at the top of EVERY screen, not only the main tabs. Drawn in a mock for approval "
  "before being built."),

 'Net worth mock v06 CONFIRMED': (
  "The Net worth screen as build 53 shipped it is CONFIRMED as the approved design: square, edge-to-edge "
  "dark-green and light-green bars, with the odds leading the retirement row."),

 'Odds — exact, no rounding': (
  "The odds are shown EXACTLY, with no rounding. This replaces two earlier instructions that both said "
  "round to the nearest 5 — rounding odds makes two different plans look identical."),

 'Return on cash + investments — two decimals': (
  "The return on cash and investments is shown to two decimals. The precision standard already said "
  "two; the master file and the app both said one."),

 'Tight ⚠ beside the emergency fund — kept': (
  "The “Tight” warning beside the emergency fund is KEPT — a named exception to the rule that a screen "
  "shows the fact and not the verdict. An emergency fund is the one figure where the verdict is the "
  "point."),

 'Source chip — Linked, date only when stale': (
  "The small label on a figure says where it came from ALWAYS, and shows a date only when the figure "
  "has gone stale — so a date on screen always means something is wrong."),

 'full green bars - dark bars for section headings and light green for sub-headings': (
  "“full green bars — dark bars for section headings and light green for sub-headings.” Two levels of "
  "heading, both running the full width."),
 'State C - what you own section has': (
  "On the first day, What you own shows ONE line and one set of doors — not the same door repeated. The "
  "same fix applies to Debts."),
 'performance final is the one to work with': (
  "“performance final is the one to work with.” Names which of the drawn versions is the design, so the "
  "next piece of work does not start from whichever file was opened first."),
 'We never back-fill a year we didn': (
  "“We never back-fill a year we didn’t record.” Where the daily record does not reach back far enough, "
  "the app says so rather than inventing a starting value to measure from."),
 'make the buttons same as all radio buttons across all screens': (
  "“make the buttons same as all radio buttons across all screens — rounded corners not semicircle "
  "ends.” One button shape app-wide. Counted afterwards: 23 places used the semicircle against 157 "
  "using the rounded corner, so the semicircle was the odd one out."),
 'Yes rebuild - day one history': (
  "“Yes rebuild — day one history.” For a linked account, the first day of history is rebuilt from the "
  "account’s own records rather than left blank."),
 'button still looks not asthetically good': (
  "“button still looks not asthetically good. Can it be done like one row with dividers for different "
  "periods?” The period buttons become ONE control: a single bordered row split by hairlines."),
 'why the accounts say linked if hand entered?': (
  "“why the accounts say linked if hand entered?” They should not. A hand-entered account now carries "
  "the app’s own “By hand” wording instead of “Linked”."),
 'cannot see since when? and what %?': (
  "“cannot see since when? and what %? may be make it two rows, one for time period and second for "
  "return below it.” Each period segment carries two lines — the window on top, its return beneath."),
 'approved. save and built it': (
  "“approved. save and built it.” The Performance design is approved and became the built screen the "
  "same day."),
 '2Y - should not be annualized': (
  "“2Y — should not be annualized … double check what financial insititutions do.” Checked against the "
  "industry convention, and he is right: a return over a window LONGER than a year is shown as a YEARLY "
  "rate and says “a year”, with the window’s own total stated beside it. A window of a year or less is "
  "never annualised."),
 'Plan - Q1 - 8 - your recommendation approved': (
  "“Plan — Q1 — 8 — your recommendation approved.” All eight open questions on the Plan screen settled "
  "in one go, and drawn into the mock."),
 'go with (a) … fix canon guard': (
  "“go with (a) … fix canon guard … fix decimel error on NW screens.” The word-check now reads the "
  "copy AS IT RENDERS. It had been reading the code’s structure, so any agreed word written with "
  "punctuation could never match — and it reported clean."),
 'agree — add the $6,000 senior deduction': (
  "“agree — add the $6,000 senior deduction (65+, 2025–2028).” An extra deduction for people 65 and "
  "over, which exists for those tax years and was missing from every tax figure."),
 'no built-in tax rates on the draw-order comparison': (
  "“agree — no built-in tax rates on the draw-order comparison; the person’s own rates, or no number "
  "with the reason.” Which account to draw from first depends entirely on YOUR tax rates, so the app "
  "uses yours or shows no number and says why — never a built-in guess."),
 "revise the message: 'Based on today's balance": (
  "“revise the message: ‘Based on today’s balance. Provide last Dec 31st balance …’” The required-"
  "withdrawal figure says which balance it used and asks for the right one, because the law uses the "
  "previous 31 December, not today."),
 "show the HSA limit at 65+ only with 'If you are not enrolled in Medicare": (
  "“show the HSA limit at 65+ only with ‘If you are not enrolled in Medicare …’ and a place to update "
  "it.” Medicare bars an HSA contribution entirely, so the limit is shown at 65 and over only with that "
  "condition attached and a way to tell us."),
 "ok — the paycheck's guaranteed line = the four outside sources": (
  "“ok — the paycheck’s guaranteed line = the four outside sources.” The guaranteed part of a "
  "retirement paycheck is the income that comes from outside your savings — four named sources — not "
  "anything drawn from the pot."),
 'yes, the row named the wrong function; the screen was right': (
  "“question answered: yes, the row named the wrong function; the screen was right.” The master file "
  "pointed at the wrong calculation; the app was correct. The file was fixed, not the code."),
 'the legacy-target words on MK-PL-M-008': (
  "“question answered: the legacy-target words on MK-PL-M-008.” The wording about leaving money behind "
  "now matches the calculation that produces it."),
 '1000 everywhere': (
  "“1000 everywhere.” Every projection runs 1,000 possible futures — one number, on every screen and "
  "in every calculation, so no two screens run a different many."),
 'ok — the math column is the value-weighted average': (
  "“ok — the math column is the value-weighted average.” A blended rate is weighted by how much money "
  "sits at each rate, not a plain average of the rates."),
 'ok — one payment rule in both columns': (
  "“ok — one payment rule in both columns.” What counts as a required payment is defined once and read "
  "by both places that show it."),
 "'value' = the bond's current value as entered": (
  "“question answered: ‘value’ = the bond’s current value as entered; the approximation stated in both "
  "columns.” A bond’s value is what you entered, and where the yield is an approximation the file says "
  "so in both places."),
 'one producer for essentials per brief Q-21': (
  "“ok — one producer for essentials per brief Q-21; fewer than 12 months logged → the average for the "
  "logged months, labelled ‘N month average’.” ONE essentials figure across every screen, taken from "
  "what you have actually logged, with the label saying how many months it stands on. The typed plan is "
  "the fallback for someone who has logged nothing — never the other way round."),
 'the tax organizer shows gross income, 401(k) contribution, standard deduction and taxable income': (
  "“the tax organizer shows gross income, 401(k) contribution, standard deduction and taxable income.” "
  "The four lines a tax return shows, in order, so the subtraction can be followed by hand."),
 'ok — the bracket loops written by hand; the statutory tables in the file': (
  "“ok — the bracket loops written by hand; the statutory tables in the file.” The tax tables are typed "
  "in from the law and kept in the file; only the arithmetic over them is code."),
 'the statement amount cites MK-XS-I-020': (
  "“ok — the statement amount cites MK-XS-I-020 (and I-021 for the claim age).” The Social Security "
  "figure names the input it came from, so it can be traced to what you entered."),

 'the dependency column from the live function registry': (
  "“ok — the dependency column from the live function registry; a check that no row cites a retired "
  "identifier.” What each figure depends on is read from the code itself, and a test fails the build if "
  "any row points at a calculation that no longer exists."),
 "'Figures that name it' from the screen tabs' Function ID column": (
  "“ok — ‘Figures that name it’ from the screen tabs’ Function ID column.” Each calculation lists the "
  "figures that use it, read from the file rather than maintained by hand."),
 "inputs' reach and the reconciliation by identifier": (
  "“ok — inputs’ reach and the reconciliation by identifier, all inputs; then: the code’s record beside "
  "each row’s claim, he approves rows in batches.” Every input shows what it reaches, matched by "
  "identifier, with what the CODE says printed beside what the ROW claims — so a disagreement is "
  "visible rather than argued about."),
 'Specification counts from the build': (
  "“ok — Specification counts from the build.” The counts on the specification tab are printed from "
  "the build itself, never typed, so they cannot go stale."),
 'inflation defaults to the dated 30-year average': (
  "“ok — inflation defaults to the dated 30-year average, adjustable; no feed.” Inflation starts at the "
  "long-run average with its date stated, and you can change it. No live feed — a feed that breaks "
  "quietly is worse than a stated assumption."),
 'the screen shows $0 with a sentence explaining nothing is entered': (
  "“the screen shows $0 with a sentence explaining nothing is entered, and the door.” On a fresh "
  "account a screen keeps its shape, shows $0, says plainly that nothing is entered, and offers the way "
  "to enter it — rather than a blank space or a dash."),
 'units derived by rule say so': (
  "“ok — units derived by rule say so.” Where a unit was worked out by a rule rather than stated, the "
  "row says so, so nobody reads a derived unit as a given one."),
 "one word per concept in the master's words": (
  "“ok — one word per concept in the master’s words; the screen labels to match; a build check.” The "
  "file and the screens use the same word for the same thing, and a test fails the build on any other."),
 'the four mis-rendered functions written by hand': (
  "“explained and fixed in the file: the four mis-rendered functions written by hand; caps declared.” "
  "Four calculations the automatic reader could not render faithfully were written out by hand rather "
  "than left as a bad approximation."),
 'full precision for calculation; display two decimals unless stated': (
  "“full precision for calculation; display two decimals unless stated (whole dollars for totals, "
  "balances, projections; eight for coin quantities).” NOTHING rounds inside a calculation; rounding "
  "happens once, at the moment a figure is displayed. Rounding early is how two screens come to show "
  "different numbers for the same thing."),
 "the odds row's words: no band, 1,000 futures, nearest 5": (
  "“ok — the odds row’s words: no band, 1,000 futures, nearest 5.” NOTE: the rounding half of this was "
  "later replaced — the odds are now shown exactly."),
 'round2 is two decimals; reclassified': (
  "“ok — round2 is two decimals; reclassified.” One rounding helper, doing exactly what its name says."),
 'the money left after everything out': (
  "“the money left after everything out → Surplus.” One word for what is left over, everywhere."),
 'the retirement success percentage': (
  "“the retirement success percentage → odds, explained as ‘In 78 out of 100 simulated futures, your "
  "money lasts to age 90’.” The word is “odds”, and it is explained in a sentence anybody can read."),
 'money going out in a month': (
  "“money going out in a month → Expenses (planned / actual / recurring by context); ‘Outflow (expenses "
  "+ debt)’ for money leaving.” One word for money going out, with the context saying which kind."),
 'a figure the person gave us': (
  "“a figure the person gave us → ‘you entered’.” One phrase for a number you typed, so it is never "
  "confused with one the app worked out."),
 'money arriving in a month → take-home': (
  "“money arriving in a month → take-home; ‘Base salary (take-home)’, ‘Income (take-home)’; cash flow "
  "always ‘Inflow (income (take-home) + rent)’.” One word for money arriving, and the inflow line names "
  "what is inside it."),
 'Mock v11 drawn from v10 with the founder': (
  "The Performance mock was redrawn with his four changes — among them, the period buttons moved onto "
  "ONE row using the app’s own corner radius instead of semicircle ends."),
 'Add your accounts ›': (
  "On the first day the three ways to add an account appear ONCE — one line, no repeated “Add your "
  "accounts”, no separate heading."),
 'Link it (read-only)': (
  "“Link it (read-only)” is the door, so an account that went through it is “Linked” and the repair is "
  "“Link again”. One word per concept, carried through to the words on the account."),

 'cash saved for emergencies': (
  "“cash saved for emergencies → Emergency fund.” One name for it, everywhere."),
 'the per-category monthly plan': (
  "“the per-category monthly plan → Budget; review context before replacing.” One word for the plan, "
  "with the caution that “budget” means something else in some sentences — read the context first."),
 'options: value = contracts × 100 × price': (
  "“options: value = contracts × 100 × price unless the broker or the person states otherwise.” An "
  "option contract is 100 shares. Valuing it as one share understates it by a hundred times."),
 'crypto quantities to 8 decimals': (
  "“crypto quantities to 8 decimals.” Coin amounts are held and shown to eight decimal places — "
  "rounding a fraction of a coin to two loses real money."),
 'a foreign currency is cash held in that currency': (
  "“a foreign currency is cash held in that currency; no interest or dividend.” Money in another "
  "currency is cash, and it pays nothing — so it never appears as income."),
 'always capture the unit beside a quantity': (
  "“always capture the unit beside a quantity.” A number with no unit — shares, coins, contracts, "
  "ounces — cannot be read, and worse, can be read as the wrong thing."),
 'if round2 rounds to two decimals, fix the file': (
  "“if round2 rounds to two decimals, fix the file.” Where the file described a helper wrongly, the "
  "FILE is corrected to match the code — not the other way round."),
 'if the coupon rate is not available use 0': (
  "“if the coupon rate is not available use 0.” A bond with no stated rate pays nothing in our figures, "
  "rather than being given a guessed rate."),
 'subtract accrued interest when known; say so when not': (
  "“subtract accrued interest when known; say so when not.” Interest earned since the last payment is "
  "taken off the value where you have told us, and where you have not, the screen says so rather than "
  "quietly leaving it in."),
 'nine facts on a bond; value = current, else cost, else face': (
  "“nine facts on a bond; value = current, else cost, else face; else ‘need more information’.” A "
  "bond’s value falls back in a stated order, and where none of them is known the app says it needs "
  "more information rather than showing a figure."),
 'the look-back window must be a local calendar date': (
  "“the look-back window must be a local calendar date.” The window is measured in YOUR calendar days, "
  "not in universal time — which had made every look-back answer “nothing” on a device set to India "
  "time."),
 'Gross should be before any deductions': (
  "“Gross should be before any deductions. For example Income before tax is not same as gross as Income "
  "Before Tax = Gross Income - 401K - any other deductions such as medical premium.” So “Gross” is "
  "labelled “before any deductions”, and the earlier wording “before tax” is retired — it meant "
  "something different and narrower."),
 'Performance, and Net worth': (
  "“Performance, and Net worth.” The two names for the pair of screens, settled."),
 'debt and keep debt types': (
  "“debt and keep debt types. Explain in info dot Debt is amount you owe.” One word — debt — with the "
  "kinds kept underneath, and an explanation saying plainly that a debt is what you owe."),
 'Holding but do not just replace position': (
  "“Stock/fund. Holding but do not just replace position with holding. Notification, alert message "
  "should say — holding liquidated — all shares sold.” The word is “holding”, but not as a blind "
  "find-and-replace: where the sentence is about selling everything, it says so in those words."),
 'activity': (
  "“activity.” One word for the list of what has happened in an account."),
 'one-time. Lump-sum does not always mean one-time': (
  "“one-time. Lump-sum does not always mean one-time. What’s the intent behind ‘plan for the lump sum’ "
  "before you change it to one-time?” The word is “one-time” — and his question stopped a rename that "
  "would have changed the meaning of a sentence rather than just its wording."),
 '/month, /year · his answer 2026-09-12: /quarter, /week, /2 weeks': (
  "“/month, /year” — and, asked about the others, “/quarter, /week, /2 weeks”. One way of writing a "
  "period, everywhere; “a month” and “/mo” are retired."),
 'Will my money last': (
  "“Will my money last.” The question is asked in those words wherever it appears."),
 'spouse': (
  "“spouse.” The word is spouse, not partner, in everything a person reads."),
 'This-month screen, Planned: In (take-home) 5,000': (
  "A worked example of the This-month screen in his own numbers: take-home 5,000, mortgage 2,000, car "
  "250, expenses 2,000, a HELOC payment of 200 from the big-ticket list and a 200 card payment entered "
  "by hand, leaving a surplus of 750 — with the actual column beside it. The rows have to add up to the "
  "surplus, which is what the example pins."),
 'Sources (Chase checking/savings, Vanguard IRA/brokerage': (
  "A worked example of how net worth is built, in his own accounts: each source, into its category "
  "(cash and liquid, investments, real estate and assets, mortgage debt, revolving debt), to total "
  "assets minus total debts. The example pins that the categories add to the total."),
 'Twelve notes on the onboarding screens': (
  "Twelve notes on the onboarding screens — among them the tagline card “Your finance command center” "
  "with four bullets on what the app does."),
 'never the word "safe"': (
  "“never the word ‘safe’.” It kills “safe to spend” and “safe withdrawal rate”. Nothing in a "
  "projection is safe, and a word promising safety is a promise the app cannot keep."),
 'an unknown input produces no number and a reason': (
  "“an unknown input produces no number and a reason — never a default.” Where something is not known, "
  "the app says what is missing instead of filling in a plausible figure. A default looks like an "
  "answer."),
 'show the fact, not the verdict': (
  "“show the fact, not the verdict — no grading.” The app states what is true and lets you judge it, "
  "rather than marking your finances good or bad."),
 'a tax figure requires a YEAR': (
  "“a tax figure requires a YEAR — net worth shows no tax.” Tax only means something inside a tax year, "
  "so a net-worth screen, which is a snapshot of today, shows none."),
 'class and liquidity are separate fields': (
  "“class and liquidity are separate fields.” What something IS and how quickly it can be turned into "
  "cash are two different facts — a house and a fund can share a liquidity and differ in class."),
 'full precision throughout, round once at display': (
  "“full precision throughout, round once at display.” Nothing rounds inside a calculation; it happens "
  "once, at the end, where the figure is shown."),
 'source always, date only when stale': (
  "“source always, date only when stale.” Every figure says where it came from; a date appears only "
  "when the figure has gone old — so a date on screen always means something needs attention."),
 'one mechanism per shape: amount + start year + end year + growth rate': (
  "“one mechanism per shape: amount + start year + end year + growth rate.” Every income stream and "
  "every cost is described the same four ways, so a new kind needs no new machinery."),
 'flat pensions are being inflated': (
  "“flat pensions are being inflated — a fixed-versus-inflating flag per stream; Social Security "
  "inflates, pensions and annuities flat.” Each income stream says whether it rises with inflation. "
  "Inflating a fixed pension overstates a retirement by more every year."),

 'Social Security factors anchored at 67': (
  "“Social Security factors anchored at 67 — full-retirement-age table by birth year; the input is the "
  "statement (FRA) amount.” Your full retirement age depends on the year you were born, and the figure "
  "you enter is the one on your statement — which is the amount at YOUR full retirement age, not at 62 "
  "or 70."),
 'the legacy target comes off the pot while working too': (
  "“the legacy target comes off the pot while working too, not only once retired.” Money you intend to "
  "leave behind is set aside from the start, not only from the day you retire — otherwise the years "
  "before retirement look better than they are."),
 'RMD start age by birth-year rule': (
  "“RMD start age by birth-year rule, one dated table, Roth 401(k) exempt, no duplicate literal.” The "
  "age you must start taking withdrawals depends on your birth year, from one dated table, and a Roth "
  "401(k) is exempt."),
 'withdrawals and RMDs are not guaranteed income': (
  "“withdrawals and RMDs are not guaranteed income — paycheck lists each line; the plan input is "
  "outside money only.” Money you draw from your own savings is not guaranteed income; only money "
  "arriving from outside is. Counting your own pot as guaranteed makes a plan look safe because it is "
  "spending itself."),
 'odds: more than 400 paths, nearest 5, no best-to-worst band': (
  "“odds: more than 400 paths, nearest 5, no best-to-worst band.” NOTE: both halves were later "
  "replaced — the count is now 1,000 everywhere, and the odds are shown exactly rather than rounded."),
 'money-market: name-first classification on every road': (
  "“money-market: name-first classification on every road, broker tag as fallback; a class change "
  "between syncs is kept and flagged.” The NAME decides what a holding is, because brokers tag both "
  "money-market funds and CDs as cash. Where a later sync disagrees, the change is kept and flagged "
  "rather than silently applied."),
 'decimal arithmetic — full precision, round once': (
  "“decimal arithmetic — full precision, round once.” Money arithmetic is done in exact decimals, not "
  "in the approximate numbers a computer uses by default, which drift by fractions of a cent and then "
  "disagree across screens."),
 '14 metrics cut': (
  "Fourteen figures CUT — among them tax-loss harvesting, cash drag, age of money, savings rate, safe "
  "to spend, personal inflation, drift. A figure nobody acts on is a figure that has to be kept right "
  "forever for nothing."),
 'deferred, not dropped': (
  "“deferred, not dropped: forward income, budget rollover, non-USD holdings — store the currency field "
  "now.” Three things put off rather than abandoned, and the currency field is stored TODAY so the data "
  "exists when they are picked up."),
 'liquidity tiers — Liquid / Sellable / Locked / Not spendable': (
  "“liquidity tiers — Liquid / Sellable / Locked / Not spendable; liquid net worth = first tier; "
  "retirement tagged by age.” Four tiers for how quickly something becomes cash, and your liquid net "
  "worth is the first tier only."),
 'hand-entered revaluations marked': (
  "“hand-entered revaluations marked; market-priced entries spread evenly across the gap; house/car "
  "booked on the day.” When you update a value by hand it is marked as yours, a market move is spread "
  "over the days it happened across, and a house or car is booked on the day you changed it — so a "
  "single edit does not look like a market movement."),
 'both boundary days inside': (
  "“both boundary days inside; beginning value = close of the day before the start; Dietz weights over "
  "the inclusive count.” A window includes BOTH its end days, and it starts from the close of the day "
  "before — so no day is counted twice and none is missed."),
 'return stays money-weighted': (
  "“return stays money-weighted; thresholds in one module; timing-sensitivity band replaces the 10% "
  "gate; refuse when the denominator ≤ 0.” The return accounts for WHEN money went in and out. Where "
  "the amounts are big enough that timing drives the answer, the app says so instead of printing a "
  "percentage, and where there is nothing to divide by it refuses."),
 'the Plaid overlap': (
  "“the Plaid overlap — both versions side by side, the person chooses per transaction; stable pair "
  "identity; unmatched rows kept and flagged.” Where an imported transaction and one you entered look "
  "like the same thing, BOTH are shown and you choose. Nothing is merged for you, and nothing is "
  "silently dropped."),
 'affordability replaces safe-to-spend': (
  "“affordability replaces safe-to-spend: recurring cost with an end date; one-off purchase against "
  "liquid assets and months of cover.” The question becomes whether you can afford a specific thing, "
  "rather than a general figure calling itself safe."),
 'default to the dated 30-year average, editable': (
  "“default to the dated 30-year average, editable.” The assumption starts at the long-run average with "
  "its date stated, and you can change it."),
 'state tax in the capital-gains figure': (
  "“state tax in the capital-gains figure — one tab said missing, one said included.” Two tabs of the "
  "same file disagreed about whether state tax was in the number. Settled in one place."),
 '"money-weighted" names two things': (
  "“‘money-weighted’ names two things — rename PORTFOLIO_RETURN to value-weighted; reserve "
  "money-weighted for the IRR.” One term, one meaning: a blend weighted by how much money sits at each "
  "rate is “value-weighted”; “money-weighted” is kept for the return that accounts for timing."),
 'the long-term rule is "more than one year", not twelve whole months': (
  "“the long-term rule is ‘more than one year’, not twelve whole months.” A tax rule stated precisely, "
  "because the two are not the same thing at the boundary."),
 'over-65 additional standard deduction': (
  "“over-65 additional standard deduction.” People 65 and over get an extra amount on top of the "
  "standard deduction, and it was missing."),
 'married bands are not double the single ones at the top': (
  "“married bands are not double the single ones at the top.” A couple’s tax bands are NOT simply twice "
  "a single person’s in the upper brackets — assuming they are overstates take-home for higher "
  "earners."),
 'state tax applies to taxable income, never gross': (
  "“state tax applies to taxable income, never gross.” Applying a state rate to gross income overstates "
  "the tax by the whole deduction."),
 'both ledger reconciliation assertions': (
  "“both ledger reconciliation assertions (holdings + cash = the broker total; re-ingest never doubles "
  "money).” Two checks that must always hold: what we hold plus cash equals the broker’s own total, and "
  "re-reading an account never counts the same money twice."),
 'agree — long-term means MORE than one year; exactly one year is short-term': (
  "“agree — long-term means MORE than one year; exactly one year is short-term.” The boundary stated "
  "exactly, because a gain on the anniversary itself is taxed at the higher rate."),
 'the file must say 2.5% is divided by 100 before use': (
  "“agree — the file must say 2.5% is divided by 100 before use.” Where a rate is stored as a "
  "percentage and used as a decimal, the file says so — otherwise the formula reads as being a hundred "
  "times too big."),
 'no flat 22% inside the odds': (
  "“agree — no flat 22% inside the odds; every caller passes its own effective rate.” And his "
  "question: what if a caller has no rate to pass? THE ANSWER: no tax is applied and the row says so — "
  "never a guessed rate hidden inside a projection."),
 'a missing maturity date is unknown, not "due now"': (
  "“agree — a missing maturity date is unknown, not ‘due now’.” A bond with no maturity date on record "
  "is not a bond maturing today. Treating unknown as zero is how a holding appears to come due."),
 'agree; ensure compliance with the synonym ruling': (
  "“agree; ensure compliance with the synonym ruling.” Agreed, with the condition that the change also "
  "obeys the one-word-per-concept rule."),
 "the words must say the statement amount is at the person's OWN full retirement age": (
  "“agree — the words must say the statement amount is at the person’s OWN full retirement age.” The "
  "screen names whose full retirement age the figure belongs to, because it differs by birth year."),
 'the per-class benchmark table (value, source, period)': (
  "“ok — the per-class benchmark table (value, source, period) on the Reference tab.” Every assumed "
  "rate of return is listed with where it came from and over what period — an assumption you cannot see "
  "the source of cannot be challenged."),
 'state the months-left convention': (
  "“ok — state the months-left convention; move the division off the screen.” How many months are left "
  "in the year is defined once and stated — the current month counts — and the arithmetic moves out of "
  "the screen into the calculation."),
 'keep both engines (money-weighted and window return are different figures)': (
  "“ok — keep both engines (money-weighted and window return are different figures); fix the file "
  "row.” They answer different questions, so both stay; it was the FILE that wrongly described them as "
  "one."),
 'the file names the real classes; Unclassified counts as investments': (
  "“ok — the file names the real classes; Unclassified counts as investments.” Anything not yet "
  "classified counts as an investment rather than being left out of the total."),
 'every contribution limit uses the age attained in the calendar year': (
  "“agree — every contribution limit uses the age attained in the calendar year (this year − birth "
  "year), the IRS test.” The age that matters is the one you reach at any point in the year, not your "
  "age today — which is the rule for every catch-up allowance."),
 'the caveat under the federal-only take-home must name its subject': (
  "“the caveat under the federal-only take-home must name its subject and use the real withholding: "
  "6.2% up to the wage base, 1.45% on all, 0.9% more above $200,000 — Let’s not assume that reader "
  "knows what statement is referring to. Always be explicit.” So the sentence names what it is about "
  "and uses the actual rates, rather than a rounded 7.65%."),
 'ask for the birth month': (
  "“ask for the birth month (already asked, required); one age convention PER PURPOSE — every rule and "
  "projection runs on the age attained in the year.” Each purpose states which age convention it uses, "
  "and they are not mixed."),
 'one concept, one function': (
  "“one concept, one function — a concept is computed by exactly one dependent function, called over "
  "whatever set it is asked about.” One calculation per idea, called with different inputs — rather "
  "than a second copy per screen, which is how two screens come to disagree."),
 'orchestrators do not call orchestrators': (
  "“orchestrators do not call orchestrators — a figure two questions need is a dependent function both "
  "call.” Where two questions need the same figure, both reach the same calculation underneath rather "
  "than one question calling the other."),
 'inputs assembled once per family': (
  "“inputs assembled once per family — one function builds the person’s state for a family and every "
  "orchestrator in that family reads it.” The data a group of screens needs is assembled once, so two "
  "screens in the same family cannot start from different inputs."),

 'status disagreements, work-list generation, engine counts': (
  "Five things kept in the older metrics deliverable rather than moved: status disagreements, how the "
  "work list is generated, the engine counts, the tab references, and the PINNED word."),
 'screens compute nothing': (
  "“screens compute nothing — a figure derived on screen from two others (a share, a difference, a "
  "percentage) is a function with a row, however small.” A screen displays; it never calculates. "
  "Arithmetic done on a screen is a second definition waiting to disagree with the first."),
 'shared dependent functions are allowed': (
  "“shared dependent functions are allowed and are recorded on every orchestrator row whose closure "
  "holds them; the closure is generated from the code, never typed.” A calculation may be shared, and "
  "the list of what each question reaches is read FROM the code rather than maintained by hand."),
 'a door hands out figures and the walk behind them': (
  "“a door hands out figures and the walk behind them; it is named MK-<family>-O-NNN plus a verb-noun.” "
  "One function per question, named so it is identifiable at a glance."),
 'action functions and bring-data-in functions sit outside every orchestrator': (
  "“action functions and bring-data-in functions sit outside every orchestrator, and each is listed as "
  "such so the closure check has nothing unexplained.” Things that DO something, or fetch something, "
  "are not calculations — they are listed separately so nothing is left unaccounted for."),
 'completeness is proven three ways before a question is closed': (
  "“completeness is proven three ways before a question is closed — every figure rendered on a screen "
  "is claimed by one row.” A question is not finished because it looks finished: the figures actually "
  "rendered are listed from the running screen and every one must be claimed."),
 'the map before the code': (
  "“the map before the code — no orchestrator is built before its row on the orchestrator map is "
  "approved by the founder; grouping conflicts go to him one row at a time.” His verdict comes before "
  "the code, not after it, and conflicts go to him individually rather than as a batch to rubber-stamp."),
 'a door DECLARES each figure it hands out': (
  "“a door DECLARES each figure it hands out beside the code that computes it — identifier, the words "
  "on screen, unit, formula in plain English, inputs, decisions.” The master file’s rows are then "
  "PRINTED from those declarations, so the file is a printout of the code rather than a description of "
  "it that can go stale."),
 'connect your bank': (
  "“connect your bank.” The wording of the door, everywhere."),
 'love it. do it.': (
  "“love it. do it.” Approved as drawn."),
 'one door one term rule - so change on all': (
  "“one door one term rule — so change on all.” Where a door’s wording changes, it changes on every "
  "screen that offers it, not just the one being worked on."),
 'standard size 20': (
  "“standard size 20.” Every screen title is 20 points."),
 'I take back title not need for every screen.': (
  "“I take back title not need for every screen.” He WITHDRAWS his earlier instruction that every screen "
  "needs a title — recorded as its own decision so the reversal is visible rather than buried."),
 'did not look similar to Net worth because you did not have "MoneyKeel" at the top': (
  "“Your Import from a file screen did not look similar to Net worth because you did not have "
  "‘MoneyKeel’ at the top which every other screen has.” The app name belongs at the top of EVERY "
  "screen, not only the main tabs."),
 'per the latest ruling use exact everywhere no rounding for odds': (
  "“per the latest ruling use exact everywhere no rounding for odds.” The odds are shown exactly, "
  "replacing the two earlier instructions to round to the nearest 5."),
 'Return on cash - use 2 decimals': (
  "“Return on cash — use 2 decimals.” Two decimals on that return, matching the precision standard."),
 'tight besides emergency funds - keep it': (
  "“tight besides emergency funds — keep it.” The “Tight” warning stays, as a named exception to "
  "showing the fact rather than the verdict."),
 'connected only unless stale': (
  "“connected only unless stale.” The label says the account is connected and shows a date only when "
  "the figures have gone old."),
 'connected / reconnected - change to linked / link again': (
  "“connected / reconnected — change to linked / link again.” The words follow the door: if the door "
  "says “Link it”, the account is “Linked” and the repair is “Link again”."),
 'why income when % is calculated using wealth generated?': (
  "“why income when % is calculated using wealth generated?” The question found that the label and the "
  "figure beneath it were about different things."),
 'Should extra saving each month be an eighth row': (
  "“Q1 — Should extra saving each month be an eighth row in ‘Your plan at a glance’? → yes.”"),
 'save as you type, or drafts you confirm?': (
  "“Q2 — save as you type, or drafts you confirm? → save as you type.” No Save button to forget."),
 'cap or overfill past the target?': (
  "“Q3 — cap or overfill past the target? → cap, numeral still reads the true 114%.” The BAR stops at "
  "the target, but the NUMBER tells the truth — so being over target is visible without the picture "
  "breaking."),
 'where does the suggested target sit?': (
  "“Q4 — where does the suggested target sit? → on day one’s target row too, in the same words.” The "
  "same suggestion, worded the same way, in both places."),
 'the mortgage odds placeholder': (
  "“Q5 — the mortgage odds placeholder → build the second simulation first; until then the row states "
  "today’s odds and stops.” Rather than showing a placeholder figure, the row says what is true today "
  "and says nothing more until the calculation exists."),
 "does this even make sense to you?": (
  "“Q6 — future dollars and tax.” MY FIRST ANSWER WAS WRONG — I proposed ‘today’s money, after tax’. "
  "HIS CORRECTION: “does this even make sense to you?” It did not, and the row records the correction "
  "rather than quietly replacing my answer."),
 'the cockpit disagrees with Home and Plan': (
  "“Q7 — the cockpit disagrees with Home and Plan → one number, computed once, read everywhere.” Three "
  "screens showing one figure must read it from one calculation."),
 'the copy stops treating 80% as a line he crosses': (
  "“Q8 — Ray at 79.5% (78.9% at 1,000 futures) → the copy stops treating 80% as a line he crosses.” A "
  "threshold that a person sits right on top of should not be written about as though it were passed or "
  "failed."),
 'the sentence becomes “+7.30%/year”': (
  "“go with (a) — the sentence becomes ‘+7.30%/year’.” Written the canon way, with the period "
  "attached as “/year”."),
 'fix canon guard': (
  "“fix canon guard.” The word-check was reading the code’s structure rather than the copy as it "
  "renders, so an agreed word written with punctuation could never match — and it reported clean."),
 'fix decimal error on NW screens': (
  "“fix decimal error on NW screens.” Decimals on the Net worth screens corrected to the standard."),
 'Not sure where on alternatives screen is the question "what am I worth"': (
  "“Yes — for home, NW tab, and insights. Not sure where on alternatives screen is the question ‘what "
  "am I worth’ — provide more context?” Approved for three screens, and the fourth is a question back "
  "to me rather than an approval."),
 "Is there a similar question for CDs as CD rates don't move": (
  "“Yes — for bonds question only. Is there a similar question for CDs as CD rates don’t move and one "
  "can do nothing if CD rates move.” Approved for bonds only, with a real point: a CD is not traded, so "
  "there is nothing a person could do about a rate move."),
 'Base Pay is one component of total income or income summary and not the same': (
  "“No. Base Pay is one component of total income or income summary and not the same. Have your checked "
  "underlying function? Are two functions calculating save thing?” He rejected the grouping and sent me "
  "to check the code — where the nesting turned out to be correct, and my proposal was wrong."),
 'THE CARD MUST ADD UP': (
  "THE CARD MUST ADD UP: gross − tax − 401(k)s = take-home, with a 401(k)s row, on every frame. From his "
  "first device pass of build 54, where the card contradicted itself because every estimated earner was "
  "granted the FULL joint deduction."),
 "a mixed household's take-home note is a labelled fact per person": (
  "A mixed household’s take-home note is a labelled fact per person, never prose: “Your take-home: "
  "$5,000 (you entered) · Sam’s take-home: about $3,686 (calculated).” The prose version was misread — "
  "the entered $5,000 was taken for gross."),
 'Yes.': (
  "“Yes.” Approved as put to him."),
 'yes': (
  "“yes.” Approved as put to him."),

 'FOUNDER RULINGS, all four recorded in the screen map': (
  "Four rulings about where screens live, all four recorded in the screen map and held by a test. The "
  "first: TIPS AND REWARDS are saved for future use, so they move from the list of screens nobody can "
  "reach into the list of deliberate keeps. THE STRANDED LIST IS NOW EMPTY — which is the point of it: "
  "an entry there means nobody can reach this screen and nobody decided that."),
 'Income redesigned end to end: base pay as a full screen': (
  "The whole income surface redesigned. Six decisions:\n"
  "1. Base pay becomes a full screen with one expandable section per earner — gross, 401(k), employer "
  "match, and what actually lands.\n"
  "2. A 14-month dated table when pay varies, rather than one typical figure.\n"
  "3. BOTH earners are captured, not one: a household on $84,000 plus $54,000 was being read as $84,000 "
  "— one person’s income against two people’s spending.\n"
  "4. A filing-status question, which had never been asked, so every couple was taxed as a single filer.\n"
  "5. Bonus and company shares follow the same who-earns pattern.\n"
  "6. Interest and dividends are worked out from your holdings rather than asked for, and treated as "
  "TAXABLE BUT NOT SPENDABLE."),
 'create a folder called August 14th Design': (
  "“create a folder called August 14th Design, move the latest files there so there is no confusion, "
  "and re-check every file carries the decisions we made.” One named home for the live set, and every "
  "file in it re-checked against the decisions rather than assumed to carry them."),
 'property sale/purchase as two events': (
  "Nine things settled in one go: a property sale or purchase is recorded as TWO events, not one; "
  "part-time income can step down in stages; health premiums before 65 are spread rather than lumped; "
  "every item is tagged as yours, your spouse’s or joint, with a joint column at full value; survivor "
  "inputs are captured; insurance labels carry the protection clause; the attention box is sorted by "
  "money at stake; and two ratios are added — expenses against income over the trailing year, and debt "
  "against assets."),

 'Again context is important. Term to represent Net amount person get': (
  "“Again context is important. Term to represent Net amount person get should be ‘take-home’. In "
  "context of take home base salary use ‘Base salary (take-home)’.” One word for the concept, with the "
  "context named in brackets — not a different word per screen."),
 'Holding but do': (
  "“Stock/fund. Holding but do not just replace position with holding. Notification, alert message "
  "should say — holding liquidated — all shares sold.” The word is “holding”, but not as a blind "
  "find-and-replace: where a sentence is about selling everything, it says so in those words."),
 '/month, /year': (
  "“/month, /year.” One way of writing a period, everywhere — and, asked about the rest, “/quarter, "
  "/week, /2 weeks”. “a month” and “/mo” are retired."),
 'take-home (your standing order, 2026-09-02)': (
  "“take-home” is the word for money arriving — his standing order. “lands in your bank” and “takes "
  "home” are retired."),
 'calculated (your standing order, 2026-09-02)': (
  "“calculated” is the word for a figure the app worked out — his standing order. “worked out”, "
  "“Estimated federal tax” and “our estimate” are retired."),
 'enforce with GATES not intentions': (
  "“enforce with GATES not intentions.” A rule holds only when something fails the build. Every rule "
  "here that has come back was one held by care rather than by a test."),
 'means the founder approved it': (
  "A row is NOT documented because I wrote it. A row is documented when HE has read it and approved "
  "it — his own definition, so my count of rows written is not a count of anything he has agreed to."),
 'is **my** count of rows written, not his count of rows approved': (
  "My count of rows written is not his count of rows approved. Against the objective, the honest "
  "approved figure is ZERO until he starts giving verdicts — so progress is reported as what he has "
  "confirmed, not as what I have produced."),
 'This document was written before the vocabulary was settled': (
  "A document written before the vocabulary was settled says so on its face, rather than being quietly "
  "left to read as current."),
 'i like your recommendation': (
  "“I like your recommendations.” Approved as put to him."),
 'go ahead and execute on step 1, 2, 3': (
  "“go ahead and execute on step 1, 2, 3.” Approved, in that order."),
 'held as a float, decimals shown only for prices': (
  "A figure is held at full precision and shown with decimals only where decimals mean something — "
  "prices, rates, per-share figures. Totals and balances are whole dollars."),
 "under the figure, and the window's own total beside it": (
  "A yearly rate is shown under the figure with the window’s own total beside it — so a two-year "
  "return shows both what it made in all and what that is a year, and neither can be mistaken for the "
  "other."),
 "Let's not assume that the reader knows what the statement is referring to": (
  "“Let’s not assume that the reader knows what the statement is referring to. Always be explicit.” "
  "Every sentence names its own subject — “the take-home above is higher…”, never “this reads high”."),
 'column is read by the guard: entries are separated by': (
  "The agreed word list is READ by the test rather than copied into it, so the list and the check "
  "cannot disagree."),
 'Why ask again if I ruled it already?': (
  "“Why ask again if I ruled it already?” A settled question is not re-asked. Before any question goes "
  "to him, the rulings are searched — there is now one command that does it."),
 'a mock is what the next screen gets built from, so a retired word kept being taught back': (
  "A mock is what the next screen is built from, so a retired word left in a mock keeps being taught "
  "back into the app. The word check now reads what is DRAWN in the live mocks, not only the code."),
 'Rulings in master file needs to be one place to record all decisions': (
  "“Rulings in master file needs to be one place to record all decisions, no matter where they are "
  "made… After mistakes over and over, I no longer trust you.” ONE file for every decision, wherever it "
  "was made — this log — and the rulings tab comes off the calculation master so there is one record "
  "and not two."),
 'check the rulings ledger': (
  "“check the rulings ledger” was advice I gave that could not be relied on: the ledger began in "
  "August 2026 and held 43 of the 238 decisions his own changelog recorded. That is what the decision "
  "log replaces."),
 'Why do we have two versions in the folder?': (
  "“Why do we have two versions in the folder? … How do I know what changed between V06 and V07?” "
  "Every version of a mock carries a block saying what changed from the one before it and why — and "
  "only one version is live, the rest dated and archived."),
 'the whole purpose of executing PFS after every change or decision is to': (
  "“something is broken — the whole purpose of executing PFS after every change or decision is to "
  "ensure all files are in sync and not out of sync, and this is how we wasted 6 hours, and months.” A "
  "decision is not recorded until it is in EVERY file that carries it, and a test now fails the build "
  "on a decision anchored to nothing."),
 'at what step do we run PFS': (
  "“at what step do we run PFS — considering calculation file is written from code, so if we have only "
  "agreed but not coded, we will have mismatch.” A fair point: the sync runs at the step where the file "
  "and the code can actually agree, and a decision agreed but not yet coded is marked as such rather "
  "than appearing as a mismatch."),
 'in future learn how to format excel file so it is readable in terms of column width': (
  "“in future learn how to format excel file so it is readable in terms of column width.” Every "
  "workbook goes through one formatter: measured widths, real row heights so wrapped text is not "
  "clipped to a sliver, a frozen header with a filter, and my own inventory columns folded away so it "
  "opens on the columns he reads."),
 'Do you not keep track of mock you use to build 53': (
  "“Do you not keep track of mock you use to build 53.” Nothing recorded it. There is now one record "
  "of which design each screen was built from, by build — and a design named in the latest build is "
  "never moved to the archive."),
 'no mock up ... just build it': (
  "“no mock up … just build it.” A named exception to the mock-first rule for that change."),
 'fix cashflow screens before moving forward': (
  "“fix cashflow screens before moving forward.” The cash-flow screens are brought onto the standards "
  "before any new work starts."),
 "tap the name to open this account's portfolio": (
  "Tapping an account’s name opens that account’s holdings."),
 'We spent 5 hours trying to design one set of screens': (
  "“We spent 5 hours trying to design one set of screens.” The cause: the mocks were being redrawn "
  "from an older mock’s styling rather than from his last approved design and the code that shipped "
  "it. Every screen task now starts from the last approved design and reports the gaps first."),

 "You are consistently relying on me to tell what's wrong": (
  "“You are consistently relying on me to tell what’s wrong, versus doing it right the first time.” "
  "Every deliverable is audited against every standard BEFORE it reaches him. He must never be the one "
  "finding the error."),
 "Shouldn't you have started from version I last approved": (
  "“Shouldn’t you have started from version I last approved or build 53? Wasted 6 hours, re-inventing "
  "the wheel.” Every screen task starts from his LAST APPROVED design and the build that shipped it, "
  "and reports the differences first — never from today’s code."),
 'column starts from the approved design plus every ruling made after it': (
  "Two columns on a mock and what each one means: “as it will be built” is the approved design PLUS "
  "every ruling made since; “today” is what the code does now. Mixing them is how a gap gets presented "
  "as a plan."),
 'THIS RULE IS NOT ONLY ABOUT DRAWING': (
  "The start-from-the-approved-design rule is NOT only about drawing. It was scoped to screens and "
  "mocks, so writing down what a screen ANSWERS — which draws no mock — slipped past it, twice. It now "
  "covers any work that says what a screen shows or answers, and a gate fails the build when such a "
  "question does not record which design it was read from."),
 'Nothing entered yet.': (
  "“Nothing entered yet.” The approved wording for a screen with no data: the layout stays, the figure "
  "reads $0, this sentence explains it, and the door to enter something sits beneath."),
 "let's discuss how to clean cashflow mockups and combine into one file": (
  "“let’s discuss how to clean cashflow mockups and combine into one file, as currently we have v2 "
  "with few final screen, and v7 with this month and expense screen revised.” The cash-flow mocks "
  "become ONE file, so there is no choosing between two half-current versions."),
 '✍️ By hand · you update it': (
  "The wording on a hand-entered account: “By hand · you update it” — so it is never labelled as "
  "linked, and it says whose job it is to keep it current."),
 'What do you save each month? $1,000': (
  "The saving question is asked in those words, with the amount typed as a monthly figure."),
 'The networth module missed an ability to edit bonds, cash and alternatives': (
  "“The networth module missed an ability to edit bonds, cash and alternatives, also manually add "
  "transactions. Ability to add transactions was only for stocks and ETFs.” Three gaps he found: you "
  "could not edit a bond, cash or another investment, and you could only add a transaction against a "
  "share."),
 'The display never showcased year': (
  "“The display never showcased year. So, user want to see cashflow from July 2026 to June 2027 how "
  "would they do that?” A month shown without its year cannot be read across a year boundary — which "
  "is exactly the window most people want."),
 'Grow and Track currently assumes only stocks and etfs change in value': (
  "“Grow and Track currently assumes only stocks and etfs change in value. Bonds, and alternatives all "
  "have current value which would be critical to track.” A bond’s value moves with yields — a $100,000 "
  "bond at 4.5% marked at $95,000 could be worth $85,000 if yields rise to 6% — so treating it as fixed "
  "understates a real loss."),
 'If user is in plan section and plan something such SS starting age': (
  "“If user is in plan section and plan something such SS starting age, or RMDs or other scenarios, "
  "can they select Use this once satisfied and would that feed into the rest?” A scenario you are happy "
  "with should be adoptable — one action that feeds it through the rest of the app rather than leaving "
  "it as a what-if."),
 'ensure to import institution name as well': (
  "“ensure to import institution name as well.” The institution comes in with an imported account — "
  "without it, accounts cannot be grouped by where they are held."),
 'how about one time income?': (
  "“how about one time income?” Income that arrives once is captured as such and lands in its own "
  "month, rather than being spread across twelve."),
 'Which kind T-bills will be? And what is HYSA?': (
  "“Which kind T-bills will be? And what is HYSA?” Two questions the labels should not have raised: "
  "which class a Treasury bill falls into, and what an abbreviation means. Terms are spelled out, and "
  "the classification is stated."),
 "what's this used for?": (
  "“what’s this used for?” A field that cannot say what it is for should not be asked for."),
 'cash means cash+ cashequivalents?': (
  "“cash means cash+ cashequivalents?” The question that led to the rule: cash means CASH ONLY. A "
  "money-market fund is Stocks and funds; a CD or Treasury bill is Bonds and CDs."),
 'why is value any versus float?': (
  "“why is value any versus float?” A value that could be anything cannot be checked — the field says "
  "what type it holds."),
 'we should capture as some debt might not be due for many years': (
  "“we should capture as some debt might not be due for many years.” A debt’s due date is captured "
  "even when it is far off, because a lump due in 2031 still belongs in the plan."),
 "What's the cost differential?": (
  "“What’s the cost differential?” Where two options are offered, what each costs is stated."),
 'or walk through it step by step': (
  "The choice offered to him: the summary, or a step-by-step walk through it."),
 'in three places (retired by the identifier standard': (
  "A thing defined in three places is retired to one, under the identifier standard."),
 'the ways-to-add-an-account mock v10': (
  "The ways-to-add-an-account mock v10 put to him for approval — the three doors, their heading, the "
  "titles behind them and the wording check."),
 'to design on top of. The': (
  "Which file the next design is drawn on top of, named rather than assumed."),
 'It did, and for two reasons that are not': (
  "The rule failed, and for two reasons that are NOT “I forgot”: it was scoped to screens and mocks so "
  "it never fired on other work, and nothing enforced it — it was held by my memory, which is what "
  "failed."),
 'It was scoped to screens and mocks': (
  "The rule was scoped to screens and mocks, so work that says what a screen ANSWERS — drawing nothing "
  "— was never covered by it."),

 'same comment as #13': (
  "“same comment as #13.” He points at his own earlier comment rather than repeating it — the row it "
  "refers to carries the substance."),
 'how about one time income': (
  "HIS QUESTION: “How about one-time income?” Income arriving once lands in its own month rather than "
  "being spread across twelve."),
 'why is value any versus float': (
  "HIS QUESTION: “Why is the value ‘any’ versus float?” A field whose type is ‘anything’ cannot be "
  "checked, so nothing can guarantee what is in it."),
 'we should capture as some debt might not be due': (
  "“We should capture that some debt might not be due for many years.” A debt’s due date is captured "
  "even when it is years away, because a lump due in 2031 still belongs in the plan."),
 'Triangle (green color) up $11,200 this month': (
  "HIS CORRECTION: “‘up $11,200 this month Triangle up’ should be ‘Triangle (green color) up $11,200 "
  "this month’.” And: “Will it Last?” is not clear as to what it refers to. Word order matters — the "
  "direction comes before the amount, not after it."),
 'Investment = stock + etfs + bonds + alternatives?': (
  "HIS QUESTION: “Investment = stock + etfs + bonds + alternatives? It does not include cash or cash "
  "equivalents — Right?” Confirming what the Investments total contains, and what it does not."),
 'Benchmark in S&P 500? If that add info dot': (
  "HIS INSTRUCTION: “Benchmark in S&P 500? If that add info dot.” Where a figure is compared against a "
  "benchmark, the screen names WHICH benchmark, behind a tappable explanation."),
 'Re-evaluate the order of wordings': (
  "HIS CORRECTION: “Re-evaluate the order of wordings — e.g. ‘Guaranteed $4200 Social Security + "
  "Pension’. Norm is ‘Social Security + Pension $4200 (Guaranteed)’.” The thing comes first, then the "
  "amount, then the qualifier — the way a person would say it."),
 'What if safe draw is less the big bill': (
  "HIS QUESTION: “What if safe draw is less than the big bill? Where will that information be "
  "available?” The case where what you can afford to draw does not cover a known upcoming cost — and "
  "where the app says so."),
 'Are we using LLM or theseare pre-crafted responses': (
  "HIS QUESTION: “How are responses formulated? Are we using LLM or are these pre-crafted responses "
  "where the app just replaces the figures?” A fair thing to ask of anything that reads like advice."),
 'we should specifiy they can select multiple options': (
  "HIS INSTRUCTION: “‘What did you come for?’ — we should specify they can select multiple options, as "
  "a retired person can still be interested in growing her investments.” The question allows more than "
  "one answer, because people are not one thing."),
 'If user select "just explore"': (
  "HIS QUESTION: “If user selects ‘just explore’ — what are the next few screens they will see?” Every "
  "path out of a choice has to be drawn, including the one that commits to nothing."),
 'your whole picture in one place': (
  "HIS CORRECTION: “‘your whole picture in one place’ — ‘your whole picture’ not clear — maybe ‘your "
  "entire finance picture’ or something? Same for ‘the few things’.” Vague phrases are replaced with "
  "ones that name what they mean."),
 'This does not have refresh date and time': (
  "HIS FINDING: “This does not have refresh date and time.” A figure from a linked account has to say "
  "when it was last true."),
 'Which is the right place?': (
  "HIS QUESTION: “In mock-up 1 the date and time was after ‘your investments’ and before ‘Net Worth’; "
  "here it is after ‘net worth’. Which is the right place?” Two mocks placed the same thing "
  "differently — a drift he caught between versions."),
 'From where comparative data coming?': (
  "HIS QUESTION: “From where is comparative data coming? Do we have an analytical engine built to "
  "analyse all imported data and come up with these insights?” Asking what is actually behind a "
  "comparison before it is shown as a fact."),
 'Plain line - means line graph?': (
  "HIS QUESTION: “Plain line — means line graph?” A description that could mean two things is "
  "ambiguous."),
 'what does screen look like for manual update?': (
  "HIS QUESTION: “what does screen look like for manual update?” Every state has to be drawn, including "
  "the one where a person updates a value by hand."),
 'Review the Add account screen': (
  "HIS INSTRUCTION: “Review the Add account screen to make sure we have a separate screen or a dynamic "
  "screen adjusting by asset class, ensuring we are collecting the right things.” A bond and a house "
  "need different questions — one form for both collects the wrong fields for each."),
 'Cash = cash + cash equivalent?': (
  "HIS QUESTION: “Cash = cash + cash equivalent?” Asked again on another tab — and answered the same "
  "way: cash means cash only."),
 'is the display graph, table, or just numbers?': (
  "HIS QUESTION: “is the display graph, table, or just numbers?” A specification that does not say what "
  "form a figure takes has not specified it."),
 'do we capture only balance or all individual portfolio holding': (
  "HIS QUESTION: “do we capture only balance or all individual portfolio holdings, e.g. AMZN 100 "
  "shares?” A balance alone cannot produce a return, a gain or a dividend — the holdings are needed."),
 'When dividend is captured is it automatically added to income or cash?': (
  "HIS QUESTIONS: “When a dividend is captured is it automatically added to income or cash? Similarly, "
  "is a capital gain captured and displayed somewhere?” Where money lands matters as much as that it "
  "arrived — this is the question behind the later rule that dividends are taxed but not spendable "
  "unless they reach the bank."),
 'Does it capture interest payment for bonds?': (
  "HIS QUESTIONS: “Is it imported directly using Plaid? Also, does it capture interest payment for "
  "bonds?” What comes in automatically and what does not."),
 'Is this manual, imported or connected and captured via Plaid?': (
  "HIS QUESTION: “Is this manual, imported or connected and captured via Plaid?” Which is the question "
  "behind the rule that every figure says where it came from."),
 'Total return captures both realized and unrealized gains?': (
  "HIS QUESTIONS: “Total return captures both realized and unrealized gains? Is there any place we "
  "display realized profit and loss, unrealized profit and loss, total dividend, and total return?” "
  "The four figures an investor expects to see separately."),

 "no built-in tax rates … the person's own rates": (
  "“no built-in tax rates … the person’s own rates, or no number with the reason.” Which account to "
  "draw from first depends entirely on YOUR tax rates, so the app uses yours — or shows no number and "
  "says why."),
 'Is this expandable / collapasable as many people can have 20-30 or more holdings?': (
  "HIS QUESTION: “Is this expandable / collapsable as many people can have 20-30 or more holdings?” A "
  "list that cannot collapse is unusable once it is long."),
 'What’s the objective of "what if"': (
  "HIS QUESTION: “What’s the objective of ‘what if’ — evaluate what if I had bought Nvidia instead of "
  "Amazon 6 months ago, or something different?” Naming what a feature is FOR before it is drawn."),
 'How do we evaluate if something is saved towards retirement': (
  "HIS QUESTION: “How do we evaluate if something is saved towards retirement or some other goals? In "
  "other words is net worth = Retire, or Retire = Assets minus primary home?” This is the question his "
  "later rule answers: everything counts toward retirement EXCEPT the home you live in and the car you "
  "drive."),
 'stocks with dividends - will it also show dividends received?': (
  "HIS QUESTION: “stocks with dividends — will it also show dividends received?” What a holding paid "
  "you is part of how it did, not a separate topic."),
 'If an account is connected but someone adds transaction manually': (
  "HIS QUESTION: “If an account is connected but someone adds a transaction manually — is that allowed, "
  "and how will the reconciliation between captured information work?” The question behind the later "
  "rule: both versions are shown side by side and the person chooses; nothing is merged for them."),
 "What's the flow to add actual day to day expenses": (
  "HIS QUESTION: “What’s the flow to add actual day-to-day expenses such as grocery, gas? Also, what’s "
  "the flow to capture or add income?” Two everyday journeys that had no drawn flow."),
 '"will it last" should it specify that this is about retirement?': (
  "HIS CORRECTION: “‘will it last’ — should it specify that this is about retirement? Right now it is "
  "not clear — what will last, and till when?” A question with no subject and no horizon cannot be "
  "answered by the reader."),
 'Is this a formula used by social security administration?': (
  "HIS QUESTION: “How is the amount calculated by age? Is this a formula used by the Social Security "
  "Administration?” Asking whether a figure follows the actual rules or our approximation of them."),
 'Plain line - means line graph': (
  "HIS QUESTION: “‘Plain line’ means line graph?” A description that could mean two things has not "
  "specified anything."),
 'what does screen look like for manual update': (
  "HIS QUESTION: “What does the screen look like for a manual update?” Every state has to be drawn, "
  "including updating a value by hand."),
 'Cash = cash + cash equivalent': (
  "HIS QUESTION: “Cash = cash + cash equivalents?” Answered: cash means cash only."),
 'is the display graph, table, or just numbers': (
  "HIS QUESTION: “Is the display a graph, table, or numbers?” A specification that does not say what "
  "form a figure takes has not specified it."),

 'stocks with dividends - will it also show dividends received': (
  "HIS QUESTION: “Stocks with dividends — will it show dividends received?” What a holding paid you is "
  "part of how it did."),
 'Foundation layer only shows income, spending, and connected accounts as true picture': (
  "HIS THREE QUESTIONS on the foundation layer: are the connected accounts checking, savings and cards; "
  "how is the rest captured; and what counts as the true picture? A layer that claims to show "
  "everything has to say what it actually reads."),
 'Shall we also talk about - we surface right things at the right time': (
  "HIS ADDITION: “Shall we also talk about — we surface right things at the right time, kind of what "
  "needs your attention.” Surfacing the right thing at the right moment is part of the product, not a "
  "nice-to-have."),
 'Is it one time pull, daily, or initiated by user?': (
  "HIS QUESTIONS: “Is it one time pull, daily, or initiated by user? What if user is hesitant to "
  "connect account in the beginning?” How often data refreshes, and what the app is worth to someone "
  "who connects nothing."),
 'How all this information will be captured and at what frequency?': (
  "HIS QUESTION: “How all this information will be captured and at what frequency?” Including the parts "
  "no connection can reach — cash, and cards that are not linked."),
 "Why retirement number resides in spend tab?": (
  "HIS QUESTION: “Why retirement number resides in spend tab? What’s the logical reason?” A figure "
  "placed where it does not belong makes the tab about something other than its name."),
 'NW, Money, spending all in one screen is that too much?': (
  "HIS QUESTION: “Net worth, Money, spending all in one screen — is that too much?”"),
 'Do not like the name': (
  "“Do not like the name.” A tab name rejected."),
 'How you plan to capture the information?': (
  "HIS QUESTION: “How you plan to capture the information?” Asked of the Home screen — what is behind "
  "each figure it shows."),
 "What's the level of details displayed and how?": (
  "HIS QUESTION: “What’s the level of details displayed and how?” Asked of the investments screen."),
 'How about a scenario do I have enough to support my parents with $2500 per month': (
  "HIS SCENARIO: “do I have enough to support my parents with $2,500 per month, and still save for "
  "kids’ college, pay mortgage, and save for retirement?” Several commitments at once, and what they "
  "together do to his retirement date — which is the real shape of the question, not one goal at a "
  "time."),
 'are month bars cashflows - showing inflow and outflow?': (
  "HIS QUESTION: “are month bars cashflows — showing inflow and outflow?” A chart that does not say "
  "what it plots has not said anything."),
 "Overview doesn't reflect the 36-65 objective": (
  "HIS FINDING: “Overview doesn’t reflect the 36-65 objective — whole picture, led by investment and "
  "net-worth growth.” The document described a different product from the one agreed."),
 "Also talk about surfacing the right things at the right time": (
  "HIS ADDITION: “Also talk about surfacing the right things at the right time — what needs you.”"),
 'Connect: one-time / daily / user-initiated?': (
  "HIS QUESTIONS: “Connect: one-time / daily / user-initiated? What if a user is hesitant to connect at "
  "first?”"),
 'what about cash / unconnected cards?': (
  "HIS QUESTION: “How is income + spending captured, at what frequency, and what about cash / "
  "unconnected cards?” The parts no connection reaches still have to be captured somehow."),
 "Does 'Grow & Track' also answer can-I-afford a home": (
  "HIS QUESTION: “Does ‘Grow & Track’ also answer can-I-afford a home / kids’ college / help my "
  "parents?” What a section is FOR, asked before it is built."),
 'Why does the will-it-last number live in the Spend tab?': (
  "HIS QUESTION: “Why does the will-it-last number live in the Spend tab?” — noting it reads as "
  "retiree-centric, on a tab about spending."),
 'Net worth + money + spending all on one tab -- too much?': (
  "HIS QUESTION: “Net worth + money + spending all on one tab — too much?”"),
 "Don't like the 'Spend' tab name": (
  "“Don’t like the ‘Spend’ tab name.” Rejected."),
 "Don't like the 'Guide' tab name": (
  "“Don’t like the ‘Guide’ tab name.” Rejected."),
 'Home: how do you capture the information?': (
  "HIS QUESTION, of Home: “how do you capture the information?”"),
 'Invest: what level of detail, and how?': (
  "HIS QUESTION, of the investments screen: “what level of detail, and how?”"),
 'support parents $2,500/mo AND college AND mortgage': (
  "HIS SCENARIO: “support parents $2,500/mo AND college AND mortgage AND keep saving for retirement — "
  "effect on my retirement date / paycheck?” Several commitments together, and what they do to the "
  "date and the paycheck."),
 'Are the month bars cash flows -- inflow / outflow?': (
  "HIS QUESTION: “Are the month bars cash flows — inflow / outflow?”"),
 'DECISION: tab names + the 5-tab spine': (
  "DECISION: the tab names, and five tabs as the spine of the app."),
 'DECISION: order tabs by what each group cares about': (
  "DECISION: the tabs are ordered by what each audience cares about most — not by what is easiest to "
  "build or by what came first."),
 'DECISION: can the user choose which modules are in the bottom bar?': (
  "DECISION put to him: can the person choose which modules sit in the bottom bar?"),
}


def _norm(t):
    """Strip the quote marks and collapse the spaces before matching.

    THE WHOLE CLASS OF DEAD KEY (2026-09-29). A key written as 'no design created for Goals and
    Prepare tabs' matched nothing, because the source says ...tabs.' — a full stop INSIDE his quotes.
    Nineteen keys died that way across two batches, each one a sentence written and reaching nobody,
    and the count read as written. Normalising both sides ends it rather than fixing them one at a
    time; the dead-key guard in extract-decisions.py catches whatever is left.
    """
    t = re.sub(r'[\u2018\u2019\u201c\u201d\'"`]', '', str(t or '').lower())
    return re.sub(r'\s+', ' ', t)


def hand_written_for(primary, body=''):
    """THE KEY MUST BE WHAT THE ROW IS ABOUT, not a phrase buried in its body (2026-09-29).

    Matching anywhere in the text attached the hide-balances answer to a row about creating a folder,
    and the "spouse" answer to a nine-part ruling that merely used the word. A wrong answer is worse
    than a blank one: it reads as written and is not.

    So a key must appear in the row's HEADLINE — the sheet name or his own words — which is what the
    row is about. A key long enough that an accidental match is implausible (40 characters or more)
    may also match the body, because those are usually his sentence quoted from the body itself.

    The LONGEST key that fits wins, never the first one written: an answer that depends on where I
    happened to type it in this file is an answer nobody can check.
    """
    head, rest = _norm(primary), _norm(body)
    best, best_len = None, -1
    in_body = []
    for phrase, written in HAND_WRITTEN.items():
        n = _norm(phrase)
        if not n:
            continue
        if n in head and len(n) > best_len:
            best, best_len = written, len(n)
        elif n in rest:
            in_body.append((len(n), phrase, written))
    if best is not None:
        return best
    # NOTHING IN THE HEADLINE. A body match is trusted only when it is UNAMBIGUOUS — exactly one key
    # in the whole file matches this row's body. Both false positives found on 2026-09-29 were rows
    # where SEVERAL keys matched the body and the longest won: a row about creating a folder took the
    # hide-balances answer, and a nine-part ruling took the "spouse" answer because it used the word.
    # One match and one only is evidence; the longest of several is a coincidence.
    if len(in_body) == 1 and in_body[0][0] >= 25:
        return in_body[0][2]
    return None


def split_decisions(text):
    """A ROW CAN HOLD SEVERAL DECISIONS, and he asked for them numbered. The changelog separates them
    with a semicolon, or an em dash before a lower-case clause. A fragment under 25 characters is a
    trailing note rather than a decision, so it stays attached to the one before it."""
    t = str(text or '').strip()
    parts = [p.strip(' ;—-.') for p in re.split(r';\s+|\s+—\s+(?=[a-z0-9])', t)
             if p and p.strip(' ;—-.')]
    out = []
    for p in parts:
        if out and len(p) < 25:
            out[-1] = out[-1] + ' — ' + p
        else:
            out.append(p)
    return out


def what_is_the_decision(primary, body=''):
    """(the answer for the column, written_by_hand)."""
    hand = hand_written_for(primary, body)
    if hand:
        return hand, True
    parts = split_decisions((str(primary or '') + ' \u2014 ' + str(body or '')).strip(' \u2014'))
    numbered = parts[0] if len(parts) <= 1 else '\n'.join(f'{i}. {p}.' for i, p in enumerate(parts, 1))
    return ('NOT YET WRITTEN IN PLAIN ENGLISH \u2014 below is the record as it was written, split into its '
            'separate decisions and numbered. It has not been rewritten into words a person can read, so '
            'do not treat it as the decision until it has.\n\n' + numbered), False


# ── OLD DECISIONS ARE MARKED, NOT NARRATED (founder, 2026-09-29) ─────────────────────────────────
# *"just make decision mark old and not in use, see row for latest decision."*
#
# A superseded decision is not a story; it is a STATE. It had been written into the plain English,
# where it cannot be sorted or filtered and where it sits underneath the one fact that decides
# whether to act on the row at all. It now has its own column, naming the row that replaced it. The
# row is never deleted (his standing order) — an old build has to stay readable.
#
# Keyed phrase → the phrase of the decision that REPLACED it.
SUPERSEDED_BY = {
 '"Everything you own and owe, in one place': 'First bullet CLOSED',
 'First bullet FINAL: "All your assets and debts in one place"': 'First bullet CLOSED',
 'ONE ACCOUNT-NAMING RULE ADOPTED': 'THE NAMING RULE REFINED BY THE FOUNDER',
 'PROVIDER PIVOT: SnapTrade OUT': 'Provider pivot ON HOLD',
 'Retirement verdict wording: working': 'THREE SCREENS SAID ONE NUMBER THREE WAYS',
 'FOUNDER SETTLED THE PLAN ARCHITECTURE': 'FOUNDER VERDICT ON THE BUILT SCREEN',
 'IT should show for people between age group 60 and 67':
     'The founder ruled the claim decision belongs to ages 60 to 70',
 'odds: more than 400 paths, nearest 5': 'per the latest ruling use exact everywhere no rounding for odds',
 "the odds row's words: no band, 1,000 futures, nearest 5":
     'per the latest ruling use exact everywhere no rounding for odds',
 'we cannot have screen without title': 'I take back title not need for every screen',

 # ── FOUND BY HIM, 2026-09-29, reading the launch answer list ────────────────────────────────────
 # "DEC-0004 - still talk about spending tab, and month's total - new mockup - has expense tab and
 #  three sections recurring, planned and actual expenses."
 #
 # He is right. The Spending tab does not exist: his approved cash-flow_v01 has an EXPENSES tab with
 # Monthly recurring expenses, Planned expenses and Actual expenses. The row described a screen that
 # was redrawn twice after it — renamed by his synonym ruling, then redrawn in the mock he approved —
 # and it was still marked IN USE, which is why it reached a list asking him to confirm its wording.
 #
 # WHAT SURVIVED IT, and why the row is superseded rather than deleted: its source labels are still
 # in the design ("Entered by hand", "receipt"). A decision is never deleted — an old build has to
 # stay readable — so it is marked OLD and points at the design in force.
 # keyed on the SOURCE text of each row, not on my plain sentence — the lookup reads the source,
 # so a key taken from my own writing matches nothing and the mark silently does not take.
 'Spending tab conformance': 'cash-flow mocks combined into one file',
}


def superseded_by_phrase(text):
    """The phrase of the decision that replaced this one, or None if this one still stands."""
    hay = _norm(text)
    for phrase, replacement in SUPERSEDED_BY.items():
        if _norm(phrase) in hay:
            return replacement
    return None


# ── THE PLAN IS ON THE ROW, NOT IN A MESSAGE (his two questions, 2026-09-28) ─────────────────────
# "what's the plan to improve the confidence?" and "what's the plan to test them?" A plan given in
# chat is exactly the thing this file exists to stop: it lives in one place, nothing checks it, and
# it is forgotten. So each row carries its own next step, and the counts fall on every build.

def confidence_plan(row):
    """For a row whose confidence is LOW — where his own words should be looked for, in order."""
    if not str(row.get('confidence', '')).startswith('LOW'):
        return ''
    d = str(row.get('decided') or '')
    where = ['1. SWEEP THE FOUR SOURCES STILL OUTSTANDING — his -jj feedback workbooks and the audit '
             'files, the standards, the requirements workbooks, and the mock files’ "what changed" '
             'blocks. A decision recorded as "what I built" in the changelog is often quoted properly '
             'in one of those, and the sweep lifts the row to HIGH with no question to him.']
    if d < '2026-08-01':
        where.append('2. THIS ONE IS FROM JULY, before the rulings ledger existed — look in the '
                     'build-43 and build-47 feedback workbooks and the July device-test sheets, which '
                     'is where his wording from that period lives.')
    else:
        where.append('2. Look in the audit workbook for the build it belongs to, and in the second-'
                     'verification assessment — his column I is where he wrote in his own words.')
    where.append('3. ONLY WHAT IS LEFT GOES TO HIM. A short list of rows where no file holds his '
                 'words, each showing what I believe he decided, for a yes or a correction. Never the '
                 'whole 41 — asking him to re-decide what he already wrote down is the fault, not the fix.')
    return '\n'.join(where)


def proof_plan(row):
    """What proof this decision needs, and how it gets one — by KIND, because one guard covers many.

    CLASSIFIED FROM THE PLAIN ENGLISH, not the raw record (2026-09-29). The raw text is a changelog
    entry: it names files, identifiers and test names, so a rule about a tab name matched "A FIGURE"
    because the entry happened to contain a number. The plain sentence says what the decision IS,
    which is the only thing that decides what would prove it. Classifying from the noise produced a
    plan that looked precise and pointed at the wrong work.
    """
    if row.get('proof') and not str(row.get('proof')).startswith('NONE NAMED'):
        return 'Proved — the test is named in the proof column.'
    t = (str(row.get('plain') or '') + ' ' + str(row.get('his_words') or '')).lower()

    # a question he asked is not a decision — nothing to prove until it is answered
    if re.search(r'^his question|^his questions', t):
        return ('A QUESTION HE ASKED, not a decision — so there is nothing to test yet. It is proved '
                'when it is answered and the answer becomes its own row.')
    if re.search(r'^his finding|^his correction', t):
        return ('SOMETHING HE FOUND. Its proof is a test that fails if the defect comes back — written '
                'against the case he described, in his words, so the test says why it exists.')
    if re.search(r'\bmock\b|approved as drawn|design|drawn|redraw|wireframe|\bv\d{1,2}\b', t):
        return ('A DESIGN APPROVAL. Its proof is the mock-match audit — every visible string, in order, '
                'diffed against the built screen — plus a row in the design record naming which version '
                'each screen was built from. Worked per SCREEN: one audit closes every design decision '
                'on that screen at once.')
    if re.search(r'one word|the word is|wording|says|reads|renamed|retired|phrase|sentence|label|title', t):
        return ('COPY. Most of this class is ALREADY held by the one-term-per-concept guard, which reads '
                'the agreed word list rather than hard-coding it. The work is adding this row\'s word to '
                'that list — so the class closes in batches, not one test at a time.')
    if re.search(r'\$[\d,]|\bper cent\b|%|figure|total|rate|amount|rounding|decimal|precision|calculat', t):
        return ('A FIGURE. Its proof is a WORKED EXAMPLE declared on the figure and run through the real '
                'orchestrator on every build — the machinery finished on 2026-09-28. Do these first: a '
                'wrong number is the one thing that loses trust irrecoverably.')
    if re.search(r'screen|tab|band|row|section|order|colour|color|chip|dot|bar|layout|button|door', t):
        return ('A SCREEN. Its proof is a rendered-strings test, or one of the guards that already exist '
                '— edge-to-edge bands, 20-point titles, the type floor. Several of these are already held '
                'by a guard that does not name them.')
    if re.search(r'folder|file|standard|naming|record|changelog|filed|process|brief|tracker|gate|build', t):
        return ('A FILE or A PROCESS. Its proof is an `expect` file-check read against the built file '
                'after every build — the mechanism already running for 38 decisions — or a gate script. '
                'One line each.')
    return ('NEEDS READING. The plain sentence does not say what would prove it. It goes on the list to '
            'read against its source, and until then it is not claimed as proved.')


# ── WHOSE DECISION IS IT (2026-09-29) ────────────────────────────────────────────────────────────
# Of the 41 rows whose wording was never captured, SIX are not decisions of his at all: they are my
# own engineering, recorded in a changelog whose "Approved by" column said JJ because that is what
# that column said for everything that day. Putting them on a list asking him to confirm his wording
# would be asking him to own work he never saw.
#
# Named ONE BY ONE, never by a rule (his standing order: no blanket decisions). Each is here because
# I read the row and it describes code I wrote, with no judgement of his in it.
NOT_HIS_DECISION = {
 'Deleted taxableIncome': 'the two tax engines collapsed into one — my refactor; zero numbers moved',
 'Onboarding no longer defines takeHomeMonthly': 'one take-home producer — my fix for a defect I found',
 'one_name_one_function.test.ts now also reads src/screens': 'a guard of mine widened after it reported clean too narrowly',
 'New src/domain/income/salary-months.ts': 'months keyed by date — my fix for the January-in-the-wrong-year defect',
 "Every 'today' stamp in src/ now uses": 'the local-day fix — my correction of a timezone defect',
 "invest_fcc.test.tsx: the bond's value_as_of was pinned": 'a test fixture of mine that aged past a staleness line',
}


def whose_decision(text):
    """('HIS' | 'MINE', why) — mine means engineering recorded under his approval column by habit."""
    hay = _norm(text)
    for phrase, why in NOT_HIS_DECISION.items():
        if _norm(phrase) in hay:
            return 'MINE', why
    return 'HIS', ''
