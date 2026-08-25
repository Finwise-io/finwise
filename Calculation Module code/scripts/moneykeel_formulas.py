MATH = {
'NET_WORTH':'net worth = Σ(all asset balances) − Σ(all debt balances)',
'NET_WORTH · DEBT_PICTURE':'net worth = Σ(assets) − Σ(debts);  debts = Σ(remaining balance of each debt)',
'TOTAL_CASH':'cash = Σ(balance of each account whose class = Cash)',
'TOTAL_INVESTMENTS':'investments = Σ(balance of each account whose class ∈ {brokerage, retirement, other investments})',
'TOTAL_INVESTABLE · TOTAL_CASH':'investable = cash + investments  (excludes home and belongings)',
'ACCOUNT_SHARE_OF_TOTAL':'assets = Σ(balance of every account);  share of an account = balance ÷ assets',
'ACCOUNT_SPLIT':'for one account: value in class k = balance × weight(k), where Σ weight(k) = 1',
'ALLOCATION_BY_CLASS':'value in class k = Σ(balance of accounts in class k);  share(k) = value(k) ÷ Σ value',
'HAND_VALUE_AGE':'value = the balance last recorded;  age = today − date it was recorded',
'HISTORY_DEPTH':'records = count(transactions held for this account)',
'DEBT_PICTURE':'owed = Σ(remaining balance);  monthly debt payments = Σ(required payment of each debt)',
'DEBT_REQUIRED_PAYMENT':'required payment = the stated minimum, or interest + 1% of balance when none is stated',
'DEBT_PAYOFF':'each month: balance ← balance × (1 + rate ÷ 12) − payment, until balance ≤ 0;  payoff month = the first month it does',
'TREND_SERIES':'the line is the recorded net worth at each point;  change over the year = net worth today − net worth at the first point of the year',
'NW_CHANGE_PCT':'return = (investable now − investable then) ÷ investable then — money paid in or taken out is NOT removed, so a deposit shows up as a gain',
'NW_CHANGE_WALK':'ending = beginning + money in − money out + income − costs + market change  (the identity that must close)',
'VALUE_WEIGHTED_RETURN':'return = (ending − beginning − net money in) ÷ (beginning + net money in weighted by when it arrived)',
'MODIFIED_DIETZ (Calculation Module code/engines/window-return.ts)':'r = (EMV − BMV − F) ÷ (BMV + Σ(Fᵢ × wᵢ)),  wᵢ = (days in window − days before flow i) ÷ days in window',
'PERFORMANCE_TABLE':'per account: ending;  per category: earned = Σ(ending − beginning − net money in);  return = earned ÷ average value held',
'BENCHMARK_RETURN_BLENDED':'benchmark return = Σ(weight of each class × that class’s index return over the same window)',
'PRICE_FRESHNESS':'age = now − the moment prices were last fetched;  stale when age > the freshness limit',
'HOLDING_MARKET_VALUE':'value = quantity × latest price',
'HOLDING_SHARES':'quantity = Σ(shares bought) − Σ(shares sold)',
'HOLDING_COST_BASIS':'total paid = Σ(shares in each lot × price paid in that lot);  average = total paid ÷ quantity',
'HOLDING_CAP_GAINS':'per lot: gain = shares × (price − cost per share);  long-term if the lot was held ≥ 365 whole days, otherwise short-term;  a lot with no cost recorded is skipped',
'REALISED_GAIN':'realised gain = Σ over sales of (proceeds − cost of the shares sold, oldest first)',
'BOND_FACTS':'face, coupon rate and maturity as recorded;  bonds total = Σ(value of each bond),  face total = Σ(face)',
'BOND_FACTS · BOND_COUPON':'annual coupon = face × coupon rate',
'BOND_COUPON':'annual coupon = face × coupon rate',
'BOND_CURRENT_YIELD':'current yield = annual coupon ÷ current value',
'BOND_YEARS_LEFT':'years to maturity = (maturity date − today) ÷ 365',
'BOND_YIELD_TO_MATURITY':'y solves: value = Σ(coupon ÷ (1+y)ᵗ) + face ÷ (1+y)ⁿ,  t = 1…n years to maturity',
'BOND_RATE_SENSITIVITY':'change in value ≈ − duration × change in rate × value',
'ALTERNATIVES_TOTAL':'total = Σ(recorded value of each alternative holding)',
'ALTERNATIVES_GROWTH':'estimated growth a year = Σ(value × its stated growth rate)',
'TOTAL_INCOME':'gross a year = salary + self-employment + bonus + equity vesting + rental + other;  net a month = (gross − tax withheld − pre-tax contributions) ÷ 12',
'RENTAL_INCOME_A_YEAR':'rental net a year = rent received − running costs',
'EMPLOYER_MATCH':'match a year = the employer’s stated rate × pay, capped at the stated limit',
'SPENDING_BY_KIND':'spent in a bucket = Σ(expenses this month in that bucket);  debt payments are excluded',
'PLANNED_SPENDING':'planned a month = Σ(each category’s planned amount);  remaining = planned − spent',
'SPENDING_BY_KIND · DEBT_REQUIRED_PAYMENT':'money out = Σ(expenses this month) + Σ(required debt payments)',
'TAXABLE_INCOME':'taxable income = gross income − pre-tax contributions − the deduction for the filing status and age',
'TAX_ON_CONVERSION':'extra tax ≈ Σ over bands of (amount converted falling in that band × its rate)',
'PRE_TAX_BALANCE':'pre-tax balance = Σ(balance of accounts whose tax type = pre-tax)',
'CONTRIBUTION_ROOM':'room left = the year’s limit − what has already gone in;  per month = room left ÷ months left in the year',
'CREDIT_USE':'use = balance ÷ credit limit',
'GOAL_PROGRESS':'to go = target − saved;  progress = saved ÷ target',
'GOAL_CAPACITY':'typical free cash a month = median over recent months of (money in − money out)',
'SINKING_FUNDS':'set aside a month = Σ(each non-monthly cost ÷ months until it falls due)',
'BIG_COSTS':'total = Σ(each big cost);  each one lands in the year it is dated',
'EDUCATION_COST':'future cost = today’s cost × (1 + education inflation)^years;  monthly needed = gap ÷ months until school starts',
'INSURANCE_NEED':'need = income to replace × years + debts + goals + final expenses;  gap = need − cover already held',
'JOB_SAFETY_RUNWAY':'runway in months = cash ÷ essentials a month;  target = months wanted × essentials a month',
'STRESS_TEST':'cash after = cash − the shock;  runway after = cash after ÷ essentials a month',
'THE_BILL_CALENDAR':'each bill falls on its stated day;  the month’s bills = Σ(amounts due in that month)',
'RETIREMENT_INCOME':'guaranteed income a month = Social Security + pension + annuity + any other stated stream',
'RETIREMENT_INCOME_NOW':'guaranteed income now = Σ(streams already being received)',
'GUARANTEED_STREAMS (engines: B1 rebuild)':'each stream grows on its own rule: Social Security rises with inflation, a fixed pension does not',
'SS_BENEFIT_AT_AGE':'benefit at claim age = the statement amount at full retirement age × the claim factor for that age',
'SS_CLAIM_FACTOR · SS_BENEFIT_AT_AGE':'factor = 1 − 5/9% per month for the first 36 months early, − 5/12% per month beyond that; + 2/3% per month for each month claimed late up to 70',
'SS_LIFETIME_TOTAL':'lifetime total = monthly benefit × 12 × (life expectancy − claim age)',
'RETIREMENT_PAYCHECK':'paycheck a month = guaranteed income + the draw from savings',
'RETIREMENT_SPENDING':'spending in retirement a month = what is spent today × the share expected to continue',
'REQUIRED_WITHDRAWAL':'required = balance on 31 December last year ÷ the life-expectancy factor for this age',
'RMD_START_AGE (Calculation Module code/engines/rmd.ts)':'start age = 73 for those born 1951–1959, 75 for those born 1960 or later;  Roth 401(k) is exempt',
'POT_AT_RETIREMENT':'pot = balance × (1 + r)^n + Σ(contribution × (1 + r)^(n − year)),  n = years to retirement',
'WILL_IT_LAST_INPUTS':'the inputs one plan is built from: what is held, what will be spent, what is guaranteed, and what is still being saved',
'WILL_IT_LAST_RESULT':'run 1,000 futures; in each year: balance ← balance × (1 + random return) − (spending − guaranteed income);  odds = futures that never run out ÷ 1,000',
'WHAT_THE_PLAN_STILL_NEEDS':'missing = the inputs with no answer;  counted = Σ(balances already in)',
'LOOK_BACK':'stayed = value × (1 + return of what is held);  moved = value × (1 + return of the alternative);  difference = moved − stayed',
'TOTAL_CASH · PLANNED_SPENDING':'months of cushion = cash ÷ essentials a month',
}
SCREEN = {
'worked out on the screen: money in − spent so far':'left to spend = money in this month − spent so far',
'worked out on the screen: spent so far ÷ money in':'share spent = spent so far ÷ money in this month',
'worked out on the screen: expected in − planned out':'planned surplus = expected in − planned out',
'worked out on the screen: in − out':'surplus = money in − money out',
'worked out on the screen: in − out − what the Plan committed':'free to use = money in − money out − Σ(monthly amounts the Plan committed)',
'worked out on the screen: cash ÷ a typical month of essentials':'cushion in months = cash ÷ essentials a month',
'worked out on the screen: guaranteed + draw from savings':'paycheck = guaranteed income + draw from savings',
'worked out on the screen: total − what has been itemised':'left to itemise = the account total − Σ(holdings entered)',
'worked out on the screen: room left ÷ months left':'per month = room left ÷ months left in the year',
'worked out on the screen: after − before':'difference = pot after the change − pot before it',
'worked out on the screen: required − taken so far':'still to take = required this year − taken so far',
}
NOTDOC = {
'NOT IN OLD MASTER — budgetVsActual, src/domain/budget':('spent(bucket) = Σ(expenses dated in this month in that bucket, debt payments excluded);  remaining = planned − spent',
  'Adds up this month’s logged expenses by bucket and sets each against what was planned. Debt payments are deliberately left out, because debt is tracked on its own.'),
'NOT IN OLD MASTER — incomeMonthlyGrid, src/domain/income':('money in month m = salary(m) + tips(m) + rental ÷ 12 + bonus(m) + equity vesting(m) − withholding(m) − pre-tax contributions(m)',
  'Builds twelve months of money in, one month at a time. Salary comes from the per-month table, equity lands in the months it vests, the bonus lands in its own month, and each month has its own withholding rate.'),
'NOT IN OLD MASTER — milestoneCrossed, src/domain/milestones.ts':('crossed when net worth ≥ the next round mark above the highest mark already seen',
  'Notices when net worth passes a round number for the first time, and remembers the highest one already shown so the same milestone is never announced twice.'),
'NOT IN OLD MASTER — useInsights, src/domain/insights':('each insight scores its own dollars at stake; the list = the highest few, ranked',
  'Works out what is worth saying today, puts a dollar amount against each, and shows the few that matter most.'),
'NOT IN OLD MASTER — retirementPaycheckYear, src/domain/paycheck':('for each month: guaranteed total = Σ(streams live that month);  paycheck = guaranteed total + safe draw',
  'Builds the retirement paycheck month by month: what is guaranteed that month, plus what can safely be drawn from savings.'),
'NOT IN OLD MASTER — the by-month grid, src/domain/cashflow':('for month m: expected in = Σ(income landing in m);  planned out = Σ(bills and planned spending dated in m);  planned surplus = expected in − planned out',
  'Lays the year out month by month so a month with a big bill in it can be seen before it arrives.'),
'NOT IN OLD MASTER — the big-bill radar, src/domain/cashflow':('a bill is flagged when its amount is large relative to a typical month and it falls within the horizon shown',
  'Points out the big one-off bills coming up, so they are not a surprise.'),
'NOT IN OLD MASTER — the unusual-spend check, src/domain/budget':('flagged when an expense is well above the usual amount for its category',
  'Marks a single expense that sits well above what that category normally costs.'),
'NOT IN OLD MASTER — the received list, src/domain/income':('each payment recorded this month, with its date and source',
  'Lists what has actually been received this month, rather than what was expected.'),
'NOT IN OLD MASTER — the equity schedule, src/domain/income':('equity a year ÷ the vest months it lands in, by the stated weights',
  'Spreads stock that vests across the months it actually vests in, rather than smoothing it over the year.'),
'NOT IN OLD MASTER — plan commitments, src/domain/planning':('Σ(monthly amount of each goal the Plan has committed to)',
  'The monthly amounts the Plan has already promised to goals, so cash flow can show what is genuinely free.'),
'NOT IN OLD MASTER — saved scenarios, src/domain/scenarios':('count of scenarios saved',
  'How many what-if scenarios have been saved.'),
'NOT IN OLD MASTER — the outflow watch, src/domain/insights':('flagged when money left an account and has not arrived anywhere else',
  'Notices money leaving an account so it can be asked about rather than quietly lost.'),
}
OTHER = {
'the ledger sum of interest and dividends for the account':('income = Σ(interest + dividends recorded on this account in the period)','Adds the income lines the ledger holds for this account over the period shown.'),
'the ledger sum for that holding':('income = Σ(income lines recorded against this holding)','Adds the income the ledger holds for that one holding.'),
'the ledger sum of dividends over twelve months':('dividends = Σ(dividend lines in the last 12 months)','Adds the dividends recorded for this holding over the last twelve months.'),
'the price feed, with its freshness':('price = the latest close from the feed, with the time it was fetched','The most recent price the feed gave, carrying the moment it was fetched so staleness can be shown.'),
'the account balance being itemised':('the balance of the account being broken into holdings','The single account total that the holdings entered must add up to.'),
'the amount the person chose':('the value typed by the person','A number the person entered; no calculation.'),
'the amounts the person chose':('the values typed by the person','Amounts the person entered; no calculation.'),
'the age the person chose':('the age set by the person','An age the person set on a dial; no calculation.'),
'the worked example used until a real statement goes in':('a stated example amount, shown labelled as an example','A worked example shown in place of a real Social Security statement, always labelled as such.'),
'the by-month grid':('see the by-month grid','The month-by-month view of money in and money out.'),
}

