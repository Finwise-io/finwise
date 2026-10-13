# The cards — "pf module final — part 1 of 4"

13 cards, so 13 formula checks and 65 cases. Read the brief file moneykeel_audit_module_pf_for-the-outside-judge_v01.md first. Put `"batch": "pf module final — part 1"` in your reply.

```json
[
 {
  "id": "MK-NW-F-084",
  "name": "categoryEarnings",
  "kind": "function",
  "what_it_is_for": "What each category of investment paid in dividends and interest over the period, and that category's return.",
  "formula_in_words": "Uses the dividend and interest records dated on or after the period's first day, amounts taken as positive. A record that names a ticker goes to that holding's category: bond → Bonds & CDs; cash → Cash in this account; anything else → Stocks / Funds; a ticker with no holding on record → Stocks / Funds for a dividend, Bonds & CDs for interest. A record that names NO ticker → Stocks / Funds for a dividend; for interest, Bonds & CDs when the record's account is a bond or CD account handed in, else Cash in this account. A category's return, over the holdings with a value above zero and a period return above −100%: each holding's value at the start = its value now ÷ (1 + its return over the whole period, never a yearly rate); return = the values now added up ÷ the values at the start added up − 1. Nothing when no holding qualifies. Bonds & CDs shows a stated YEARLY rate instead — each bond account's rate weighted by its balance — when every bond account with a balance states a rate and no bond is held as a holding. An entered 0% states a rate of 0% (DEC-2748b, 2026-10-12); a rate never entered states none. On day one all three categories are returned with no return; any other day only the categories that earned more than zero.",
  "handed": "export function categoryEarnings(input: {\n  /** every record, unfiltered — this takes the window’s own */\n  transactions: any[];\n  /** the window’s first day, or null for \"since the record began\" */\n  windowStart: string | null;\n  /** each holding with its class and its own return, as buildPerformance produces them */\n  rows: { position?: { ticker?: string; kind?: string; asset_class?: string }; periodReturn?: number | null; periodTotal?: number | null; marketValue?: number }[];\n  /** Every bond or CD held as its own account: which account it is, what it is worth and the yearly rate it states. */\n  bonds?: { asset_id?: string | number; balance?: number; coupon_rate?: number }[];\n  /** DAY ONE: every category is shown at $0 — \"every line fills in as days pass, the structure never\n   *  changes\" (Performance v17, phones 4 and 5). Any other day, a category that received nothing is\n   *  left out. */\n  dayOne?: boolean;\n}): CategoryEarned[]",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-005 holding price",
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-090",
  "name": "windowStartKey",
  "kind": "function",
  "what_it_is_for": "The first day of a period: the day after the record's first day for Since, 1 January for This year, and the same day one month, one year or two years back for the others.",
  "formula_in_words": "Since: the day after the earliest recorded day, but never later than today; today when nothing is recorded. This year: 1 January of today's year. 1M, 3M, 6M, 1Y and 2Y: today moved back 1, 3, 6, 12 or 24 months — the same day of that month, or its last day when that month is shorter (one month before 31 March is 28 February). Every window except Since is read from startDateFor, on the calendar day today names. Any other label: nothing — no start, so no figure.",
  "handed": "export function windowStartKey(period: string, recordDates: string[], today: string): string | null"
 },
 {
  "id": "MK-NW-F-091",
  "name": "pricedGainOf",
  "kind": "function",
  "what_it_is_for": "What the holdings gained over the period in dollars: the true gain for a holding bought inside the period, the price move's share of today's value for one with a price history, the stated rate's share for a CD — and nothing (unknown) when any holding has neither.",
  "formula_in_words": "Each holding's gain over the period, added up. For a holding bought inside the period: its whole gain (value − cost). For any other holding with a period return: value × (1 − 1 ÷ (1 + return)) when its value is above zero, which is today's value less its value when the period opened; nothing when it holds nothing. For a holding with no period return that states a yearly rate (only a certificate of deposit is given one): value × (1 − 1 ÷ (1 + rate) to the power years), years handed in (none handed in counts as 0, so it gains nothing). Any other holding that holds something (its value, or the broker's last price × its shares, or the value it was entered at, above zero) has a gain that cannot be known: the answer is then NOTHING — not zero — for the whole total. A holding that holds nothing gains nothing. (Owner decision DEC-3656, 2026-10-09.)",
  "handed": "export function pricedGainOf(rows: GainRow[], years = 0): number | null",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ]
 },
 {
  "id": "MK-NW-F-092",
  "name": "investmentAccountIdsOf",
  "kind": "function",
  "what_it_is_for": "Which accounts count as investments: those holding stocks and funds, bonds and CDs, alternatives or a mix, and never cash or property.",
  "formula_in_words": "The ids of the accounts whose class is Stocks / Funds, Bonds & CDs, Alternatives or Unclassified. Cash and property accounts are left out.",
  "handed": "export function investmentAccountIdsOf(\n  accounts: { asset_id?: string | number }[],\n  classOf: (a: any) => string,\n): Set<string>"
 },
 {
  "id": "MK-NW-F-103",
  "name": "investmentRecordDates",
  "kind": "function",
  "what_it_is_for": "THE DAYS THE RECORD HOLDS AN INVESTMENT VALUE FOR, oldest first.",
  "formula_in_words": "The dates of the recorded days that hold a value for at least one of the named accounts, oldest first. Empty when no accounts are named.",
  "handed": "export function investmentRecordDates(snapshotDays: any[], investmentAccountIds: Set<string>): string[]"
 },
 {
  "id": "MK-NW-F-104",
  "name": "closedWith",
  "kind": "function",
  "what_it_is_for": "The daily record with today added to it, worth what the caller says the measured accounts are worth now.",
  "formula_in_words": "The daily record with today added: one row per account that the latest earlier recorded day holds (of the accounts named), carrying between them the ending value handed in. The record is returned unchanged when there is no earlier day or it holds none of those accounts. It adds no arithmetic: it lets a return be measured to today when the caller gave an ending value and no accounts.",
  "handed": "function closedWith(days: any[], ids: Set<string>, today: string, ending: number): any[]"
 },
 {
  "id": "MK-NW-F-105",
  "name": "whyNoReturn",
  "kind": "function",
  "what_it_is_for": "WHY A RETURN CANNOT BE MEASURED, in words a person reads.",
  "formula_in_words": "The sentence shown where a time-weighted return cannot be measured; empty when it was measured. Money moved on a day with no recorded value: names the day and says a return cannot be measured across it. A movement with no date: says so. A deposit or withdrawal with no amount on record: names the day and says a return cannot be measured across it. Shares moved in or out: names the day and says the records do not say what they were worth. Nothing to grow from on a day (the previous evening's value + money added − money taken out is zero or less while that day holds a value): names the day and says which — a value recorded with nothing there the evening before and no money added, or more money taken out than was there the evening before plus the money added that day. Since DEC-4439 (2026-10-11) a value below the money added is a loss, measured, and has no sentence. Nothing invested over the period: says there is no return to state. Today's value not on record: says so. A beginning that cannot be read has no sentence here — the period is shown as not covered instead.",
  "handed": "export function whyNoReturn(v: TimeWeightedVerdict | null): string"
 },
 {
  "id": "MK-NW-F-127",
  "name": "gainOfRow",
  "kind": "function",
  "what_it_is_for": "THE ONE RULE FOR WHAT A HOLDING GAINED OVER THE WINDOW (DEC-3656, 2026-10-09), or null when it cannot be known.",
  "formula_in_words": "What one holding gained over the window, or nothing when that cannot be known. Bought inside the window: its own gain (value less cost). With a return for the period: the return over the WHOLE window (the window total the row carries; else, when the window is longer than one year, the yearly rate compounded over the window's years — (1 + rate) to the power years − 1; else the return as given); then value now × (1 − 1 ÷ (1 + that)), and $0 when it holds nothing. A CD with a stated rate of zero or more (an entered 0% is a rate: it gains $0; a rate never entered is no rate — DEC-2748b, 2026-10-12): value now × (1 − 1 ÷ (1 + the rate) to the power of the window's years), and $0 when it holds nothing. Otherwise: $0 when it holds nothing (heldValueOf is 0), and nothing (unknown) when it holds something or its worth is unknown — a holding with no price history and no rate.",
  "handed": "function gainOfRow(r: GainRow, years: number): number | null",
  "inputs_it_reads": [
   "MK-XS-I-012 bond coupon rate"
  ]
 },
 {
  "id": "MK-NW-F-128",
  "name": "heldValueOf",
  "kind": "function",
  "what_it_is_for": "What a holding is worth when no price series prices it: the broker's last mark × shares, or the value it was built at by hand.",
  "formula_in_words": "What a holding is worth when no price history prices it: its market value when that is above zero; else its shares (totalShares) × the broker's last price × the contract multiplier (100 for an option unless it states its own) when there is a last price — nothing when the shares are unknown; else the value it was last built at; else $0 when it holds no shares; else NOTHING (unknown) — shares with no price.",
  "handed": "function heldValueOf(r: GainRow): number | null",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise"
  ]
 },
 {
  "id": "MK-NW-F-129",
  "name": "gainRowName",
  "kind": "function",
  "what_it_is_for": "What the refusal sentence calls a holding: its own name, else its ticker — a CUSIP-shaped ticker gives way to the security's name.",
  "formula_in_words": "What the sentence calls a holding: the name it was given; else its ticker — unless the ticker is a security code (nine letters and digits in either case, with a digit in it) and the holding has a name, when the name is used; else its name; else \"a holding\".",
  "handed": "function gainRowName(r: GainRow): string"
 },
 {
  "id": "MK-NW-F-130",
  "name": "cannotWorkBackSentence",
  "kind": "function",
  "what_it_is_for": "THE SENTENCE where the beginning cannot be worked back (DEC-3656, 2026-10-09, his wording).",
  "formula_in_words": "The sentence when the beginning cannot be worked back: \"The beginning can't be worked back: <names> has no price history.\" Each name is listed once, however many times it is handed in. With several names, they are joined by commas with \"and\" before the last, and the verb is \"have\". With no name, \"a holding\".",
  "handed": "function cannotWorkBackSentence(names: string[]): string"
 },
 {
  "id": "MK-NW-O-007",
  "name": "theLookBack",
  "kind": "orchestrator",
  "what_it_is_for": "What would this holding be worth today had I put the same money into something else on the same days?",
  "formula_in_words": "Passes the amount, the two price histories, the number of months and today to lookBack and returns its answer unchanged.",
  "handed": "export function theLookBack(input: {\n  amount: number;\n  /** The price history of the fund it is in, and of the one it might have moved to. */\n  fromSeries: any;\n  toSeries: any;\n  months: number;\n  now?: Date;\n}): LookBackResult | null",
  "inputs_it_reads": [
   "MK-XS-I-005 holding price"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-PF-M-010",
    "words_on_screen": "Left in <fund> it became $X (up/down $Y, Z%)",
    "unit": "money",
    "what_it_answers": "What your money actually did, where it actually was.",
    "when_it_refuses": "No price history over the whole window — the screen shows nothing rather than a shortened one.",
    "shown_on": [
     "/look-back"
    ]
   },
   {
    "id": "MK-PF-M-011",
    "words_on_screen": "Moved to <fund> it would be $X",
    "unit": "money",
    "what_it_answers": "What the same money would have become in the other fund.",
    "when_it_refuses": "No price history for the other fund over the whole window.",
    "shown_on": [
     "/look-back"
    ]
   },
   {
    "id": "MK-PF-M-012",
    "words_on_screen": "Difference: $X more/less if you had moved",
    "unit": "money",
    "what_it_answers": "What the move would have been worth, in money.",
    "when_it_refuses": "Either fund missing its history means no difference is stated.",
    "shown_on": [
     "/look-back"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0233",
    "date": "2026-09-25",
    "words": "button still looks not asthetically good. Can it be done like one row with dividers for different periods?"
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-010",
    "words": "Dividends and distributions are in it: the closes it reads are adjusted for them (corrected 2026-10-12; it said price changes only)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-011",
    "words": "A road not taken, priced from real history — never a projection forward."
   }
  ]
 },
 {
  "id": "MK-NW-O-008",
  "name": "thePerformance",
  "kind": "orchestrator",
  "what_it_is_for": "How are my investments doing over a period: where they started, what I put in and took out, what they made, where they ended, and the return?",
  "formula_in_words": "Records of the period = those dated on or after its first day; contributions, withdrawals, dividends and interest are their totals. Contributions also count cash or shares transferred in from an account that is not one of those measured, and the first recorded value of an account that joined the record inside the period (its own records up to that day are then not counted again); withdrawals also count cash or shares transferred out. A transfer between two measured accounts is neither. THE BEGINNING IS READ from the daily record at the day BEFORE the period opens, and only when investment accounts are named and the record's first day is on or before that day; the value read is the last recorded day on or before it. If it cannot be read and the record holds days for these accounts that begin after the period opens: NO walk (no beginning, no wealth generated), and a sentence: The record begins <its first day>, so it cannot say what this account was / these accounts were worth on <the day before the period>. If it cannot be read and there is no record of these accounts at all: beginning = ending − priced gain − contributions + withdrawals (priced gain counts as 0 when the period opens today). The priced gain is each holding's gain over the period by the one rule for it (pricedGainOf: a holding's return is read as the period's own total, never a yearly rate), years = the period's days ÷ 365; a measured account with no holdings counts as its own holding, worth its balance — a certificate of deposit stating its rate gains by that rate (an entered 0% is a rate and gains $0; a rate never entered is no rate — DEC-2748b, 2026-10-12), any other has no price history. With no period at all (day one) no rate is applied and a holding with no price history adds nothing. Owner decision DEC-3656, 2026-10-09: where a period is given that does not open today and any holding's gain cannot be known (it holds something, has no price history and no stated rate): NO walk (no beginning, no wealth generated), and the sentence: The beginning can't be worked back: <name> has no price history. Several names are joined with commas and \"and\" before the last, and say \"have no price history\". A holding is named by its ticker (the security's name where the ticker is a 9-character identifier); an account by its display name; a dollar gain handed in as unknown is named \"a holding\". Either way NO percent of any kind is given. The ending is given on its own as well, whether or not there is a walk. Walk: wealth generated = ending − beginning − contributions + withdrawals; change in investment value = wealth generated − dividends − interest. Records counted are those of the investment accounts named (a record on any other account is not money put into these investments). Return = a TIME-WEIGHTED return (owner decision, 2026-10-04: \"All return should be True Weighted Return and not Dietz return.\"): the period, starting at the last recorded day on or before the day before it opens, is split at every day money moved in or out of those accounts; each piece = the value just before the next movement ÷ the value just after the last one; the pieces are multiplied and 1 is taken off. The record holds one value a day, taken after that day's money moved; money that moves on a day counts for that whole day (owner decision DEC-4439, 2026-10-11), so a day's link = that day's value ÷ (the previous recorded day's value + money added that day − money taken out that day). Money moving = deposits (in), withdrawals (out), cash transferred between accounts (out of the first, into the second), and shares moved in or out at what they were worth (the amount, or shares × price) when the record says which way they went. Ending = what the measured accounts are worth today, each counted whole (its balance, uninvested cash inside it included), read from the accounts handed in — a figure handed in beside them is not used, so no two screens can give two endings; with no accounts handed in, the ending handed in is used and closes the record. Today's value for the return is read from the same accounts. An account that first appears in the record inside the period counts as money in, at its first recorded value. A recorded day that is missing an account with holdings is not used; a typed balance stands until it is next recorded. It REFUSES — no percent, a sentence saying why, never another method — when: the beginning cannot be read; money moved on a day with no recorded value; a movement has no date; a deposit, withdrawal or transfer has no amount on record; shares were moved in or out and the record does not say which way or what they were worth; the previous recorded day's value + the money moved that day is zero or less while that day holds a value (nothing to grow from); or nothing was invested. For a period longer than one year — its first day earlier than one year back from today by the calendar (windowStartKey), so a period opening one year back to the day is a year and is never made yearly — and days ÷ 365 above 1, unless it is the whole-record Since period, the figure shown is the yearly rate (1 + return) to the power 1 ÷ years, − 1.",
  "handed": "export function thePerformance(input: {\n  /** The window's first day, or null for \"since the record began\". */\n  windowStart: string | null;\n  /** The words for that window, as the screen says them (\"since Jul 19\"). */\n  windowLabel: string;\n  today: string;\n  /** What the measured accounts are worth now — used ONLY when no accounts are handed over. With\n   *  accounts, the function reads it from them, so no two screens can hand it two different figures. */\n  ending?: number;\n  /** Every record, unfiltered — the door takes the window's own. */\n  transactions: any[];\n  /** The daily record, and which accounts count as investments. */\n  snapshotDays: any[];\n  investmentAccountIds: Set<string>;\n  /** What the priced holdings gained over the window — used ONLY to derive a beginning the record\n   *  cannot reach. It never becomes the return. Null = a holding's gain cannot be known (DEC-3656).\n   *  A caller that hands over `holdings` instead lets the door calculate it with the window's own years. */\n  pricedGain?: number | null;\n  /** The holdings themselves (rows of buildPerformance, or GainRows) — preferred to `pricedGain`, so the\n   *  ONE rule (pricedGainOf) decides each holding's gain over THIS window, and the refusal can name the\n   *  ones it cannot know. (DEC-3656, 2026-10-09) */\n  holdings?: GainRow[];\n  /** True for \"Since\" — the whole record. Its return is the window's OWN total and is never turned\n   *  into a yearly rate (Performance v17, phone 3: \"Since Jun 3, 2024 +16.24% … not a yearly rate\").\n   *  A fixed window longer than a year (2Y) still shows the yearly rate. */\n  wholeRecord?: boolean;\n  /** The accounts as they stand now. Today's values are read from them, so the last day of the\n   *  return is measured the same way every recorded day was — and an account added today is seen\n   *  as arriving today, not as a gain. */\n  accounts?: any[];\n}): WindowFigures",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-024 logged expenses"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-PF-M-001",
    "words_on_screen": "Ending value",
    "unit": "money",
    "what_it_answers": "What your investments are worth at the end of the window you picked.",
    "when_it_refuses": "Nothing invested yet.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-002",
    "words_on_screen": "Wealth generated",
    "unit": "money",
    "what_it_answers": "What the money itself made in the window — not what you added to it.",
    "when_it_refuses": "The record cannot reach the start of this window, so there is nothing honest to subtract from.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-003",
    "words_on_screen": "HOW $X BECAME $Y · ALL ACCOUNTS",
    "unit": "words",
    "what_it_answers": "Every line that took the beginning to the ending, so it can be checked by eye.",
    "when_it_refuses": "No beginning to walk from.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-004",
    "words_on_screen": "Ending market value (per account)",
    "unit": "money",
    "what_it_answers": "What one account is worth at the end of the window.",
    "when_it_refuses": "Nothing in it.",
    "shown_on": [
     "/invest",
     "/account-detail"
    ]
   },
   {
    "id": "MK-PF-M-005",
    "words_on_screen": "each account and its ending value",
    "unit": "money",
    "what_it_answers": "One line per account, and what it is worth — the parts that sum to the whole above.",
    "when_it_refuses": "One account only — the whole walk above already says it.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-006",
    "words_on_screen": "WHAT EACH CATEGORY EARNED — RETURN",
    "unit": "percent-signed",
    "what_it_answers": "What each kind of holding returned over the window you picked.",
    "when_it_refuses": "An em-dash — no holding in that class can be priced over this window.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-007",
    "words_on_screen": "All categories",
    "unit": "money",
    "what_it_answers": "What you actually received, in dividends and interest, over the window — by kind.",
    "when_it_refuses": "The table does not appear — nothing was received in this window.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-008",
    "words_on_screen": "market +X%",
    "unit": "percent-2dp",
    "what_it_answers": "What the market did over the SAME days, matched to what you actually hold.",
    "when_it_refuses": "No benchmark can be priced over this window, so none is shown.",
    "shown_on": [
     "/home"
    ]
   },
   {
    "id": "MK-PF-M-013",
    "words_on_screen": "Beginning market value",
    "unit": "money",
    "what_it_answers": "What this one account was worth on the day the window opens, READ from the record — never back-solved from today.",
    "when_it_refuses": "The record does not reach back that far, so the walk is not drawn at all rather than started from a guess.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-014",
    "words_on_screen": "Wealth generated",
    "unit": "money",
    "what_it_answers": "What this one account earned over the window — what is left after the money you put in and took out is accounted for.",
    "when_it_refuses": "No beginning to measure from — the line shows nothing rather than a change.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-PF-M-015",
    "words_on_screen": "one line of the walk",
    "unit": "money",
    "what_it_answers": "One step that took this account from its beginning to its ending — money in, money out, or the change in what the holdings are worth.",
    "when_it_refuses": "No flows recorded — the line is not drawn.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-016",
    "words_on_screen": "Return",
    "unit": "percent-signed",
    "what_it_answers": "How much this one account grew over the window you picked, with money you added or took out left out. Shown per year when the window is longer than a year.",
    "when_it_refuses": "No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or there was nothing to grow from that day (the previous evening plus the money moved is zero or less while the day holds a value). It never shows another kind of figure in its place.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-017",
    "words_on_screen": "Return",
    "unit": "percent-signed",
    "what_it_answers": "How much all your investments grew over the window you picked, with money you added or took out left out. Per year when the window is longer than a year.",
    "when_it_refuses": "No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or there was nothing to grow from that day (the previous evening plus the money moved is zero or less while the day holds a value). It never shows another kind of figure in its place.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-018",
    "words_on_screen": "Beginning market value",
    "unit": "money",
    "what_it_answers": "What all your investments were worth on the day the window opens, READ from the daily record.",
    "when_it_refuses": "No recorded value that far back — the walk starts the day the record does, and says so.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-019",
    "words_on_screen": "one line of the walk",
    "unit": "money",
    "what_it_answers": "One line of how the beginning became the ending, over every account: contributions, withdrawals, dividends, interest, or the change in investment value.",
    "when_it_refuses": "A real $0 — a line with nothing in it still prints, so the structure never changes.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-PF-M-020",
    "words_on_screen": "Available cash",
    "unit": "money",
    "what_it_answers": "The cash in this account that a buy, a withdrawal or a transfer can use right now.",
    "when_it_refuses": "No account picked — the line is not shown.",
    "shown_on": [
     "/invest"
    ]
   },
   {
    "id": "MK-XS-M-004",
    "words_on_screen": "▲ up/▼ down $X (Y%) this month · Return · YOUR RETURN",
    "unit": "percent-2dp",
    "what_it_answers": "What your investments earned over the window you picked — dividends and interest included.",
    "when_it_refuses": "Nothing is shown, and the walk beneath says in words why — either the record cannot reach the beginning, or money moved on a day with no recorded value.",
    "shown_on": [
     "/invest",
     "/home"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0046",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0046, confirmed as written: The Invest tab is renamed PERFORMANCE (founder pick: Net worth · Performance) — one TAB_META change sweeps the bottom ba"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0065",
    "date": "2026-08-10",
    "words": "complete fully building NW and perf section"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0084",
    "date": "2026-08-11",
    "words": "Your retirement plan - it says See your plan. That is not what I approved. Is it stale code?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0093",
    "date": "2026-08-11",
    "words": "make all $$ same size and make totals bold. different size for dollar amount makes number not right aligned... are these tables or how are you ensuring they are right aligned?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0112",
    "date": "2026-08-12",
    "words": "s not say Uncertain — 60% odds of lasting to age 90. uncertain and giving it 60% probability does not make sense. it should be either or. Let"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0126",
    "date": "2026-08-13",
    "words": "s paycheck on the Plan tab rendered two bare amounts with NO NAMES beside them — a bill with the line items blanked out — directly above a note reading"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0135",
    "date": "2026-08-13",
    "words": "under cashflow I don"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0142",
    "date": "2026-08-13",
    "words": "info dot should be the same size as text. Can we do that?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0143",
    "date": "2026-08-14",
    "words": "s constraint, stated plainly:"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0160",
    "date": "2026-08-14",
    "words": "one critical factor is whether the current mortgage rate is higher or lower than the return on investment or the 10-year yield — if a person pays off the mortgage versus keeping money in a 10-year Treasury, what would be the net saving or cost?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0165",
    "date": "2026-08-14",
    "words": "how to avoid this in the next brief?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0173",
    "date": "2026-08-14",
    "words": "Not counting loan or mortgage payments — we add those ourselves, from your loans, for as long as they run."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0182",
    "date": "2026-08-27",
    "words": "for orchestrator use O instead of F to make it easy to identify."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0192",
    "date": "2026-08-28",
    "words": "s number was its POSITION in a list — nid() counted up as it walked them — so inserting a row silently renumbered every metric after it in that family. 93 audit findings are keyed to those numbers, as are the founder"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0229",
    "date": "2026-09-25",
    "words": "\"Yes\" — DEC-0229, confirmed as written: Mock v11 drawn from v10 with the founder’s four changes: (10) the window chips sit on ONE row in 10.5-point type with th"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0230",
    "date": "2026-09-25",
    "words": "We never back-fill a year we didn"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0255",
    "date": "2026-09-08",
    "words": "ok — the dependency column from the live function registry; a check that no row cites a retired identifier"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0257",
    "date": "2026-09-08",
    "words": "ok — inputs' reach and the reconciliation by identifier, all inputs; then: the code's record beside each row's claim, he approves rows in batches, the gate compares approved against the code"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0322",
    "date": "2026-08-20",
    "words": "status disagreements, work-list generation, engine counts, tab references, the PINNED word — all in the old metrics deliverable"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0323",
    "date": "2026-08-20",
    "words": "\"money-weighted\" names two things — rename PORTFOLIO_RETURN to value-weighted; reserve money-weighted for the IRR"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0357",
    "date": "2026-09-25",
    "words": "why income when % is calculated using wealth generated?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0368",
    "date": "2026-09-26",
    "words": "go with (a) the sentence becomes “+7.30%/year” — canon-literal"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0382",
    "date": "2026-09-02",
    "words": "“Always use same words to describe same thing in the app. There is no score for creative writing use different terms to describe same thing.” Made an app-wide standing order the same day."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0402",
    "date": "2026-09-14",
    "words": "go ahead and execute on step 1, 2, 3"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0445",
    "date": "2026-06-30",
    "words": "If user is in plan section and plan something such SS starting age, or RMDs or other scenarios, can they select Use this once satisfied and would that feed inputs to NW, invest, and cashflow modules?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0479",
    "date": "2026-07-01",
    "words": "Total return captures both realized and unrealized gains? Is there any place we display realized P/L, unrealized P/L, total dividend, and total interest separately?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0482",
    "date": "2026-07-01",
    "words": "How do we evaluate if something is saved towards retirement or some other goals? In other words is NW = Retire or Retire = Assets - Primary home - primary car?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0490",
    "date": "2026-06-30",
    "words": "Is it one time pull, daily, or initiated by user? What if user is hesitant to connects account in the beginning?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0498",
    "date": "2026-06-30",
    "words": "How about a scenario do I have enough to support my parents with $2500 per month, and still save for kids college, pay mortgage, and save for retirement? How will it impact by retirement paycheck or date?"
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-002",
    "words": "ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are part of this, so the return beside it counts them too."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-003",
    "words": "Whatever the records cannot explain lands in the change-in-value line rather than being silently dropped."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-005",
    "words": "Named by ACCOUNT, not by institution — two accounts at one broker must be tellable apart (founder screenshot, 2026-08-17)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-006",
    "words": "A class with no holding we can price shows an em-dash, never a 0% — a zero reads as \"it returned nothing\", which is a different claim."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-006",
    "words": "MOVED OFF THE SCREEN 2026-09-30: this was calculated inside PerformanceScreen, so it had no row, no example and nothing able to check it (his rule: a screen computes nothing)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-007",
    "words": "LEDGER ONLY: what was actually RECEIVED, never a rate applied to a balance."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-007",
    "words": "A record with no ticker is classed by what it IS — a dividend comes from a fund, interest from a bond."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-007",
    "words": "A class that received nothing is not shown at all; where nothing was received the table does not appear."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-008",
    "words": "The benchmark runs over the SAME DATES as your return — including where your window is cut short at your own purchase date. Comparing your three months against the market's twelve is not a comparison."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-008",
    "words": "Weighted by what each holding was worth when the window began, so the blend answers \"the market, matched to my mix\" rather than a plain average of indices — and a holding that grew does not grow its yardstick's weight (outside review Claude Performance, 2026-10-11, DEC-1669, DEC-3035b)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-008",
    "words": "THE MARKET INCLUDES ITS DIVIDENDS AND INTEREST (DEC-4645, 2026-10-12): SPY and AGG are read through the same dividend-adjusted closes as every holding (src/services/marketData.ts, adjclose)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-013",
    "words": "IT IS READ, NOT BACK-SOLVED. Working it out from today’s value less the flows would make the walk add up by construction and prove nothing (his ruling behind MK-NW-F-090)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-013",
    "words": "THE DAY BEFORE THE WINDOW OPENS, not the day it opens — B-115, found 2026-09-30."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-014",
    "words": "MONEY YOU ADDED IS NOT WEALTH YOU GENERATED. That is the whole distinction this figure exists to draw, and it is why a balance going up is not the same as having earned anything."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-014",
    "words": "A DIVIDEND IS INSIDE IT, because it was earned by the holding rather than added by you."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-015",
    "words": "THE LINES ALWAYS SUM TO THE ENDING, by construction. Whatever the records cannot explain lands in the change-in-value line rather than being silently dropped — a walk that does not add up is worse than no walk."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-016",
    "words": "TWO DECIMALS AND ITS SIGN, always (Q49): +6.67%, −0.57% — never +6.7%, never a bare 6.67%."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-016",
    "words": "EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): \"All return should be True Weighted Return and not Dietz return.\""
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-016",
    "words": "WHERE IT CANNOT BE MEASURED IT SHOWS NO PERCENT, and never another method in its place."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-016",
    "words": "ONE METHOD WITH THE PORTFOLIO: the same door the Performance tab calls, asked for this one account."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-017",
    "words": "TWO DECIMALS AND ITS SIGN, always (Q49)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-017",
    "words": "EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669). Where it cannot be measured it shows no percent, and never another method in its place."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-017",
    "words": "AN ACCOUNT THAT JOINS THE RECORD inside the window counts as money in, at its first recorded value — nothing it was already worth is earned; when money was added to it that day, that money is what arrived and it was worth $0 the evening before (DEC-4439)."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-017",
    "words": "THE SAME DOOR AS ONE ACCOUNT’S RETURN (MK-PF-M-016), asked for every account at once — one method, never two."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-018",
    "words": "READ, NEVER BACK-SOLVED: with no recorded value the walk says so instead of inventing a start."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-019",
    "words": "THE LINES ALWAYS ADD UP TO THE ENDING — the change in investment value is what is left, so nothing is lost between the lines."
   },
   {
    "said_by": "author",
    "about": "MK-PF-M-020",
    "words": "A BUY OR WITHDRAWAL BIGGER THAN THIS IS REFUSED on the sheet, with the words to deposit or transfer cash in first."
   },
   {
    "said_by": "author",
    "about": "MK-XS-M-004",
    "words": "ONE MEANING OF RETURN (B-97, 2026-09-25): dividends and interest are in it, because \"Wealth generated\" beside it counts them."
   },
   {
    "said_by": "author",
    "about": "MK-XS-M-004",
    "words": "A RATE NEEDS SOMETHING TO STAND ON: with no beginning read from the record and no movement to point at, it shows nothing rather than a confident +0.00%."
   },
   {
    "said_by": "author",
    "about": "MK-XS-M-004",
    "words": "IT IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): \"All return should be True Weighted Return and not Dietz return.\" Where a piece cannot be measured it shows nothing, and never another method."
   },
   {
    "said_by": "author",
    "about": "MK-XS-M-004",
    "words": "OVER A YEAR IT IS A YEARLY RATE and the screen says so (his ruling, 2026-08-18, restated 2026-09-25)."
   }
  ],
  "approved_drawing": {
   "drawing": "Performance v17, phone 1 (approved 2026-10-01)",
   "household": "Two linked accounts, record beginning Oct 1, 2025, read on Sep 30, 2026. All accounts: beginning market value $100,000; contributions $15,000; withdrawals $0; dividends $1,800; interest $400; change in investment value $5,800. Vanguard alone: beginning $80,000, contributions $15,000, wealth generated $6,000, ending $101,000. E*TRADE alone: beginning $20,000, nothing added or taken out, wealth generated $2,000, ending $22,000.",
   "drawn": {
    "Wealth generated, all accounts": 8000,
    "Ending market value, all accounts": 123000,
    "E*TRADE return": "+10.00%",
    "note": "The drawing shows a yearly rate of 7.46% for all accounts and 6.88% for Vanguard, but does not give the dates the $15,000 went in, so those two rates cannot be used as expected values."
   }
  }
 }
]
```
