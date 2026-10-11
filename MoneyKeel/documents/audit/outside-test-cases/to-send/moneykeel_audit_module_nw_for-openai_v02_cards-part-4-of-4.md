# The cards — "nw module final — part 4 of 4"

29 cards, so 29 formula checks and 145 cases. Read the brief file moneykeel_audit_module_nw_for-openai_v01.md first. Put `"batch": "nw module final — part 4"` in your reply.

```json
[
 {
  "id": "MK-NW-F-117",
  "name": "propertyUseMap",
  "kind": "function",
  "what_it_is_for": "What each property is for — the home lived in, a rental, or a second home — by his rule DEC-1926: a rental only when a rent entry on the Income screen names it; the one marked as the home is the home; with none marked and no use stated on any, the one entered first; every other property is a second home.",
  "formula_in_words": "For each real-estate account: rental when a live rent entry names it, or — only when no rent entries were handed in at all (unknown, not none) — when it is stored as a rental. Of the rest: the one marked as the home lived in is home; with none marked and no other use stated (a stored 'rental' word does not count here), the one entered first (last in the list) that is not stored as a rental is home — a property stored as a rental is never made the home this way. Every other property is a second home. A rent entry that names no property makes no property a rental (owner rule DEC-4059d, 2026-10-10 — it used to make the one other property a rental when exactly one remained).",
  "handed": "export function propertyUseMap(accounts: AssetAccount[], rentals?: RentEntry[] | null): Map<string, 'home' | 'rental' | 'second'>"
 },
 {
  "id": "MK-NW-F-118",
  "name": "itemizeMissingCount",
  "kind": "function",
  "what_it_is_for": "How many listed holdings have no value — so a remainder is said to be not final, never presented as complete.",
  "formula_in_words": "How many listed holdings have no value (none entered, or not a number). A remainder worked out while any are missing is not final.",
  "handed": "export const itemizeMissingCount = (items: ItemHolding[]): number"
 },
 {
  "id": "MK-NW-F-119",
  "name": "estimatedAccrued",
  "kind": "function",
  "what_it_is_for": "The interest a bond has earned since its last yearly coupon, estimated from the coupon schedule — face × rate × days since the last coupon ÷ days in that coupon year; nothing for a bank CD, a matured or undated bond, or one with no face or rate.",
  "formula_in_words": "The interest earned since the last yearly coupon, estimated from the coupon schedule: face × rate × the days since the last maturity anniversary ÷ the days in that coupon year, with the days. Nothing for a CD bought from the bank (a CD bought through a broker is estimated like a bond, DEC-3837, 2026-10-10), a bond with no face or no rate above zero, no maturity date or a day that does not exist, a matured bond, or on a coupon day (nothing has accrued).",
  "handed": "export function estimatedAccrued(b: BondInfo, now: Date = new Date()): { amount: number; days: number } | null",
  "inputs_it_reads": [
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-120",
  "name": "classEvidenceOf",
  "kind": "function",
  "what_it_is_for": "What an account's own facts say its class is, before its kind is read: a maturity date first, then its name — never a property's name.",
  "formula_in_words": "What an account's own facts say its class is, before its kind is looked at. A maturity date that reads as a real date (the same reading as MK-NW-F-009 maturityClass: a text that is not a real date counts as no date, DEC-4059b/c, 2026-10-10) makes it Bonds & CDs. Otherwise a property — a home, real estate, a vehicle, or anything in the property group — gives nothing, because its name is a place, not evidence. Otherwise what its name is evidence for, or nothing.",
  "handed": "export function classEvidenceOf(a: AssetAccount): AssetClass | null",
  "inputs_it_reads": [
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-121",
  "name": "holdingTagClass",
  "kind": "function",
  "what_it_is_for": "The class a holding's stored tag stands for — 'bond' Bonds & CDs, 'other' Alternatives, 'cash' Cash, any other tag Stocks / Funds — or null when nothing is stored.",
  "formula_in_words": "The class a holding's stored tag means: bond is Bonds & CDs, other is Alternatives, cash is Cash, any other tag is Stocks / Funds, and no tag is nothing.",
  "handed": "export function holdingTagClass(tag?: string | null): AssetClass | null"
 },
 {
  "id": "MK-NW-F-122",
  "name": "holdingTagFor",
  "kind": "function",
  "what_it_is_for": "The tag a holding is stored under for a class — the reverse of holdingTagClass.",
  "formula_in_words": "The tag a holding is stored under for a class, the reverse of the reading above: Bonds & CDs is bond, Alternatives is other, Cash is cash, Stocks / Funds is stock_etf; any other class has no tag.",
  "handed": "export function holdingTagFor(cls: AssetClass): 'bond' | 'other' | 'cash' | 'stock_etf' | null"
 },
 {
  "id": "MK-NW-F-123",
  "name": "holdingNameEvidence",
  "kind": "function",
  "what_it_is_for": "What a holding's name (ticker and description together) is evidence for, or null.",
  "formula_in_words": "What a holding's ticker and description, read together, are evidence for — a class, or nothing when the words name none.",
  "handed": "export function holdingNameEvidence(p: any): AssetClass | null",
  "inputs_it_reads": [
   "MK-XS-I-010 transaction words (the institution's own wording)"
  ]
 },
 {
  "id": "MK-NW-F-124",
  "name": "maturityParts",
  "kind": "function",
  "what_it_is_for": "A maturity date read as a real calendar day (year, month, day), or nothing when it is missing or impossible.",
  "formula_in_words": "A maturity date read as a real calendar day: its year, month and day, when the date is written year-month-day and that day exists on the calendar. Nothing when there is no date, it is written another way, or the day does not exist (a day past the end of its month, or a month past December).",
  "handed": "export function maturityParts(maturity: string): [number, number, number] | null",
  "inputs_it_reads": [
   "MK-XS-I-013 bond maturity date"
  ]
 },
 {
  "id": "MK-NW-F-125",
  "name": "isPastMaturity",
  "kind": "function",
  "what_it_is_for": "Whether a bond or CD is past its maturity date — the day after it, by the calendar.",
  "formula_in_words": "Yes when the bond's maturity date is a real calendar day earlier than today's date on the device; no when it is today or later. No date, or a day that does not exist, is unknown, so the answer is no — never matured.",
  "handed": "export function isPastMaturity(maturity: string, now: Date = new Date()): boolean",
  "inputs_it_reads": [
   "MK-XS-I-013 bond maturity date"
  ]
 },
 {
  "id": "MK-NW-F-126",
  "name": "yearlyInterestNow",
  "kind": "function",
  "what_it_is_for": "A year's interest from one bond or CD as it pays today: its yearly interest, and $0 once it is past its maturity date.",
  "formula_in_words": "A year's interest from one bond or CD as it pays today: $0 once it is past its maturity date; otherwise its yearly interest (face × rate, or the value × rate when no face was entered), and nothing when no rate was entered.",
  "handed": "export function yearlyInterestNow(b: BondInfo, now: Date = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-127",
  "name": "gainOfRow",
  "kind": "function",
  "what_it_is_for": "THE ONE RULE FOR WHAT A HOLDING GAINED OVER THE WINDOW (DEC-3656, 2026-10-09), or null when it cannot be known.",
  "formula_in_words": "What one holding gained over the window, or nothing when that cannot be known. Bought inside the window: its own gain (value less cost). With a return for the period: the return over the WHOLE window (the window total the row carries; else, when the window is longer than one year, the yearly rate compounded over the window's years — (1 + rate) to the power years − 1; else the return as given); then value now × (1 − 1 ÷ (1 + that)), and $0 when it holds nothing. A CD with a stated rate above zero: value now × (1 − 1 ÷ (1 + the rate) to the power of the window's years), and $0 when it holds nothing. Otherwise: $0 when it holds nothing (heldValueOf is 0), and nothing (unknown) when it holds something or its worth is unknown — a holding with no price history and no rate.",
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
  "id": "MK-NW-F-131",
  "name": "pricedLikeBond",
  "kind": "function",
  "what_it_is_for": "(DEC-3837, 2026-10-10) THE ONE TEST of whether a holding is priced like a bond: every bond is, and a CD only when it was bought through a broker.",
  "formula_in_words": "Yes for every bond that is not a CD. For a CD: yes only when it was bought through a broker; a CD bought from the bank, or one whose answer was never given, is no (DEC-3837, 2026-10-10). This is the one test every bond figure reads to decide whether a CD is priced like a bond.",
  "handed": "export function pricedLikeBond(b: BondInfo): boolean",
  "inputs_it_reads": [
   "MK-XS-I-049 bond price — what the bond is worth today"
  ]
 },
 {
  "id": "MK-NW-F-132",
  "name": "notClassifiedWords",
  "kind": "function",
  "what_it_is_for": "(DEC-4036h, 2026-10-10) His wording for money no priced holding explains: \"<amount> asset type not classified\".",
  "formula_in_words": "The words for money in an alternatives part that no priced holding explains: the amount as money, then \"asset type not classified\".",
  "handed": "export function notClassifiedWords(amount: number): string",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-133",
  "name": "valueEntered",
  "kind": "function",
  "what_it_is_for": "(DEC-4036j/k, 2026-10-10) Whether an account's value was entered at all — a $0 typed is entered; nothing is not.",
  "formula_in_words": "Yes when the account has a balance that is a real number; no when its balance is missing or not a number.",
  "handed": "const valueEntered = (a: AssetAccount): boolean",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance"
  ]
 },
 {
  "id": "MK-NW-F-134",
  "name": "carValueNotEnteredNotes",
  "kind": "function",
  "what_it_is_for": "(DEC-4036j, 2026-10-10) The line the screen showing the car you drive adds for each vehicle whose value is not entered and that was not picked: \"<vehicle name>'s value not entered — it may be the car you drive.\"",
  "formula_in_words": "For each vehicle whose value is not entered and that was not picked as the car you drive: its shown name (else its label, else its institution, else \"A vehicle\") followed by \"'s value not entered — it may be the car you drive.\"",
  "handed": "export function carValueNotEnteredNotes(accounts: AssetAccount[], names?: Map<string, string>): string[]",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ]
 },
 {
  "id": "MK-NW-F-135",
  "name": "earmarkLeavesOut",
  "kind": "function",
  "what_it_is_for": "(DEC-4036k, 2026-10-10) The accounts the retirement money (MK-NW-F-033 retirementEarmarkedValue) leaves out because their value is not entered, though their share would count: each by its name.",
  "formula_in_words": "The accounts the retirement money leaves out because their value is not entered while their retirement share is above zero (the share saved, else the share it would have by default), each by its shown name, else its label, else its institution, else \"An account\".",
  "handed": "export function earmarkLeavesOut(accounts: AssetAccount[], names?: Map<string, string>): string[]",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name",
   "MK-XS-I-050 the share of an account earmarked for retirement"
  ]
 },
 {
  "id": "MK-NW-F-136",
  "name": "earmarkLeavesOutWords",
  "kind": "function",
  "what_it_is_for": "(DEC-4036k, 2026-10-10) What the retirement money says under it: \"leaves out <account name> — Value not entered\" (the DEC-3657 words).",
  "formula_in_words": "The words under the retirement money: \"leaves out <names, joined by commas> — Value not entered\" when any account is left out; nothing when none is.",
  "handed": "export function earmarkLeavesOutWords(accounts: AssetAccount[], names?: Map<string, string>): string | null"
 },
 {
  "id": "MK-NW-F-137",
  "name": "asksCashOrInvestments",
  "kind": "function",
  "what_it_is_for": "(DEC-4036g, 2026-10-10) Whether an account still carries that question: marked by sign-up, and still Unclassified.",
  "formula_in_words": "Yes when the account is marked to be asked whether it is cash or investments and it is still Unclassified; no otherwise.",
  "handed": "export const asksCashOrInvestments = (a: AssetAccount): boolean"
 },
 {
  "id": "MK-NW-O-001",
  "name": "theBonds",
  "kind": "orchestrator",
  "what_it_is_for": "What bonds and CDs do I hold, what do they pay, and when do they mature?",
  "formula_in_words": "Takes every account that is a bond or CD. Rows are sorted by maturity date, soonest first, with any that has no date last. Count, total value, total face value, interest in a year, average yield and next maturity come from bondSummary. When one bond is opened it also gives: matured = its maturity date is today or earlier, by the calendar (a bond with no date has not matured — it is unknown); a matured bond gives no yield to maturity and no rate-move figure; and what a move in interest rates would do to its value (bondRateSensitivity) — except for a CD bought from the bank, where no figure is given and a sentence says a CD is not traded and is worth its balance until it matures; a CD bought through a broker gets the figure like a bond and no sentence (DEC-3837, 2026-10-10). It also names the bonds the average yield leaves out — those with no value today, and, apart, those with a value but no rate entered — and the bonds with no face value entered, so a screen can say which.",
  "handed": "export function theBonds(input: BondsInput): Bonds",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-003 institution name",
   "MK-XS-I-011 bond face value",
   "MK-XS-I-012 bond coupon rate",
   "MK-XS-I-013 bond maturity date",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-049 bond price — what the bond is worth today"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-023",
    "words_on_screen": "Face value",
    "unit": "money",
    "what_it_answers": "What this bond pays back on the day it matures.",
    "when_it_refuses": "Not entered, so nothing is shown.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-024",
    "words_on_screen": "Interest payments",
    "unit": "words",
    "what_it_answers": "The rate it pays, and what that comes to in a year.",
    "when_it_refuses": "No coupon rate entered.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-025",
    "words_on_screen": "Matures",
    "unit": "words",
    "what_it_answers": "The day it pays back, and how long that is away.",
    "when_it_refuses": "No maturity date entered — the yields refuse rather than guess one.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-026",
    "words_on_screen": "Yield if held to maturity",
    "unit": "percent-2dp",
    "what_it_answers": "What it earns a year if you hold it to the end, counting the gap between its price and its face value.",
    "when_it_refuses": "Matured, or no maturity date — it refuses rather than divide by nothing.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-027",
    "words_on_screen": "Yield on today's value",
    "unit": "percent-2dp",
    "what_it_answers": "What the interest comes to against what the bond is worth today.",
    "when_it_refuses": "No value today.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-028",
    "words_on_screen": "Rates rise 1% → value roughly $X–$Y",
    "unit": "words",
    "what_it_answers": "Roughly what this bond would be worth if interest rates moved one percent either way.",
    "when_it_refuses": "Refused for a CD bought from the bank, for a matured bond, and for anything with no coupon or no maturity — and for a bank CD it says plainly why nothing happens.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-041",
    "words_on_screen": "total value of your bonds",
    "unit": "money",
    "what_it_answers": "What every bond and CD you hold is worth today, added up.",
    "when_it_refuses": "No bonds entered yet, so it says so rather than showing $0.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-042",
    "words_on_screen": "n bonds · face $X",
    "unit": "words",
    "what_it_answers": "How many you hold, and what they pay back at maturity in total.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-043",
    "words_on_screen": "COUPON",
    "unit": "money",
    "per": "year",
    "what_it_answers": "The interest all your bonds pay in a year, in money.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-044",
    "words_on_screen": "AVG YIELD",
    "unit": "percent-2dp",
    "what_it_answers": "What your bonds yield on what they are worth today, weighted by value.",
    "when_it_refuses": "A bond with no price today is left out rather than counted at zero.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-045",
    "words_on_screen": "each bond — face, coupon, yield",
    "unit": "words",
    "what_it_answers": "One line per bond: what it pays back, what it pays you, and what that is worth today.",
    "when_it_refuses": "A bond fund has no face value or maturity, so it shows none.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-053",
    "words_on_screen": "face",
    "unit": "money",
    "what_it_answers": "The face value of every bond and CD added up — what they pay back at maturity, which is not what they are worth today.",
    "when_it_refuses": "No bonds entered yet, so no face total either.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-054",
    "words_on_screen": "one bond’s value",
    "unit": "money",
    "what_it_answers": "What this one bond or CD is worth today.",
    "when_it_refuses": "— the row is not drawn at all when there is no bond.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-055",
    "words_on_screen": "one bond’s face",
    "unit": "money",
    "what_it_answers": "What this one bond pays back at maturity.",
    "when_it_refuses": "No face value entered — the row says “face value not entered”.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-056",
    "words_on_screen": "coupon",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What this one bond pays in a year, in cash.",
    "when_it_refuses": "No coupon rate entered — the figure is left out rather than shown as $0.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-057",
    "words_on_screen": "yield",
    "unit": "percent-2dp",
    "what_it_answers": "What this bond pays in a year as a share of what it is worth today.",
    "when_it_refuses": "— when there is no coupon rate or no value to divide by.",
    "shown_on": [
     "/bonds"
    ]
   },
   {
    "id": "MK-NW-M-058",
    "words_on_screen": "Yield to maturity",
    "unit": "percent-2dp",
    "what_it_answers": "What this bond would earn a year if held to maturity, counting the gain or loss between what it is worth now and what it pays back.",
    "when_it_refuses": "— with no maturity date there are no years to spread the difference over.",
    "shown_on": [
     "/bonds"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0108",
    "date": "2026-08-11",
    "words": "Update master PRD document. Go to master list of what"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-026",
    "words": "An approximation, and labelled an estimate on screen."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "An estimate, and it wears the estimate label."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "FOUNDER 2026-09-27: a CD bought from the bank gets no estimate. It is not traded, so its value does not move with rates; the screen says that instead."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-028",
    "words": "DEC-3837, 2026-10-10: a CD bought through a broker trades, so it gets the estimate like a bond. A CD whose answer was never given is read as bought from the bank."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-053",
    "words": "FACE AND VALUE ARE SHOWN SIDE BY SIDE because they differ, and the difference is the whole point: a bond bought below face pays back more than it is worth today."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-056",
    "words": "IT IS PAID ON FACE, NOT ON VALUE. A $25,000 bond worth $24,200 still pays 4.5% of $25,000 — computing it on the market value understates the income."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-057",
    "words": "WHERE ACCRUED INTEREST WAS NOT ENTERED the row says so beneath the figures rather than quietly leaving it in the price (his ruling, DEC-0280)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-058",
    "words": "AN ESTIMATE, and the foot of the screen says so in those words."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-058",
    "words": "DEC-3837, 2026-10-10: a CD bought from the bank yields its interest rate; a CD bought through a broker is priced like a bond, its yield solved from its face value, rate, value and maturity date. A CD whose answer was never given is read as bought from the bank."
   }
  ]
 },
 {
  "id": "MK-NW-O-002",
  "name": "theAccount",
  "kind": "orchestrator",
  "what_it_is_for": "What is in this one account: what it is worth, what it holds, what each holding has paid, and its activity?",
  "formula_in_words": "Uses the records whose account is this account, and any transfer that arrives in it from another account. Market value = the account's balance. Income = dividends + interest in those records, to the cent — and NO FIGURE when the account has no records at all. Inside = for a linked account, the value in each asset class that is not zero (accountClassBreakdown); for any other account, nothing. Activity = every record with its date, type, ticker and amount: the amount is the record's effect on cash, except a transfer INTO this account, which shows the amount moved; a record counts as the person's own unless it came through the link. Income of one holding = dividends and interest whose record names that holding's ticker, capitals ignored; a record naming no ticker belongs to no holding.",
  "handed": "export function theAccount(input: {\n  account: AssetAccount;\n  transactions: any[];\n}): TheAccount",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-008 transaction amount",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-024 logged expenses"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-018",
    "words_on_screen": "Market value",
    "unit": "money",
    "what_it_answers": "What this account is worth today.",
    "when_it_refuses": "An account with no value shows nothing rather than $0.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-NW-M-019",
    "words_on_screen": "Income",
    "unit": "money",
    "what_it_answers": "The dividends and interest this account has actually received.",
    "when_it_refuses": "No records — it says so instead of showing zero.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-020",
    "words_on_screen": "each asset class inside the account",
    "unit": "money",
    "what_it_answers": "What each kind of thing inside this account is worth — cash, bonds, stocks, alternatives.",
    "when_it_refuses": "Not linked — the screen shows the itemise door instead of inventing a breakdown.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-021",
    "words_on_screen": "Income: <amount> on a holding row",
    "unit": "words",
    "what_it_answers": "What this one holding has paid you, from the records that name it.",
    "when_it_refuses": "No record naming this holding — the line does not appear at all.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-022",
    "words_on_screen": "ACTIVITY — n records",
    "unit": "count",
    "what_it_answers": "How many records this account has: what has happened in it.",
    "when_it_refuses": "None yet — the section keeps its heading and says so.",
    "shown_on": [
     "/account-detail"
    ]
   },
   {
    "id": "MK-NW-M-038",
    "words_on_screen": "We keep the total at $X",
    "unit": "money",
    "what_it_answers": "The figure the account must still add up to while you say what is inside it.",
    "when_it_refuses": "Nothing to itemise.",
    "shown_on": [
     "/itemize"
    ]
   },
   {
    "id": "MK-NW-M-039",
    "words_on_screen": "$X of $Y itemized · remainder",
    "unit": "money",
    "what_it_answers": "How much of the account you have placed, and how much is still unplaced.",
    "when_it_refuses": "Nothing entered yet — it reads $0 of the balance.",
    "shown_on": [
     "/itemize"
    ]
   },
   {
    "id": "MK-NW-M-040",
    "words_on_screen": "each holding and its value",
    "unit": "money",
    "what_it_answers": "One line per thing you have said is inside this account, and what it is worth.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/itemize"
    ]
   },
   {
    "id": "MK-NW-M-062",
    "words_on_screen": "what one record moved",
    "unit": "money",
    "what_it_answers": "What this one record added to the account or took out of it.",
    "when_it_refuses": "No records yet — the section keeps its heading and says so.",
    "shown_on": [
     "/account-detail",
     "/invest"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0010",
    "date": "2026-07-28",
    "words": "\"yes\" — DEC-0010, confirmed as written: Chart colors: the UX doc’s validated colorblind-safe palettes WILL BE ADOPTED app-wide (one consistent set; e.g. Cash ge"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0019",
    "date": "2026-07-31",
    "words": "\"yes\" — DEC-0019, confirmed as written: B47 FINDING 3 FIXED (Vanguard): balance authority rule gains the derive-from-holdings fallback when the broker reports n"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0045",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0045, confirmed as written: Private equity + Hedge funds OUT of phase 1 (founder: keep it simple) — capture chips trimmed on both editors; data mode"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0051",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0051, confirmed as written: CLASSIFICATION RULE: cash = cash only. Money-market funds → Stocks/ETFs; CDs/T-bills → Bonds & CDs (any maturity). Super"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0070",
    "date": "2026-08-10",
    "words": "Connect a brokerage"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0090",
    "date": "2026-08-11",
    "words": "seems repetitive as it is already listed under CDs and Bonds asset class... can we add the number and say 3 CD & 1 treasury bond in this account?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0092",
    "date": "2026-08-11",
    "words": "we decided to move money markets and T-bills to stock/etf and bond & CD respectively."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0095",
    "date": "2026-08-11",
    "words": "why is cash added to CD and not cash?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0096",
    "date": "2026-08-11",
    "words": "$500 is what I added manually as a deposit to the Vanguard account. It never asked me if it was in cash or something else?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0108",
    "date": "2026-08-11",
    "words": "Update master PRD document. Go to master list of what"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0166",
    "date": "2026-08-14",
    "words": "not sure what you want me to check here."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0192",
    "date": "2026-08-28",
    "words": "s number was its POSITION in a list — nid() counted up as it walked them — so inserting a row silently renumbered every metric after it in that family. 93 audit findings are keyed to those numbers, as are the founder"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0406",
    "date": "2026-09-12",
    "words": "Let's not assume that the reader knows what the statement is referring to. Always be explicit."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0451",
    "date": "2026-06-30",
    "words": "cash means cash+ cashequivalents?"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-019",
    "words": "Never estimated. A broker that shares no income records leaves this blank rather than showing a made-up $0."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-020",
    "words": "Only a LINKED account has an inside to read. A hand-entered lump has none until someone itemises it."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-021",
    "words": "FOUNDER FINDING 2026-08-11: a record with no ticker names no holding. It used to match every non-stock holding, so a CD showed dividends it cannot pay and two CDs showed one figure twice. Untickered income is counted at the ACCOUNT level instead, where it belongs."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-038",
    "words": "Itemising describes what is inside an account; it never changes what the account is worth."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-040",
    "words": "A CLASS HOLDING NOTHING IS NOT LISTED — a $0 line reads as \"we checked and it is empty\", which is a different claim from \"there is none\"."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-040",
    "words": "Uninvested money in the account is one of the lines, under the words he ruled on 2026-08-11: cash in this account."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-062",
    "words": "THE SIGN IS SHOWN AS A WORD OR A MARK, never by colour alone — a plus or a minus in front of the figure, so it reads the same to someone who cannot tell the two colours apart."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-062",
    "words": "A RECORD YOU TYPED AND ONE THE BROKER SENT BOTH APPEAR, each saying which it is (DEC-0107). A $500 deposit mistyped as $5,000 is only findable if the row says where it came from."
   }
  ]
 },
 {
  "id": "MK-NW-O-003",
  "name": "theNetWorth",
  "kind": "orchestrator",
  "what_it_is_for": "What am I worth: everything I own, less everything I owe, and how each breaks down?",
  "formula_in_words": "Assets = every account's balance added up. Debts = every debt's remaining balance added up. Net worth = assets − debts. Cash = cashTotal. Investments = investmentsTotal: the investment classes of the class split added up (Stocks / Funds, Bonds & CDs, Alternatives, Unclassified, from assetAllocation) — so a linked account's uninvested cash is in Cash only, and Cash + Investments + property comes to everything owned. Investable = investableAssets. By class = assetAllocation. Each debt is listed with its balance and its required monthly payment (the larger of its minimum and the payment the person says they make); monthly debt payments = those added up; monthly debt minimum = the minimums alone added up. Return on cash + investments = a TIME-WEIGHTED return (owner decision, 2026-10-04: \"All return should be True Weighted Return and not Dietz return.\") over every account that is not property: the period from the day compared from to today is split at every day money moved in or out; each piece = the value just before the next movement ÷ the value just after the last one; the pieces are multiplied and 1 is taken off; returned as a share. A month given without a day is read as its first day. Cash earns only interest: any other change in a cash account's balance is money moving, counted on the day the record first shows it. For the other accounts, money moving = deposits, withdrawals and cash transferred between accounts. Today's value is read from the accounts as they stand. No figure when no day is given, when no recorded day on or before the day compared from holds the accounts, when money moved on a day with no recorded value, when a deposit, withdrawal or transfer on a measured account has no amount on record, or when shares were moved in or out. It also hands out the match of mortgages to properties (mortgagesByProperty). It also names the holdings nothing could class and the person has not yet answered about (account, holding), and the sentence that asks.",
  "handed": "export function theNetWorth(input: {\n  uid: string;\n  accounts: AssetAccount[];\n  debts: Debt[];\n  /** The recorded history, for the line and the return. */\n  monthlyHistory?: Record<string, unknown> | null;\n  dailyNetWorth?: Record<string, unknown> | null;\n  /** The daily record of what each account was worth, and every record of money moving — what the\n   *  return on cash + investments is measured from. */\n  snapshotDays?: any[] | null;\n  transactions?: any[] | null;\n  /** The day a change is measured FROM. With none, the change figures refuse. */\n  since?: string | null;\n  /** Today, as a day. The screen's own day when it gives one. */\n  today?: string;\n}): TheNetWorth",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-014 debt balance",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-056 how a holding was classified, and by whom"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-016",
    "words_on_screen": "Total invested · Cash total · Investable total",
    "unit": "money",
    "what_it_answers": "The three totals Insights reasons about — and they are the SAME three the Net worth tab shows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/insights"
    ]
   },
   {
    "id": "MK-NW-M-001",
    "words_on_screen": "Change in net worth +$X",
    "unit": "money",
    "what_it_answers": "How much your net worth has moved since the day the line starts.",
    "when_it_refuses": "A line needs at least two points; with one, the point is shown and no change is stated.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-002",
    "words_on_screen": "Return on cash + investments",
    "unit": "percent-2dp",
    "what_it_answers": "How much your cash and investments have grown since the day you are comparing against, with money you added or took out left out.",
    "when_it_refuses": "No figure: the record does not reach back to the day compared from, or money moved on a day with no recorded value.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-003",
    "words_on_screen": "the trend line",
    "unit": "count",
    "what_it_answers": "How many points the line is drawn from — the months on record plus the days after them.",
    "when_it_refuses": "With one point the point is shown and the line is not drawn.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-004",
    "words_on_screen": "WHAT YOU OWN",
    "unit": "money",
    "what_it_answers": "Everything you own, added up.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-005",
    "words_on_screen": "CASH",
    "unit": "money",
    "what_it_answers": "The money you could spend today.",
    "when_it_refuses": "No cash account entered.",
    "shown_on": [
     "/analytics",
     "/insights"
    ]
   },
   {
    "id": "MK-NW-M-006",
    "words_on_screen": "🏠 PERSONAL PROPERTY",
    "unit": "money",
    "what_it_answers": "What one band under WHAT YOU OWN holds — here the vehicles and valuables.",
    "when_it_refuses": "The band shows $0 and, on a fresh account, the one line \"Nothing entered yet. Add your accounts ›\".",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-007",
    "words_on_screen": "class rows — by class, institution or type",
    "unit": "money",
    "what_it_answers": "What each kind of thing you own is worth.",
    "when_it_refuses": "A class with nothing in it keeps its heading and says so.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-008",
    "words_on_screen": "each account and its balance",
    "unit": "money",
    "what_it_answers": "One line per account inside a band, with what that account holds.",
    "when_it_refuses": "$0, and on a fresh account the one line \"Nothing entered yet. Add your accounts ›\". A real entered zero shows a plain $0 with no line.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-009",
    "words_on_screen": "DEBTS",
    "unit": "money",
    "what_it_answers": "Everything you owe.",
    "when_it_refuses": "No debts entered.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-010",
    "words_on_screen": "each debt and what is left on it",
    "unit": "money",
    "what_it_answers": "One line per debt, and what is still owed on it.",
    "when_it_refuses": "None entered.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-011",
    "words_on_screen": "minimum monthly payment on a debt",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What this debt requires of you each month.",
    "when_it_refuses": "No minimum entered.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-012",
    "words_on_screen": "Monthly debt payments",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What all your debts require of you in a month, together.",
    "when_it_refuses": "No debts entered.",
    "shown_on": [
     "/analytics",
     "/home"
    ]
   },
   {
    "id": "MK-NW-M-015",
    "words_on_screen": "YOUR RETIREMENT PLAN — on track for $X by age Y",
    "unit": "money",
    "what_it_answers": "What your pot is on course to be worth at the age you said you would retire.",
    "when_it_refuses": "No figure when there is nothing to grow, or when retirement is not ahead of the person.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-016",
    "words_on_screen": "Net worth so far (setup)",
    "unit": "money",
    "what_it_answers": "What you are worth as the setup answers stand, before anything else is entered.",
    "when_it_refuses": "Adds to $0 when there is nothing to add. Zero and \"nothing recorded yet\" read alike on screen — worth a decision.",
    "shown_on": [
     "/networth"
    ]
   },
   {
    "id": "MK-NW-M-017",
    "words_on_screen": "Assets $X − Debts $Y = Net worth $Z",
    "unit": "words",
    "what_it_answers": "The whole sum in one line, so it can be checked by eye.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-049",
    "words_on_screen": "Total value",
    "unit": "money",
    "what_it_answers": "What your alternatives are worth — crypto, private equity, commodities and the rest.",
    "when_it_refuses": "None entered yet.",
    "shown_on": [
     "/other-investments"
    ]
   },
   {
    "id": "MK-NW-M-063",
    "words_on_screen": "what is inside this institution",
    "unit": "money-compact",
    "what_it_answers": "What this one institution holds, broken down by kind, so a roll-up can be read rather than taken on trust.",
    "when_it_refuses": "One kind only — the line is left out, because a roll-up of one thing is just the thing.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-XS-M-001",
    "words_on_screen": "Net worth",
    "unit": "money",
    "what_it_answers": "Everything you own, less everything you owe.",
    "when_it_refuses": "Nothing entered yet — it says so and offers the door, rather than showing $0 as a fact.",
    "shown_on": [
     "/home",
     "/analytics"
    ]
   },
   {
    "id": "MK-XS-M-003",
    "words_on_screen": "YOUR INVESTMENTS",
    "unit": "money",
    "what_it_answers": "What your invested money is worth — stocks, funds, bonds and alternatives.",
    "when_it_refuses": "Nothing invested yet.",
    "shown_on": [
     "/home",
     "/analytics"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0010",
    "date": "2026-07-28",
    "words": "\"yes\" — DEC-0010, confirmed as written: Chart colors: the UX doc’s validated colorblind-safe palettes WILL BE ADOPTED app-wide (one consistent set; e.g. Cash ge"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0023",
    "date": "2026-08-01",
    "words": "Cash and cash equivalents"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0047",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0047, confirmed as written: BY TYPE view REMOVED (founder — resolves the open By-type question); WHAT YOU OWN restructures to the three uber-categor"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0048",
    "date": "2026-08-04",
    "words": "Your path ahead (from your Plan)"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0051",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0051, confirmed as written: CLASSIFICATION RULE: cash = cash only. Money-market funds → Stocks/ETFs; CDs/T-bills → Bonds & CDs (any maturity). Super"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0054",
    "date": "2026-08-04",
    "words": "calculating NW % on total is not meaningful — property increments are hand-captured."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0060",
    "date": "2026-08-04",
    "words": "build all the approved NW"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0061",
    "date": "2026-08-04",
    "words": "\"yes\" — DEC-0061, confirmed as written: MISSING-DATA BANNER + FIX-IT SHEET BUILT: new dataGaps engine (5 checks — unpriced holding · stale connection · no divid"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0066",
    "date": "2026-08-10",
    "words": "NW Main Screen"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0069",
    "date": "2026-08-10",
    "words": "\"yes\" — DEC-0069, confirmed as written: BY INSTITUTION REBUILT to match By category: institution groups now collapse and expand, keep their own open/closed memo"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0070",
    "date": "2026-08-10",
    "words": "Connect a brokerage"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0072",
    "date": "2026-08-11",
    "words": "order classes by LIQUIDITY, cash first"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0074",
    "date": "2026-08-11",
    "words": "it will give user view of what they can do in the app"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0089",
    "date": "2026-08-11",
    "words": "What you own bar - does not change to institution when I toggle to institution from category."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0090",
    "date": "2026-08-11",
    "words": "seems repetitive as it is already listed under CDs and Bonds asset class... can we add the number and say 3 CD & 1 treasury bond in this account?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0091",
    "date": "2026-08-11",
    "words": "the colors for different types of debt not friendly for color blind people."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0092",
    "date": "2026-08-11",
    "words": "we decided to move money markets and T-bills to stock/etf and bond & CD respectively."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0095",
    "date": "2026-08-11",
    "words": "why is cash added to CD and not cash?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0096",
    "date": "2026-08-11",
    "words": "$500 is what I added manually as a deposit to the Vanguard account. It never asked me if it was in cash or something else?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0158",
    "date": "2026-08-14",
    "words": "It is too harsh."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0165",
    "date": "2026-08-14",
    "words": "how to avoid this in the next brief?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0166",
    "date": "2026-08-14",
    "words": "not sure what you want me to check here."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0192",
    "date": "2026-08-28",
    "words": "s number was its POSITION in a list — nid() counted up as it walked them — so inserting a row silently renumbered every metric after it in that family. 93 audit findings are keyed to those numbers, as are the founder"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0264",
    "date": "2026-09-09",
    "words": "full precision for calculation; display two decimals unless stated (whole dollars for totals, balances, projections; eight for coin quantities); fix the code in one pass"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0301",
    "date": "2026-08-20",
    "words": "source always, date only when stale"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0309",
    "date": "2026-08-20",
    "words": "money-market: name-first classification on every road, broker tag as fallback; a class change between syncs is kept and flagged"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0311",
    "date": "2026-08-20",
    "words": "14 metrics cut: tax-loss harvesting, cash drag, age of money, savings rate, safe to spend, personal inflation, sequence buffer, drift, funded ratio, risk measures, look-through, fund fees, embedded tax, employer-stock flag"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0322",
    "date": "2026-08-20",
    "words": "status disagreements, work-list generation, engine counts, tab references, the PINNED word — all in the old metrics deliverable"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0343",
    "date": "2026-09-13",
    "words": "one concept, one function — a concept is computed by exactly one dependent function, called over whatever set it is asked about (total assets over all accounts, and over one institution's accounts, is the same function); a total and the sum of its parts are pinned by an invariant test, never assumed"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0345",
    "date": "2026-09-13",
    "words": "inputs assembled once per family — one function builds the person's state for a family and every orchestrator in that family reads it; no orchestrator and no screen assembles its own"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0347",
    "date": "2026-09-13",
    "words": "shared dependent functions are allowed and are recorded on every orchestrator row whose closure holds them; the closure is generated from the code, never typed"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0397",
    "date": "2026-08-26",
    "words": "enforce with GATES not intentions."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0403",
    "date": "2026-09-09",
    "words": "held as a float, decimals shown only for prices…"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0442",
    "date": "2026-06-30",
    "words": "The networth module missed an ability to edit bonds, cash and alternatives, also manually add transactions. Ability to add transactions was only available for stocks/etfs. The import feature does it work for alternatives such as options, crypto, currency, commodities? Does the ability to read different file formats from different insitutions via plaid api?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0446",
    "date": "2026-06-30",
    "words": "ensure to import institution name as well."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0449",
    "date": "2026-06-30",
    "words": "Which kind T-bills will be? And what is HYSA?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0451",
    "date": "2026-06-30",
    "words": "cash means cash+ cashequivalents?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0452",
    "date": "2026-06-30",
    "words": "why is value any versus float?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0455",
    "date": "2026-06-30",
    "words": "What's the cost differential?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0501",
    "date": "2026-06-30",
    "words": "Also talk about surfacing the right things at the right time ('what needs you')."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0509",
    "date": "2026-06-30",
    "words": "Home: how do you capture the information?"
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-016",
    "words": "Insights took these its own way before 2026-09-27; his ruling on Q-NW-1 made all three screens read one answer."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-001",
    "words": "IT IS READ FROM THE RECORD, never back-solved: the months we actually saved and the daily points after them."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-001",
    "words": "A month and its own days live in one series, sorted by their date text — \"2026-04\" sorts before \"2026-04-30\", which is what makes plain text sorting safe."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-002",
    "words": "EVERY RETURN IS TIME-WEIGHTED (owner, 2026-10-04, DEC-1669): \"All return should be True Weighted Return and not Dietz return.\" It was a change in balance, so money paid in read as money earned."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-002",
    "words": "THE DAY COMPARED FROM MUST BE ON RECORD. A comparison from before the record begins gives no figure — never one quietly measured from a later day."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-002",
    "words": "CASH EARNS ONLY INTEREST. A paycheck arriving or a bill being paid is money moving, counted on the day the record first shows it."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-003",
    "words": "A DAY THAT IS NOT A REAL DATE IS DROPPED, and a month whose figures do not add up is dropped — never drawn as a guess."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-003",
    "words": "The line is drawn only from days we hold a record for; today’s balances are never priced at past dates."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-005",
    "words": "A CD and a money-market fund are NOT cash: they are bonds and funds, because they pay interest and dividends that must be measured (founder, 2026-08-04)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-006",
    "words": "REAL ESTATE IS ITS OWN BAND: a house is not a vehicle, and mixing them hides both."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-006",
    "words": "THE SAME ACCOUNTS GROUP TWO WAYS — by class and by institution — and both ways add to the same total, so switching the view can never change what you own."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-006",
    "words": "An account with no institution recorded groups under \"No institution set\" rather than being dropped."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-008",
    "words": "UNDER AN INSTITUTION’S NAME, the class mix inside it is named too — a Fidelity holding a fund and a Treasury reads as a roll-up, not a flat lump."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-008",
    "words": "The mix is ordered biggest first, so the largest thing inside an institution is the first thing read."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-011",
    "words": "FOUNDER RULING G19 (2026-09-08): one payment rule, the larger of the stated minimum and the payment set — the same words in both formula columns."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-015",
    "words": "NO RANDOM RUNS ANYWHERE IN THIS ONE — it is the straight-line check that sits beside the 1,000-run odds, and the two answer different questions."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-015",
    "words": "The recommended pot is 25× the yearly expenses NOT covered by guaranteed income, counted from the start of the retirement year — which is why it differs from an outside calculator (his ruling)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-015",
    "words": "Guaranteed income starts at the age it was said to start, not at the retirement age."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-016",
    "words": "IT IS COMPUTED EACH TIME AND NEVER STORED as a third number that could disagree with its own two halves (his ruling)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-016",
    "words": "A GENUINE NEGATIVE IS SHOWN, never floored at zero — someone early in a mortgage really does owe more than they own."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-049",
    "words": "It is the Alternatives SLICE of net worth and must equal what the Net worth tab shows for that class — which is why it sits behind this door (founder, 2026-09-27: \"ok\")."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-063",
    "words": "BIGGEST FIRST, so the largest thing inside an institution is the first thing read."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-063",
    "words": "SHORTENED, because several of these share one line. It is the only place the app shortens a figure, and it is shortened only to fit — never to round a figure a person is checking."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-063",
    "words": "THE PARTS ADD TO THE INSTITUTION’S OWN TOTAL above them, which is the point of showing them."
   }
  ],
  "approved_drawing": {
   "drawing": "Net worth, Quiet Instrument v08, state A (approved 2026-09-14)",
   "household": "Chase Checking $8,000 (a bank account). Vanguard Brokerage $349,333, of which $838 is uninvested cash and $348,495 is stocks and funds. E*TRADE bonds and CDs $5,819. Home $450,000. Debts: home mortgage $412,000, Chase Visa $6,000.",
   "drawn": {
    "Cash": 8838,
    "Investments": 354314,
    "Personal property": 450000,
    "What you own": 813152,
    "Debts": 418000,
    "Net worth": 395152
   }
  }
 },
 {
  "id": "MK-NW-O-004",
  "name": "theEmergencyFund",
  "kind": "orchestrator",
  "what_it_is_for": "How many months of essential expenses would my cash cover?",
  "formula_in_words": "Cash = all cash (cashTotal), or the amount handed in when one is given. Owner rule, 2026-10-04: \"Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses.\" Debt minimums = the MINIMUM monthly payment of every debt added up — the home's mortgage included; a balance due in one lump has none. A payment a person chooses to make above the minimum is not counted: it can be stopped. The budget is read as it is counted (theBudgetCounted): where the home's mortgage is in Debts, the Rent / Mortgage budget line is counted as nothing, and the screen is given a sentence saying so. Essentials for a month = essential expenses + debt minimums. Essential expenses = the average of what was logged, over the calendar months of the last twelve that have a logged entry (this month alone when only it has one); the typed plan only when nothing is logged. Left out of that average, so nothing is counted twice: a payment logged against a debt that is entered (an expense in the category Debt payment, named for that debt), and, where the home's mortgage is in Debts, anything logged under Rent / Mortgage. Rent that keeps arriving = the Rent row of the Income summary (rent from a property less what it costs to run, less calculated tax when the tax rate is calculated), never below zero; owner, 2026-10-04: \"add it to the cash as losing job does not mean loosing rental income too.\" It arrives every month, so it is added to the cash every month. From cash each month = essentials − that rent, never below zero. Months covered = cash ÷ from cash each month; no figure when essentials are zero, and no figure when the rent pays for the whole month (the cash is then not drawn on, and it says so). Planned = planned monthly expenses + debt minimums; months covered at the planned level = cash ÷ (planned − that rent); no figure when that is zero or less. Target for N months = from cash each month × N; gap = target − cash, never below zero. Months left after a shock = (cash − the shock, never below zero) ÷ from cash each month. When a typed month of essentials is handed in, it stands in for essentials + debt minimums. A target, and the months left after a shock, are given only when there is an essentials figure. Rent not known, owner rule 2026-10-10 (instead of showing nothing, the card says the months are counted with the rent not included, and asks for the rent): the answer also says whether a property's rent is not known. It is not known only when the household holds a property that is not the home (home, rental and second home read by the owner's property-use rule of 2026-10-04) AND one of these holds: a rent entry's rent figure is blank or not a plain number, or the entry names no property (it is not counted as rent, owner rule DEC-4059d, 2026-10-10); with no list of rent entries, the single typed rent figure is typed at all (it names no property, so it is not counted, DEC-4059d); the rent entries are stored in a shape that is not a list; or with no rent entries stored at all, a property is kept as a rental. A property with no rent entry when rent entries are stored is a second home, not a missing rent. A household with no property other than the home is never flagged. The months covered are still given, counted without the unknown rent.",
  "handed": "export function theEmergencyFund(input: {\n  accounts: AssetAccount[];\n  expenses: any[];\n  profile: any;\n  /** The debts, so their minimums are counted. Missing means none entered, not none owed. */\n  debts?: Debt[];\n  /** Stress test lets a person TRY a cash figure of their own. It is seeded from their real cash and\n   *  editable, so the door takes what they typed and answers about that — the arithmetic is the same\n   *  question, asked of a number they chose. Absent, the answer is about the cash they actually have. */\n  cashOverride?: number;\n  /** Job safety lets a person TYPE what a typical month of essentials comes to. Given, it stands in\n   *  for the whole month — exactly as it did when that screen multiplied it out for itself. */\n  essentialsOverride?: number;\n}): EmergencyFund",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-014 debt balance",
   "MK-XS-I-015 debt interest rate",
   "MK-XS-I-016 debt minimum payment",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-025 typical monthly essentials",
   "MK-XS-I-028 assumed return"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-020",
    "words_on_screen": "N months of essentials is $X ($Y/month)",
    "unit": "words",
    "what_it_answers": "What the emergency fund you are aiming for actually costs.",
    "when_it_refuses": "No essentials figure yet.",
    "shown_on": [
     "/jobsafety"
    ]
   },
   {
    "id": "MK-MN-M-021",
    "words_on_screen": "Using $X/month from your logged expenses",
    "unit": "words",
    "what_it_answers": "Where the essentials figure came from, and how many months it stands on.",
    "when_it_refuses": "Nothing logged — it says the plan you entered is being used instead.",
    "shown_on": [
     "/jobsafety"
    ]
   },
   {
    "id": "MK-MN-M-024",
    "words_on_screen": "You could cover a $X hit",
    "unit": "money",
    "what_it_answers": "Whether your cash would absorb a sudden cost.",
    "when_it_refuses": "No cash entered.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-MN-M-025",
    "words_on_screen": "You'd have $X left — about N months of essentials",
    "unit": "words",
    "what_it_answers": "What would be left after the hit, and how long that would last.",
    "when_it_refuses": "No essentials figure — the months are not stated rather than guessed.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-MN-M-026",
    "words_on_screen": "your $X/month of essentials",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What one month of the things you cannot skip costs.",
    "when_it_refuses": "Nothing logged and no plan set.",
    "shown_on": [
     "/stress-test"
    ]
   },
   {
    "id": "MK-NW-M-013",
    "words_on_screen": "EMERGENCY FUND — X.X months",
    "unit": "months",
    "what_it_answers": "How many months your cash would cover, if your income stopped tomorrow.",
    "when_it_refuses": "No essentials figure yet — it says so rather than dividing by nothing. And no count of months where the rent pays for the whole month: the cash is then not drawn on.",
    "shown_on": [
     "/analytics",
     "/jobsafety",
     "/stress-test",
     "/insights",
     "/home"
    ]
   },
   {
    "id": "MK-NW-M-014",
    "words_on_screen": "of essentials covered by your cash — $X cash ÷ $Y/month essentials",
    "unit": "words",
    "what_it_answers": "The sum written out, so the months figure can be checked by eye.",
    "when_it_refuses": "Nothing logged and no plan set.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-046",
    "words_on_screen": "at your planned spend",
    "unit": "months",
    "what_it_answers": "How many months your cash would cover if you carried on living exactly as you plan to.",
    "when_it_refuses": "No expense figure yet — it shows nothing rather than dividing by nothing.",
    "shown_on": [
     "/analytics"
    ]
   },
   {
    "id": "MK-NW-M-047",
    "words_on_screen": "Both include $X/month of debt payments you cannot stop",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What your debts require of you each month, which neither runway can leave out.",
    "when_it_refuses": "No debts entered — the line does not appear at all.",
    "shown_on": [
     "/analytics",
     "/insights"
    ]
   },
   {
    "id": "MK-NW-M-048",
    "words_on_screen": "cash ÷ planned spend",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What a month costs at the life you plan to live, including what your debts require.",
    "when_it_refuses": "No expense figure yet.",
    "shown_on": [
     "/analytics",
     "/insights"
    ]
   },
   {
    "id": "MK-NW-M-064",
    "words_on_screen": "rent from your property, which keeps arriving",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The rent that would still arrive each month if your pay stopped.",
    "when_it_refuses": "No rental entered — the line does not appear at all.",
    "shown_on": [
     "/analytics",
     "/insights",
     "/stress-test",
     "/jobsafety"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0103",
    "date": "2026-08-11",
    "words": "Uncertain — retire at 65 with ~$1,607,000, lasting past 90 with ~$2,402,000 to spare — what does uncertain mean?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0158",
    "date": "2026-08-14",
    "words": "It is too harsh."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0260",
    "date": "2026-09-09",
    "words": "the screen shows $0 with a sentence explaining nothing is entered, and the door; the sentence approved; one mock of the pattern on one screen"
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-021",
    "words": "The label names the basis so nobody has to guess whether it is one month or a year (his ruling G21)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-013",
    "words": "ONE essentials figure across all three screens (his ruling G21, 2026-09-08): the average of what has been logged, over the months logged."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-013",
    "words": "FOUNDER 2026-10-04: \"add it to the cash as losing job does not mean loosing rental income too.\" Rent arrives every month, so it is added to the cash every month — which is the cash ÷ (the month − the rent)."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-046",
    "words": "FOUNDER 2026-09-28: \"give both numbers.\" The figure above it is what you could not stop paying; this one is the life you plan to live. Neither is the whole truth alone, so the screen shows both."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-047",
    "words": "FOUNDER 2026-09-28: \"What about credit card debt, HELOC, car loan?\" They were in NEITHER figure. You can skip dinner out; you cannot skip a car payment."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-047",
    "words": "FOUNDER 2026-10-04 (DEC-1923): \"Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency fund, and any other place instead of leaving it for user to add it to planned expenses.\" So the home’s mortgage is counted here from Debts, and the Rent / Mortgage budget line stands down — the home is in the figure once."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-047",
    "words": "IT IS THE MINIMUM: a payment a person chooses to make above it can be stopped."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-064",
    "words": "FOUNDER 2026-10-04: \"add it to the cash as losing job does not mean loosing rental income too.\""
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-064",
    "words": "It is the same figure as the Income summary's Rent row, read from that function, so the two screens cannot show two rents."
   }
  ]
 },
 {
  "id": "MK-NW-O-005",
  "name": "theAlternativesOutlook",
  "kind": "orchestrator",
  "what_it_is_for": "What might my alternative investments earn in a year: the expected rate, and the money it comes to?",
  "formula_in_words": "Count, total value and blended rate come from alternativesSummary: over every account that holds alternatives, its alternatives part (altPartsOf) — the same dollars the Net worth tab's Alternatives line counts. Blended rate: over the classified parts only; no figure when nothing classified is held. Growth in a year = alternativesSummary's growth (the classified parts × blended rate), given only when there is at least one such account and the total is above zero; otherwise no figure. Money not classified = the parts no priced holding or option explains; when it is not 0 the summary says: Expected return and growth leave out <amount> asset type not classified. Rows = each account that holds alternatives, at its alternatives part, with the yearly rate of its classified parts weighed by value (no rate when none of it is classified) and its not-classified money; for an account that is not itself an alternative (a brokerage holding a bitcoin fund or options), the row also says which part of it this is (classPortionLabel for Alternatives). The rows add up to the total (DEC-4036h, 2026-10-10).",
  "handed": "export function theAlternativesOutlook(input: { accounts: AssetAccount[] }): AlternativesOutlook",
  "inputs_it_reads": [
   "MK-XS-I-003 institution name",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-050",
    "words_on_screen": "EST. GROWTH /year",
    "unit": "money",
    "per": "year",
    "what_it_answers": "What your alternatives might earn in a year, at the rates these kinds of things have historically paid.",
    "when_it_refuses": "Nothing held — no figure at all, because a $0 forecast reads as a forecast.",
    "shown_on": [
     "/other-investments"
    ]
   },
   {
    "id": "MK-NW-M-051",
    "words_on_screen": "EXP. RETURN",
    "unit": "percent-2dp",
    "what_it_answers": "The one yearly rate your alternatives are expected to earn, taking each holding's own benchmark and weighting it by what that holding is worth.",
    "when_it_refuses": "Nothing held — no figure at all, because a 0.00% expected return reads as a forecast of nothing rather than an absence of holdings.",
    "shown_on": [
     "/other-investments"
    ]
   },
   {
    "id": "MK-NW-M-052",
    "words_on_screen": "each alternative and what it is worth",
    "unit": "money",
    "what_it_answers": "Every alternative you hold, with its value, where it is held and the benchmark for its kind — so the total above can be read line by line.",
    "when_it_refuses": "No rows, and the screen shows the sentence that says what belongs here instead.",
    "shown_on": [
     "/other-investments"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-NW-M-050",
    "words": "An ESTIMATE, and it wears the estimate label: a historical benchmark for the KIND of thing held, never a promise about this holding."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-050",
    "words": "FOUNDER 2026-09-27 (\"ok\"): split out of \"what am I worth\". The Alternatives TOTAL belongs there because it must equal what the Net worth tab shows for that class; a projection does not."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-051",
    "words": "IT IS WEIGHTED BY VALUE, not an average of the rates: $28,000 of crypto and $500 of gold is almost entirely a crypto outlook, and averaging the two rates would say otherwise."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-051",
    "words": "TWO DECIMALS, because it is a rate (the precision standard, Q49) — it read to one until 2026-09."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-052",
    "words": "THE ROWS MUST ADD TO THE TOTAL ABOVE THEM. That is the whole reason the rows exist: a total nobody can take apart is a number you have to trust rather than check."
   }
  ]
 },
 {
  "id": "MK-NW-O-006",
  "name": "theHolding",
  "kind": "orchestrator",
  "what_it_is_for": "How is this one holding doing: its value, its cost, and its gains realised and not yet realised?",
  "formula_in_words": "Shares = shares of every purchase still held, added up (nothing when a purchase has no share count); a sale has already taken its shares from the purchases, oldest purchase date first (a purchase with no date last). Total paid = shares × cost per share over every purchase (× 100 for an option contract unless the holding states its own multiplier); nothing when a share count or a cost is not on record. With a price: value = shares × price (× 100 for an option contract unless the holding states its own multiplier); gain = value − total paid; return on cost = gain ÷ total paid (no figure when nothing was paid, or either is unknown). With NO price: value shown = total paid, and gain, return and the tax estimate are not given. Average paid per share = total paid ÷ (shares × that multiplier), so it is in the unit the price is quoted in (nothing with no shares, or a figure not on record). Closed = shares known and zero or less. Day change = last close − the close before, for ONE share (it is shown under the price of one share, not multiplied by shares held), and that ÷ the close before; none with fewer than two closes. Gain if sold today is split by purchase: long-term = purchases held MORE than one year; a purchase held exactly one year or less is short-term. Dividends = dividend records that name this ticker: the last 365 days, and all time. Realised gain = from the sale records of this ticker in this account, × this holding's contract multiplier.",
  "handed": "export function theHolding(input: {\n  position: Position;\n  accountId: string;\n  price: number | null;\n  transactions: any[];\n  now?: Date;\n  /** The recent daily closes, oldest first. Two are enough for the day's change. */\n  recentCloses?: number[];\n}): HoldingAnswer",
  "inputs_it_reads": [
   "MK-XS-I-004 holding quantity (shares)",
   "MK-XS-I-005 holding price",
   "MK-XS-I-007 purchase price and date (per lot)",
   "MK-XS-I-009 transaction date",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-048 the person’s own asset-class answer",
   "MK-XS-I-063 option contract multiplier — 100 unless the broker or the person states otherwise",
   "MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-NW-M-029",
    "words_on_screen": "CURRENT PRICE · LIVE",
    "unit": "money-cents",
    "what_it_answers": "What one share is worth right now, and how fresh that price is.",
    "when_it_refuses": "No price — the screen shows what you paid instead, and says so.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-030",
    "words_on_screen": "Current value",
    "unit": "money",
    "what_it_answers": "What this holding is worth today.",
    "when_it_refuses": "No price — it shows what you paid, labelled as that. Not stated where a purchase has no share count or price paid on record.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-031",
    "words_on_screen": "Quantity — n shares",
    "unit": "count",
    "what_it_answers": "How many shares you still hold.",
    "when_it_refuses": "All sold — the screen says the holding is liquidated rather than showing 0 shares. Not stated where a purchase has no share count on record.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-032",
    "words_on_screen": "Price paid (average)",
    "unit": "money-cents",
    "what_it_answers": "What you paid per share, on average, for what you still hold.",
    "when_it_refuses": "No purchase price recorded.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-033",
    "words_on_screen": "Total paid",
    "unit": "money",
    "what_it_answers": "What you paid for the shares you still hold.",
    "when_it_refuses": "No purchase price recorded.",
    "shown_on": [
     "/holding-detail",
     "/invest"
    ]
   },
   {
    "id": "MK-NW-M-034",
    "words_on_screen": "Dividends received (12 mo)",
    "unit": "money",
    "what_it_answers": "What this holding has paid you over the last twelve months.",
    "when_it_refuses": "No records naming this holding — the line does not appear.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-035",
    "words_on_screen": "Realized gain from your buys and sells",
    "unit": "money",
    "what_it_answers": "What your earlier sales of this holding actually made.",
    "when_it_refuses": "Nothing sold yet.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-036",
    "words_on_screen": "Gain — long-term (held over 1 yr)",
    "unit": "money",
    "what_it_answers": "The gain on shares you have held more than a year — the part taxed at the lower rate.",
    "when_it_refuses": "No price today — no gain is stated at all. Not stated where a purchase in this part has no price paid or share count on record.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-037",
    "words_on_screen": "Gain — short-term (held 1 yr or less)",
    "unit": "money",
    "what_it_answers": "The gain on shares held under a year — the part taxed as ordinary income.",
    "when_it_refuses": "No price today — no gain is stated at all. Not stated where a purchase in this part has no price paid or share count on record.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-059",
    "words_on_screen": "Change since purchase",
    "unit": "money",
    "what_it_answers": "What this holding has gained or lost against what was paid for it.",
    "when_it_refuses": "No price — the row is left out, and the screen says what was paid instead.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-060",
    "words_on_screen": "up",
    "unit": "money-cents",
    "what_it_answers": "How much ONE SHARE of this holding moved since the previous close, in money — it sits under the price of one share.",
    "when_it_refuses": "Fewer than two closes known, or a previous close of zero — the line is not drawn.",
    "shown_on": [
     "/holding-detail"
    ]
   },
   {
    "id": "MK-NW-M-061",
    "words_on_screen": "sh @",
    "unit": "money-cents",
    "what_it_answers": "What one purchase cost per share, on the day it was bought.",
    "when_it_refuses": "No purchases recorded — the section is not drawn.",
    "shown_on": [
     "/holding-detail",
     "/invest"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "owner",
    "decision": "DEC-0092",
    "date": "2026-08-11",
    "words": "we decided to move money markets and T-bills to stock/etf and bond & CD respectively."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0108",
    "date": "2026-08-11",
    "words": "Update master PRD document. Go to master list of what"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0165",
    "date": "2026-08-14",
    "words": "how to avoid this in the next brief?"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0301",
    "date": "2026-08-20",
    "words": "source always, date only when stale"
   },
   {
    "said_by": "owner",
    "decision": "DEC-0475",
    "date": "2026-07-01",
    "words": "do we capture only balance or all individual portfolio holding e.g. AMZN 100 stocks …."
   },
   {
    "said_by": "owner",
    "decision": "DEC-0476",
    "date": "2026-07-01",
    "words": "When dividend is captured is it automatically added to income or cash? Similarly, is there a way captical gain is captured and displayed somewhere?"
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-029",
    "words": "A price that has gone stale says its age rather than passing as today’s."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-030",
    "words": "r30: with NO price it shows what you paid, never a zero — a holding priced at zero would quietly shrink your whole portfolio."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-032",
    "words": "Kept unrounded inside, rounded once at display (Q49) — rounding it early moved the total it multiplies back into."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-034",
    "words": "A record that names no ticker belongs to no holding — the same rule the account page carries."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-059",
    "words": "IT IS AGAINST WHAT WAS PAID, not against any starting price: the figure answers \"am I ahead on this holding\", which only the cost basis can answer."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-059",
    "words": "WITHOUT A PRICE THERE IS NO FIGURE at all, rather than a zero — a gain of zero reads as break-even when the truth is that nothing is known."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-060",
    "words": "TWO CLOSES ARE NEEDED. One price is a price, not a change, so with a single point there is no figure rather than a change of zero."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-060",
    "words": "IT CAME OFF THE SCREEN (2026-10-01). It was calculated inside HoldingDetailScreen from the price series — a money figure derived inline on a screen, which is what one door exists to prevent. The door computes it now and the screen prints what the door says."
   },
   {
    "said_by": "author",
    "about": "MK-NW-M-061",
    "words": "EACH PURCHASE KEEPS ITS OWN PRICE. They are what the average above them is made of, so a person can check the average rather than having to trust it."
   }
  ]
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
    "words": "Price changes only — dividends are not in it, and the screen says so."
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
  "formula_in_words": "Records of the period = those dated on or after its first day; contributions, withdrawals, dividends and interest are their totals. Contributions also count cash or shares transferred in from an account that is not one of those measured, and the first recorded value of an account that joined the record inside the period (its own records up to that day are then not counted again); withdrawals also count cash or shares transferred out. A transfer between two measured accounts is neither. THE BEGINNING IS READ from the daily record at the day BEFORE the period opens, and only when investment accounts are named and the record's first day is on or before that day; the value read is the last recorded day on or before it. If it cannot be read and the record holds days for these accounts that begin after the period opens: NO walk (no beginning, no wealth generated), and a sentence: The record begins <its first day>, so it cannot say what this account was / these accounts were worth on <the day before the period>. If it cannot be read and there is no record of these accounts at all: beginning = ending − priced gain − contributions + withdrawals (priced gain counts as 0 when the period opens today). The priced gain is each holding's gain over the period by the one rule for it (pricedGainOf: a holding's return is read as the period's own total, never a yearly rate), years = the period's days ÷ 365; a measured account with no holdings counts as its own holding, worth its balance — a certificate of deposit stating its rate gains by that rate, any other has no price history. With no period at all (day one) no rate is applied and a holding with no price history adds nothing. Owner decision DEC-3656, 2026-10-09: where a period is given that does not open today and any holding's gain cannot be known (it holds something, has no price history and no stated rate): NO walk (no beginning, no wealth generated), and the sentence: The beginning can't be worked back: <name> has no price history. Several names are joined with commas and \"and\" before the last, and say \"have no price history\". A holding is named by its ticker (the security's name where the ticker is a 9-character identifier); an account by its display name; a dollar gain handed in as unknown is named \"a holding\". Either way NO percent of any kind is given. The ending is given on its own as well, whether or not there is a walk. Walk: wealth generated = ending − beginning − contributions + withdrawals; change in investment value = wealth generated − dividends − interest. Records counted are those of the investment accounts named (a record on any other account is not money put into these investments). Return = a TIME-WEIGHTED return (owner decision, 2026-10-04: \"All return should be True Weighted Return and not Dietz return.\"): the period, starting at the last recorded day on or before the day before it opens, is split at every day money moved in or out of those accounts; each piece = the value just before the next movement ÷ the value just after the last one; the pieces are multiplied and 1 is taken off. The record holds one value a day, taken after that day's money moved, so the value just before a movement = that day's value − the movement. Money moving = deposits (in), withdrawals (out), cash transferred between accounts (out of the first, into the second), and shares moved in or out at what they were worth (the amount, or shares × price) when the record says which way they went. Ending = what the measured accounts are worth today, each counted whole (its balance, uninvested cash inside it included), read from the accounts handed in — a figure handed in beside them is not used, so no two screens can give two endings; with no accounts handed in, the ending handed in is used and closes the record. Today's value for the return is read from the same accounts. An account that first appears in the record inside the period counts as money in, at its first recorded value. A recorded day that is missing an account with holdings is not used; a typed balance stands until it is next recorded. It REFUSES — no percent, a sentence saying why, never another method — when: the beginning cannot be read; money moved on a day with no recorded value; a movement has no date; a deposit, withdrawal or transfer has no amount on record; shares were moved in or out and the record does not say which way or what they were worth; the value on a day is less than the money added that day; or nothing was invested. For a period longer than one year — its first day earlier than one year back from today by the calendar (windowStartKey), so a period opening one year back to the day is a year and is never made yearly — and days ÷ 365 above 1, unless it is the whole-record Since period, the figure shown is the yearly rate (1 + return) to the power 1 ÷ years, − 1.",
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
    "when_it_refuses": "No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or the value that day is less than the money added. It never shows another kind of figure in its place.",
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
    "when_it_refuses": "No percent, and a sentence saying why: the record does not reach the start, money moved on a day with no recorded value, shares were moved in or out, or the value that day is less than the money added. It never shows another kind of figure in its place.",
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
    "words": "AN ACCOUNT THAT JOINS THE RECORD inside the window counts as money in, at its first recorded value — nothing it was already worth is earned."
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