WORDS = {
'ALTERNATIVES_TOTAL':'Adds up the recorded value of every alternative holding — the things with no market price of their own.',
'ALTERNATIVES_GROWTH':'Applies each alternative holding\'s own stated growth rate to its value and adds the results. An estimate, and labelled as one.',
'BIG_COSTS':'Adds up the one-off costs the person has told us about, each sitting in the year it is expected.',
'BOND_RATE_SENSITIVITY':'Shows roughly what a one percent move in interest rates would do to the bond\'s value. Longer to maturity means a bigger swing. An illustration, not a forecast.',
'CONTRIBUTION_ROOM':'Takes the year\'s legal limit for the account, subtracts what has already gone in, and divides what is left by the months remaining.',
'CREDIT_USE':'The balance on the card against its limit — the share of the line being used.',
'DEBT_PAYOFF':'Runs the debt forward month by month: interest is added, the payment is taken off, and the month the balance reaches zero is the payoff date.',
'EDUCATION_COST':'Grows today\'s cost of school by education inflation to the year it starts, then divides what is still missing by the months until then.',
'GOAL_CAPACITY':'Looks at recent months and takes the typical amount left after money in and money out — what could realistically be saved, not the best month.',
'GOAL_PROGRESS':'What has been put aside against the target, and what is still to go.',
'GUARANTEED_STREAMS (engines: B1 rebuild)':'Each guaranteed stream grows on its own rule: Social Security rises with inflation, a fixed pension stays flat. They are never grown together.',
'INSURANCE_NEED':'Adds the income that would need replacing for the chosen number of years to debts, goals and final expenses, then subtracts cover already held.',
'JOB_SAFETY_RUNWAY':'How many months of essential bills the cash on hand would cover with no pay coming in.',
'MODIFIED_DIETZ (Calculation Module code/engines/window-return.ts)':'A return that accounts for WHEN money moved in or out: each flow is weighted by how much of the window it was invested for. Refused, with the dollar walk shown instead, when the timing matters too much for one percentage to be honest.',
'PRE_TAX_BALANCE':'Adds the balances of accounts whose money has not been taxed yet — the pot a Roth move would come from.',
'REQUIRED_WITHDRAWAL':'The amount the law requires to be taken out this year: last 31 December\'s balance divided by the life-expectancy factor for the person\'s age.',
'RETIREMENT_PAYCHECK':'Builds the monthly paycheck in retirement: what is guaranteed that month, plus what can be drawn from savings without breaking the plan.',
'RMD_START_AGE (Calculation Module code/engines/rmd.ts)':'The age required withdrawals begin, from one dated table: 73 for those born 1951 to 1959, 75 for those born in 1960 or later. A Roth 401(k) is exempt.',
'SINKING_FUNDS':'Takes the costs that do not arrive monthly and spreads each one across the months until it falls due.',
'SS_LIFETIME_TOTAL':'The monthly Social Security check multiplied out to a life expectancy, so claiming early and claiming late can be compared in total dollars.',
'STRESS_TEST':'Takes a one-off hit out of the cash on hand and shows what would be left and how many months of essentials it would cover.',
'TAX_ON_CONVERSION':'The extra tax a Roth conversion would cause: the converted amount is stacked on top of this year\'s income and taxed band by band.',
'THE_BILL_CALENDAR':'Places each recurring bill on the day of the month it falls, so the shape of the month can be seen.',
}

# Findings still to address, and decisions already taken — keyed by engine name.
FINDINGS = {
'HOLDING_MARKET_VALUE':'OPTIONS: value is quantity × price with no contract multiplier. An option is 100 shares per contract unless the broker states otherwise, so an option position may be reported at one hundredth of its real value. The ledger normalises a TRADE so units × price equals the broker\'s cash figure, but the holdings path does not. TO VERIFY AND FIX.',
'HOLDING_COST_BASIS':'OPTIONS: same contract-multiplier question as market value — cost per share × shares, with no ×100 for a contract. TO VERIFY.',
'HOLDING_CAP_GAINS':'OPTIONS: gain per lot = shares × (price − cost), again with no contract multiplier. TO VERIFY. Separately: a lot with no recorded cost is skipped, so a position of skipped lots reports no gain at all rather than saying it cannot tell.',
'HOLDING_SHARES':'OPTIONS: quantity is held in contracts for options and in shares for stock, in the same field, with nothing marking which. Anything multiplying quantity by price inherits the ambiguity.',
'NW_CHANGE_PCT':'The line is labelled "Return on cash + investments" but is computed as (now − then) ÷ then with NO adjustment for money paid in or taken out. Move $50,000 in and it reports a gain. Either the label is wrong or the formula is — founder\'s call.',
'POT_AT_RETIREMENT':'The Net worth screen builds this projection WITHOUT the person\'s big costs, while Cash flow, Budget, Goals and Social Security timing all include them. Same person, same day, two different nest eggs. Seen in the code; not yet confirmed on screen.',
'TREND_SERIES':'The daily and monthly points are synced, but the DAILY RECORD they are checked against is not. On a second device the trend survives and the walk behind it does not.',
'NW_CHANGE_WALK':'Beginning values are read from the daily record, which never leaves the phone. On a new device there is no beginning, so the walk back-solves one or refuses.',
'REALISED_GAIN':'Reads the transaction ledger, which is device-only. On a second device it reports nothing — not because nothing was sold, but because the record is elsewhere.',
'PRICE_FRESHNESS':'Prices are never synced, so freshness is per device. Two devices can legitimately disagree about how current a value is.',
'ACCOUNT_SPLIT':'Reported by the 54-item audit as one of the places a total and its parts can disagree; the reconciliation assertion now catches it, but the screen has no way to say so yet.',
'WILL_IT_LAST_RESULT':'The odds shown on Home, Plan and Cash flow are rounded to the nearest 5, while the compare tables still show them exact. One figure, two precisions — founder\'s open question.',
'TOTAL_CASH':'Money-market funds are deliberately NOT counted as cash. Any institution that reports a sweep as a fund will therefore land in investments — worth watching per provider.',
}
DECISIONS = {
'__ALL__':'DISPLAY (founder, 2026-08-22): every number is held as a float internally. Decimals are SHOWN only for prices of stocks, bonds and options, for interest and dividend rates, and for expenses. Everything else displays whole dollars. ROUNDING (rule R6): round once, at the edge, never in the middle.',
'HOLDING_MARKET_VALUE':'A price is a ratio, not money: it keeps eight decimal places and is never rounded to cents. Rounding a Treasury bill price of $0.9888 to $0.99 invented $276 of gain on one row.',
'HOLDING_COST_BASIS':'Cost basis comes from recorded lots. A lot with no cost is skipped rather than treated as free shares, because free shares would report the whole value as gain and tax it.',
'HOLDING_CAP_GAINS':'Long-term is decided by DAYS, not calendar months (correction E7): 335 days used to count as long-term and be taxed at the lower rate.',
'TOTAL_CASH':'Cash means checking, savings, high-yield savings and the uninvested sweep at a broker. Money-market funds are investments, because they pay dividends and are measured with the investments (founder, 2026-08-04).',
'NET_WORTH':'Assets minus debts, computed each time and never stored as a third number that could disagree with its own halves. A genuine negative is shown, never floored at zero.',
'REQUIRED_WITHDRAWAL':'One dated table. Start age is 73 for those born 1951–1959 and 75 for those born 1960 or later; a Roth 401(k) is exempt (fix B4).',
'RMD_START_AGE (Calculation Module code/engines/rmd.ts)':'The same one dated table, after both earlier copies were deleted.',
'SS_BENEFIT_AT_AGE':'The amount a person types from their statement is the amount at THEIR full retirement age, not at 62 and not at 70 (fix B2). The full-retirement age itself comes from a birth-year table, to the month.',
'GUARANTEED_STREAMS (engines: B1 rebuild)':'Each stream grows on its own rule: Social Security rises with inflation, a fixed pension stays flat. They are never inflated together (fix B1).',
'RETIREMENT_PAYCHECK':'Withdrawals, including required ones, are NOT counted as guaranteed income — counting money coming out of the pot as income would count the same dollars twice (fix B5).',
'WILL_IT_LAST_RESULT':'One thousand futures, and the odds are rounded to the nearest 5. A genuine 100 or 0 is shown literally; 98 shows as 95, never as 100 (fix B6). The best-to-worst band was removed.',
'POT_AT_RETIREMENT':'The recommended nest egg is 25× the yearly spending not covered by guaranteed income, counted from the start of the retirement year — which is why it differs from an outside calculator.',
'MODIFIED_DIETZ (Calculation Module code/engines/window-return.ts)':'When the timing of money moving in or out drives the percentage more than the investments do, the figure is REFUSED and the dollar walk is shown instead.',
'TAXABLE_INCOME':'Explicit tables per filing status. A married band is not twice the single band — the 37% band starts at $768,700, not at double the single figure.',
'NW_CHANGE_WALK':'The identity must close: ending = beginning + money in − money out + income − costs + market change. A direction stated by the institution never overrides a contradicting sign — a −$500 line marked IN is a reversal.',
'LEDGER':'Nothing is booked from a guess. An institution word that is not in the translation table is refused, not sign-guessed — the sign-guess is what minted $1,064,493 of contributions on an account where nothing moved.',
}

# Questions for the founder, attached to the engine they concern. NUMBERS ARE FIXED FOREVER —
# he answers by number, so a number is never reused, renumbered or reordered.
QUESTIONS = {
'BOND_FACTS':[
 'Q01 — Is Quantity for a bond the FACE amount (e.g. 227,000) with the price quoted per $100 of face, or the number of bonds? It decides how value and gain are worked out.',
 'Q02 — How should a bond be NAMED on screen? Draft: "US Treasury 4.25% Nov 2029", with the identifying number shown as a detail rather than the headline. Approve or rewrite.',
 'Q03 — Certificates of deposit: under Fixed Income, or their own class? They carry a term, a rate and an early-withdrawal penalty that a bond does not.',
],
'BOND_COUPON':[
 'Q04 — "Annual income" on a bond: the last twelve months actually received, or the forward estimate from today\'s coupon? Both are defensible and they differ.',
],
'BOND_YIELD_TO_MATURITY':[
 'Q05 — Accrued interest: do we work it out ourselves — which needs a day-count rule per bond type — or only show what the institution gives us?',
],
'HOLDING_MARKET_VALUE':[
 'Q06 — Options: is quantity held in CONTRACTS with the price per share (so value = contracts x 100 x price), or is the price already per contract? Today neither is applied and the value may be a hundredth of the truth.',
 'Q07 — Crypto: how many decimal places should a quantity keep? Some coins are held in very small fractions.',
 'Q08 — Foreign currency: is this cash held at an institution, or currency trading? And should that tab\'s "Dividend" row be "Interest"?',
],
'HOLDING_SHARES':[
 'Q09 — Should the app store the UNIT beside every quantity — shares, contracts, coins, units of face, currency units — so nothing can be multiplied by the wrong price? Today one field holds all of them with nothing marking which.',
],
'ALLOCATION_BY_CLASS':[
 'Q10 — What order of evidence decides an asset\'s class? Draft: the institution\'s own class field, then the shape of the identifier (option symbols, nine-character bond numbers, currency codes), then words in the name, then ask you.',
 'Q11 — When nothing matches: refuse the line and ask, or park it as unclassified? Parking keeps the totals right and hides a gap; refusing is honest and stops the import.',
 'Q12 — Does the person\'s own answer always win and stick, even when the next sync disagrees? That is today\'s rule for holdings — confirm it holds for every class.',
 'Q13 — Commodities: is a fund that tracks gold (GLD) simply a fund with a "commodity" label for allocation, and do you want PHYSICAL metal — weight, unit, purity, storage, spot price — supported at launch?',
],
'ACCOUNT_SPLIT':[
 'Q14 — What should a MIXED account be called on screen, when it holds several classes at once?',
],
'the ledger sum of interest and dividends for the account':[
 'Q15 — An institution word we do not recognise: refuse the line and ask you, or book it as unclassified with no direction? The old sign-guess is what minted the $1.4 million.',
],
'TOTAL_CASH':[
 'Q16 — Does foreign-currency cash count towards Cash, or sit apart until it is converted?',
],
'NW_CHANGE_PCT':[
 'Q17 — "Return on cash + investments" counts money you paid in as a gain. Is the LABEL wrong, or the FORMULA? Fixing the formula means removing deposits and withdrawals before measuring.',
],
'POT_AT_RETIREMENT':[
 'Q18 — Net worth projects the pot WITHOUT your big costs; Cash flow, Budget, Goals and Social Security timing all include them. Which is right for the Net worth screen?',
],
'WILL_IT_LAST_RESULT':[
 'Q19 — The odds are rounded to the nearest 5 on screen but shown exact in the compare tables. Round everywhere, or show exact everywhere?',
],
'HOLDING_CAP_GAINS':[
 'Q20 — A lot with no recorded purchase price is skipped, so its gain is simply absent. Should the screen SAY so — "gain not counted for N shares, no purchase price on record" — rather than quietly reporting less?',
],
'REALISED_GAIN':[
 'Q21 — On a second device the ledger is absent, so this reads nothing. Until history syncs, should it refuse in words rather than show a figure that looks like zero?',
],
'PRICE_FRESHNESS':[
 'Q22 — How old is too old for a price before the screen warns? Today it is a fixed limit in the code; you have never set it.',
],
'HAND_VALUE_AGE':[
 'Q23 — Same question for a value you typed by hand: after how long should the app ask you to check it?',
],
'TAXABLE_INCOME':[
 'Q24 — State tax is applied to taxable accounts only. Do you want a state rate captured per person, or to keep the single blended figure we use now?',
],
'INSURANCE_NEED':[
 'Q25 — How many years of income should the default life-cover estimate replace, and does it assume the mortgage is cleared?',
],
'EDUCATION_COST':[
 'Q26 — What education inflation rate should the college projection use, and should it be visible and editable on the screen?',
],
'GOAL_CAPACITY':[
 'Q27 — "Typical free cash to save" uses the middle of recent months. How many months should it look back, and should a one-off windfall be excluded?',
],
'JOB_SAFETY_RUNWAY':[
 'Q28 — How many months of essentials should the app treat as safe by default — and is that number yours to set per person, or one figure for everyone?',
],
'STRESS_TEST':[
 'Q29 — What size of shock should the test use by default, and should it be a fixed dollar figure or a share of the person\'s spending?',
],
'RETIREMENT_PAYCHECK':[
 'Q30 — The draw from savings is shown as one figure a month. Should it hold steady in today\'s dollars, or rise with inflation each year?',
],
'REQUIRED_WITHDRAWAL':[
 'Q31 — Required withdrawals are estimated from balances we hold. When an institution states its own required figure, does theirs win?',
],
'TREND_SERIES':[
 'Q32 — The trend survives on a new device but the walk behind it does not. Should the trend say so, or show quietly?',
],
'BENCHMARK_RETURN_BLENDED':[
 'Q33 — Which index should each asset class be compared against, and should the person be able to change it?',
],
}

# ── S04 / S05 / S06 / S07 ────────────────────────────────────────────────────────────────────
# What comes out, what it says when it cannot, the grain and the period.
# Written per engine where the engine has been read; otherwise derived by the rules in derive()
# below and marked as derived, never presented as read.

REFUSAL = {
'MODIFIED_DIETZ (Calculation Module code/engines/window-return.ts)':'REFUSES when the timing of money moving in or out drives the percentage more than the investments do, and shows the dollar walk instead. Also refuses when the starting value is zero or negative.',
'WILL_IT_LAST_RESULT':'No odds at all until the three facts are answered. A sample is shown in their place, labelled as a sample, never as the person\'s own number.',
'WHAT_THE_PLAN_STILL_NEEDS':'This engine IS the refusal: it names what is missing and what is already counted.',
'POT_AT_RETIREMENT':'No figure when there is nothing to grow, or when retirement is not ahead of the person.',
'BOND_CURRENT_YIELD':'No value means no answer — never a division by zero.',
'BOND_YIELD_TO_MATURITY':'No answer once the bond has matured, and none without a price.',
'HOLDING_CAP_GAINS':'A lot with no recorded purchase price is SKIPPED. Today the screen does not say so, which is finding Q20.',
'REALISED_GAIN':'Sales with no recorded purchase are counted separately and named on screen: "N sales had no recorded purchase, so their gain isn\'t counted."',
'NW_CHANGE_PCT':'No baseline, or nothing invested, means the line is simply absent rather than shown as zero.',
'PRICE_FRESHNESS':'With no priced holdings there is no freshness to report and the line does not appear.',
'HAND_VALUE_AGE':'Always answers, but carries the age of the figure and warns once it is stale.',
'REQUIRED_WITHDRAWAL':'Nothing before the start age for that birth year. A Roth 401(k) is exempt and says so.',
'GOAL_CAPACITY':'Needs recent months to speak. With too few it says so rather than offering a figure from one month.',
'SS_BENEFIT_AT_AGE':'Without a statement amount a worked example is shown, labelled as an example throughout.',
'TREND_SERIES':'A line needs at least two points; with one, the point is shown and the line is not drawn.',
'NW_CHANGE_WALK':'Where the record does not reach back far enough, the beginning is back-solved and the walk says so. With neither record nor flows it refuses.',
'LOOK_BACK':'Without enough price history for both sides it declines the comparison rather than compare unequal periods.',
}
# Totals over an empty list are the quiet case worth naming once.
EMPTY_SUM = ('Adds up to $0 when there is nothing to add. Zero and "nothing recorded yet" look '
             'identical on screen — worth a decision.')

def derive(engine, label, math_text):
    """Unit and rounding, grain, and period — derived by rule from the label and the formula.
    Marked as derived wherever it appears, so it is confirmed rather than trusted."""
    lab=(label or '').lower(); mt=(math_text or '').lower(); e=str(engine)
    # what comes out
    if 'odds' in lab or 'WILL_IT_LAST' in e:
        unit='Percent · rounded to the nearest 5 · a real 100 or 0 shown literally'
    elif 'price' in lab or 'price paid' in lab:
        unit='US dollars per unit · held to 8 decimal places · decimals shown'
    elif '%' in lab or 'return' in lab or 'yield' in lab or 'rate' in lab or 'ret' == lab:
        unit='Percent · one decimal shown'
    elif 'months' in lab or 'runway' in lab or 'cushion' in lab:
        unit='Months · one decimal'
    elif 'age' in lab and 'usage' not in lab:
        unit='Age in whole years'
    elif 'quantity' in lab or 'shares' in lab or 'count' in lab or 'records' in lab:
        unit='A count · whole units, except crypto which keeps its fractions'
    elif 'date' in lab or 'matures' in lab:
        unit='A date'
    else:
        unit='US dollars · held to the cent · shown as whole dollars'
    # grain
    if e.startswith('HOLDING') or 'holding' in lab or 'lot' in lab:
        grain='One figure per holding'
    elif e.startswith('BOND') or 'bond' in lab:
        grain='One figure per bond'
    elif e.startswith('ACCOUNT') or 'account' in lab:
        grain='One figure per account'
    elif 'debt' in lab or e.startswith('DEBT'):
        grain='One figure per debt, and one total per person'
    elif 'goal' in lab:
        grain='One figure per goal'
    elif 'category' in lab or 'class' in lab or 'bucket' in lab:
        grain='One figure per category'
    elif 'month' in lab:
        grain='One figure per month'
    else:
        grain='One figure per person — or per household when two people share one record'
    # period
    if 'this month' in lab or 'spent so far' in lab or 'received' in lab:
        period='This calendar month, to today'
    elif '12 mo' in lab or 'twelve' in lab or 'a year' in lab or '/yr' in lab or 'annual' in lab:
        period='The last twelve months'
    elif 'window' in mt or 'period' in lab or 'return' in lab:
        period='The window the person chose on screen'
    elif 'retirement' in lab or 'retire' in lab or 'nest egg' in lab or 'pot' in lab:
        period='From today to the retirement age in the plan'
    elif 'year' in lab:
        period='This calendar year, to today'
    else:
        period='As of today, from the latest figures held'
    return unit, grain, period
