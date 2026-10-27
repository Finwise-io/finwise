# Cash flow — part 13 of 19: Contribution limits, room left this year, and the future paycheck

14 cards, so 14 formula checks and 70 cases, and one `rules_held` line for each of the 11 decisions at the end. Read the brief `moneykeel_audit_module_cf_for-openai_v01.md` first. Put `"batch": "cf module — part 13"` in your reply.

## Notes for this part

- This part also checks published amounts. Fill `source_checks` from `moneykeel_audit_module_cf_tax-sources-and-acceptance_v01.json` for: Contribution limits, 2026 — 401(k), IRA, HSA and catch-ups — one entry for each, with the source you checked it against.

## The app's own types these cards name

What each is made of. The comments inside are the in-house author's.

```ts
export interface ContributionRoom {
  year: number;
  /** The age the IRS tests — attained in the year, not today's (his ruling G1). */
  age: number | null;
  k401: Room;
  ira: Room;
  hsa: Room;
  /** Months left including this one (his ruling G36), and what filling the 401(k) would cost a month. */
  monthsLeft: number;
  perMonthToFill401k: number;
  /** True when Medicare bars an HSA contribution entirely (his ruling G10). */
  hsaBarredByMedicare: boolean;
}

export interface FuturePaycheck {
  retireAge: number;
  /** MK-CF-M-022 — about what a month would bring at retirement: guaranteed income + the draw. */
  monthly: number;
  /** MK-CF-M-023 — the guaranteed part: Social Security, pension, annuity, other. */
  guaranteed: number;
  /** MK-CF-M-055 — the draw from savings the pot can support, level. */
  draw: number;
}

export interface GuaranteedRow { source: string; amount: number; month: number; year: number; day?: number }

export interface Headroom { limit: number; used: number; remaining: number; catchUp: boolean; }

export interface PaycheckOptions {
  accounts?: AssetAccount[];         // nest egg = the retirement-earmarked share (live balances)
  nestEgg?: number;                  // explicit override (projection mode)
  liabilities?: Debt[];              // deferred debts surface via the grid
  sim: PaycheckSimInputs;            // ADOPTED from Plan's shared assumptions
  now?: Date;
  chanceFloor?: number;              // default 80 — the 'Likely' threshold
}

export interface PaycheckSimInputs {
  current_age: number;
  horizon_age: number;
  mean_return: number;               // decimal
  vol_return: number;                // decimal
  inflation: number;                 // decimal
  seed?: number;
  paths?: number;
}

export interface PaycheckYear {
  months: PaycheckMonth[];
  thisMonth: PaycheckMonth;
  thisYear: number;                  // EXACT sum of the 12 months — never monthly × 12
  safeDrawMonthly: number;
  drawRateFlag: 'ok' | 'high' | null;   // 'high' = above the classic 4%/year guideline (inform, never advise)
  guaranteedMissing: boolean;        // no guaranteed income entered → the UI prompts, never fakes $0
  nestEgg: number;
}
```

## The cards

```json
[
 {
  "id": "MK-CF-O-005",
  "name": "theContributionRoom",
  "kind": "orchestrator",
  "what_it_is_for": "How much room is left in my 401(k), IRA and HSA this year, and what would fill it?",
  "formula_in_words": "Age = this calendar year − birth year; nothing with no birth year. 401(k): limit by age (annual401kLimit); used = monthly 401(k) × 12, never more than the limit; room = limit − used, never below 0. IRA: limit by age (annualIraLimit); used = monthly Roth IRA × 12, never more than the limit; room = limit − used. HSA: the self-only limit by age (annualHsaLimit), 0 when enrolled in Medicare; used = monthly HSA × 12, never more than the limit; room = limit − used. Catch-up flags: 401(k) and IRA at 50 or over; HSA at 55 or over. Months left = 12 − the months already finished this year (January 12, December 1). Per month to fill the 401(k) = room ÷ months left, to the nearest $100.",
  "handed": "export function theContributionRoom(input: {\n  profile: any;\n  /** THE DAY IT IS READ ON. Absent means today, which is what the app passes. A worked example passes\n   *  a fixed day, because \"how much is left to put in this year\" depends on the month — and an example\n   *  whose answer changes when the calendar turns is an example that cannot be checked. This one broke\n   *  on 2026-10-01 for exactly that reason: it said $5,300/month in September and $7,100 in October. */\n  today?: Date;\n}): ContributionRoom",
  "inputs_it_reads": [
   "MK-XS-I-017 birth year",
   "MK-XS-I-043 their own retirement contribution"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-003",
    "words_on_screen": "$X left / up to $Y",
    "unit": "money",
    "what_it_answers": "How much more you can still put into this account this year.",
    "when_it_refuses": "No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
    "shown_on": [
     "/contribution-room",
     "/home"
    ]
   },
   {
    "id": "MK-MN-M-004",
    "words_on_screen": "about $X of the $Y limit",
    "unit": "money",
    "what_it_answers": "What has gone in so far, against what the law allows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/contribution-room"
    ]
   },
   {
    "id": "MK-MN-M-005",
    "words_on_screen": "about $X for the rest of the year",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What filling the remaining room would cost you each month.",
    "when_it_refuses": "Nothing left to fill.",
    "shown_on": [
     "/contribution-room"
    ]
   },
   {
    "id": "MK-MN-M-029",
    "words_on_screen": "each contribution and its amount",
    "unit": "money",
    "what_it_answers": "One line per tax-advantaged account, and what has gone into it.",
    "when_it_refuses": "Nothing entered for that account.",
    "shown_on": [
     "/contribution-room"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-003",
    "words": "The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-004",
    "words": "Capped at the limit: a figure above it would be describing a contribution the law does not permit."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-005",
    "words": "THIS MONTH COUNTS (his ruling G36). Leaving it out told people to save more per month than they need to."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-029",
    "words": "Enrolled in Medicare means NO HSA contribution is allowed at all — not a smaller one (his ruling G10, 2026-09-08)."
   }
  ],
  "decisions_that_govern_it": [],
  "period": [
   "MK-MN-M-003: no period on the figure",
   "MK-MN-M-004: no period on the figure",
   "MK-MN-M-005: a month",
   "MK-MN-M-029: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-003: No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
   "MK-MN-M-004: Nothing entered yet.",
   "MK-MN-M-005: Nothing left to fill.",
   "MK-MN-M-029: Nothing entered for that account."
  ]
 },
 {
  "id": "MK-CF-F-197",
  "name": "ageAttainedInYear",
  "kind": "function",
  "what_it_is_for": "THE AGE THE LIMITS USE — the age a person attains at any time in the calendar year, which is this year minus the birth year.",
  "formula_in_words": "This calendar year − the birth year. Nothing when the birth year is missing or before 1900.",
  "handed": "export function ageAttainedInYear(birthYear: number | null | undefined, now: Date = new Date()): number | null",
  "inputs_it_reads": [
   "MK-XS-I-017 birth year"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-195",
  "name": "monthsLeftInYear",
  "kind": "function",
  "what_it_is_for": "Months left in the year INCLUDING the current one — December counts as 1, never 0.",
  "formula_in_words": "12 − the number of months already finished this year: 12 in January, 1 in December. The current month counts as left.",
  "handed": "export function monthsLeftInYear(now: Date = new Date()): number",
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-003",
    "words_on_screen": "$X left / up to $Y",
    "unit": "money",
    "what_it_answers": "How much more you can still put into this account this year.",
    "when_it_refuses": "No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
    "shown_on": [
     "/contribution-room",
     "/home"
    ]
   },
   {
    "id": "MK-MN-M-004",
    "words_on_screen": "about $X of the $Y limit",
    "unit": "money",
    "what_it_answers": "What has gone in so far, against what the law allows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/contribution-room"
    ]
   },
   {
    "id": "MK-MN-M-005",
    "words_on_screen": "about $X for the rest of the year",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What filling the remaining room would cost you each month.",
    "when_it_refuses": "Nothing left to fill.",
    "shown_on": [
     "/contribution-room"
    ]
   },
   {
    "id": "MK-MN-M-029",
    "words_on_screen": "each contribution and its amount",
    "unit": "money",
    "what_it_answers": "One line per tax-advantaged account, and what has gone into it.",
    "when_it_refuses": "Nothing entered for that account.",
    "shown_on": [
     "/contribution-room"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-003",
    "words": "The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-004",
    "words": "Capped at the limit: a figure above it would be describing a contribution the law does not permit."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-005",
    "words": "THIS MONTH COUNTS (his ruling G36). Leaving it out told people to save more per month than they need to."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-029",
    "words": "Enrolled in Medicare means NO HSA contribution is allowed at all — not a smaller one (his ruling G10, 2026-09-08)."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0336"
  ],
  "period": [
   "MK-MN-M-003: no period on the figure",
   "MK-MN-M-004: no period on the figure",
   "MK-MN-M-005: a month",
   "MK-MN-M-029: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-003: No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
   "MK-MN-M-004: Nothing entered yet.",
   "MK-MN-M-005: Nothing left to fill.",
   "MK-MN-M-029: Nothing entered for that account."
  ]
 },
 {
  "id": "MK-CF-F-196",
  "name": "perMonthToFill",
  "kind": "function",
  "what_it_is_for": "What to put in each remaining month to use the room left this year, rounded to $100 for display.",
  "formula_in_words": "Room left ÷ the months left in the year (monthsLeftInYear), rounded to the nearest $100.",
  "handed": "export function perMonthToFill(roomLeft: number, now: Date = new Date()): number",
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-003",
    "words_on_screen": "$X left / up to $Y",
    "unit": "money",
    "what_it_answers": "How much more you can still put into this account this year.",
    "when_it_refuses": "No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
    "shown_on": [
     "/contribution-room",
     "/home"
    ]
   },
   {
    "id": "MK-MN-M-004",
    "words_on_screen": "about $X of the $Y limit",
    "unit": "money",
    "what_it_answers": "What has gone in so far, against what the law allows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/contribution-room"
    ]
   },
   {
    "id": "MK-MN-M-005",
    "words_on_screen": "about $X for the rest of the year",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What filling the remaining room would cost you each month.",
    "when_it_refuses": "Nothing left to fill.",
    "shown_on": [
     "/contribution-room"
    ]
   },
   {
    "id": "MK-MN-M-029",
    "words_on_screen": "each contribution and its amount",
    "unit": "money",
    "what_it_answers": "One line per tax-advantaged account, and what has gone into it.",
    "when_it_refuses": "Nothing entered for that account.",
    "shown_on": [
     "/contribution-room"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-003",
    "words": "The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-004",
    "words": "Capped at the limit: a figure above it would be describing a contribution the law does not permit."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-005",
    "words": "THIS MONTH COUNTS (his ruling G36). Leaving it out told people to save more per month than they need to."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-029",
    "words": "Enrolled in Medicare means NO HSA contribution is allowed at all — not a smaller one (his ruling G10, 2026-09-08)."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0336"
  ],
  "period": [
   "MK-MN-M-003: no period on the figure",
   "MK-MN-M-004: no period on the figure",
   "MK-MN-M-005: a month",
   "MK-MN-M-029: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-003: No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
   "MK-MN-M-004: Nothing entered yet.",
   "MK-MN-M-005: Nothing left to fill.",
   "MK-MN-M-029: Nothing entered for that account."
  ]
 },
 {
  "id": "MK-CF-F-053",
  "name": "annual401kLimit",
  "kind": "function",
  "what_it_is_for": "Annual employee 401(k) limit for the user's age (adds the 50+ catch-up).",
  "formula_in_words": "2026: $24,500. At age 50 or over, + $8,000. Ages 60 to 63 get + $11,250 INSTEAD of the $8,000. So $32,500 at ages 50 to 59 and from 64 on, and $35,750 at 60 to 63. With no age: $24,500.",
  "handed": "export function annual401kLimit(age: number | null): number",
  "decisions_that_govern_it": [
   "DEC-0339"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-054",
  "name": "annualIraLimit",
  "kind": "function",
  "what_it_is_for": "How much a person may put into an IRA this year: the standard limit, plus the catch-up amount from age 50.",
  "formula_in_words": "2026: $7,500; + $1,100 at age 50 or over. With no age: $7,500.",
  "handed": "export function annualIraLimit(age: number | null): number",
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-003",
    "words_on_screen": "$X left / up to $Y",
    "unit": "money",
    "what_it_answers": "How much more you can still put into this account this year.",
    "when_it_refuses": "No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
    "shown_on": [
     "/contribution-room",
     "/home"
    ]
   },
   {
    "id": "MK-MN-M-004",
    "words_on_screen": "about $X of the $Y limit",
    "unit": "money",
    "what_it_answers": "What has gone in so far, against what the law allows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/contribution-room"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-003",
    "words": "The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-004",
    "words": "Capped at the limit: a figure above it would be describing a contribution the law does not permit."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0339"
  ],
  "period": [
   "MK-MN-M-003: no period on the figure",
   "MK-MN-M-004: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-003: No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
   "MK-MN-M-004: Nothing entered yet."
  ]
 },
 {
  "id": "MK-CF-F-055",
  "name": "annualHsaLimit",
  "kind": "function",
  "what_it_is_for": "How much can this person put into a health savings account this year?",
  "formula_in_words": "0 when enrolled in Medicare. Otherwise, 2026: $4,400 for self-only cover or $8,750 for family cover; + $1,000 at age 55 or over.",
  "handed": "export function annualHsaLimit(age: number | null, family = false, medicareEnrolled: boolean | null = null): number",
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-003",
    "words_on_screen": "$X left / up to $Y",
    "unit": "money",
    "what_it_answers": "How much more you can still put into this account this year.",
    "when_it_refuses": "No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
    "shown_on": [
     "/contribution-room",
     "/home"
    ]
   },
   {
    "id": "MK-MN-M-004",
    "words_on_screen": "about $X of the $Y limit",
    "unit": "money",
    "what_it_answers": "What has gone in so far, against what the law allows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/contribution-room"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-003",
    "words": "The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-004",
    "words": "Capped at the limit: a figure above it would be describing a contribution the law does not permit."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0243",
   "DEC-0339"
  ],
  "period": [
   "MK-MN-M-003: no period on the figure",
   "MK-MN-M-004: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-003: No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
   "MK-MN-M-004: Nothing entered yet."
  ]
 },
 {
  "id": "MK-CF-F-056",
  "name": "k401Headroom",
  "kind": "function",
  "what_it_is_for": "How much more you can still put into your 401(k) this year (incl.",
  "formula_in_words": "Limit = annual401kLimit. Used = the year's contribution (below zero counts 0), never more than the limit. Room = limit − the contribution, never below 0. Catch-up flag at 50 or over.",
  "handed": "export function k401Headroom(age: number | null, annual401kContribution: number): Headroom",
  "figures_it_feeds": [
   {
    "id": "MK-MN-M-003",
    "words_on_screen": "$X left / up to $Y",
    "unit": "money",
    "what_it_answers": "How much more you can still put into this account this year.",
    "when_it_refuses": "No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
    "shown_on": [
     "/contribution-room",
     "/home"
    ]
   },
   {
    "id": "MK-MN-M-004",
    "words_on_screen": "about $X of the $Y limit",
    "unit": "money",
    "what_it_answers": "What has gone in so far, against what the law allows.",
    "when_it_refuses": "Nothing entered yet.",
    "shown_on": [
     "/contribution-room"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-MN-M-003",
    "words": "The age tested is the age ATTAINED IN THE YEAR (his ruling G1) — someone turning 50 in December gets the catch-up for the whole year."
   },
   {
    "said_by": "author",
    "about": "MK-MN-M-004",
    "words": "Capped at the limit: a figure above it would be describing a contribution the law does not permit."
   }
  ],
  "decisions_that_govern_it": [],
  "period": [
   "MK-MN-M-003: no period on the figure",
   "MK-MN-M-004: no period on the figure"
  ],
  "when_it_gives_no_number": [
   "MK-MN-M-003: No birth year entered — the catch-up cannot be judged, so the limit says it is the base one.",
   "MK-MN-M-004: Nothing entered yet."
  ]
 },
 {
  "id": "MK-CF-F-057",
  "name": "rothVsTraditional",
  "kind": "function",
  "what_it_is_for": "Roth vs Traditional lean from current vs expected-retirement marginal rate (decimals).",
  "formula_in_words": "Top tax band now at 12% or under: lean Roth. Band now at 24% or over AND the band expected in retirement lower than now: lean Traditional. Anything else: either.",
  "handed": "export function rothVsTraditional(marginalNow: number, marginalRetire: number): { lean: 'roth' | 'traditional' | 'either'; why: string }",
  "decisions_that_govern_it": [
   "DEC-0263"
  ],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-058",
  "name": "rothConversionWindow",
  "kind": "function",
  "what_it_is_for": "Are you in the low-income \"Roth conversion window\" (retired, before RMDs/SS push income up)?",
  "formula_in_words": "True when the age is at or past the retirement age AND below the earlier of age 73 and the Social Security claiming age (73 when there is no claiming age).",
  "handed": "export function rothConversionWindow(age: number, retireAge: number, claimAge: number, rmdAge = 73): boolean",
  "inputs_it_reads": [
   "MK-XS-I-018 retirement age",
   "MK-XS-I-021 Social Security claim age"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-O-017",
  "name": "futurePaycheck",
  "kind": "orchestrator",
  "what_it_is_for": "About what would a month bring in at retirement: the guaranteed income plus a level draw from savings?",
  "formula_in_words": "Nothing when the age is unknown; when the person is at or past the retirement age (the plan's, else the profile's target, else 67); when the savings are zero or less; or when the projection gives nothing. Otherwise: the retirement projection is run to the retirement age and gives the projected savings at that age; the monthly draw those savings can support comes from buildPaycheckYear (solveSafeDraw); monthly paycheck = guaranteed income (Social Security, pension, annuity, other — guaranteedOutsideStreams) + that draw, each rounded to whole dollars.",
  "handed": "export function futurePaycheck(input: {\n  op: any; accounts: any[]; assumptions: any; bigCosts?: any[]; inflationRate?: number; employmentStatus?: any;\n}): FuturePaycheck | null",
  "inputs_it_reads": [
   "MK-XS-I-001 account balance",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-017 birth year",
   "MK-XS-I-018 retirement age",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-026 big costs (amount and year)",
   "MK-XS-I-028 assumed return"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-022",
    "words_on_screen": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
    "unit": "money",
    "per": "month",
    "what_it_answers": "About what a month would bring at retirement: the guaranteed income plus a level draw from the projected pot.",
    "when_it_refuses": "No pot to project from, or retirement age already reached — the card is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-023",
    "words_on_screen": "YOUR FUTURE PAYCHECK — Social Security · pension",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The guaranteed part of that future month: Social Security, pension, annuity, other.",
    "when_it_refuses": "No pot to project from, or retirement age already reached — the card is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-055",
    "words_on_screen": "Draw from savings",
    "unit": "money",
    "per": "month",
    "what_it_answers": "The level amount a month the pot can support, so the paycheck does not fall when a bill lands.",
    "when_it_refuses": "No pot — no draw; the paycheck is the guaranteed income alone.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-070",
    "words_on_screen": "each step of the withdrawal order",
    "unit": "money",
    "what_it_answers": "Which pot the retired paycheck draws from first, second and so on, and how much sits in each.",
    "when_it_refuses": "No retirement money in any pot — no order to explain.",
    "shown_on": [
     "/cashflow"
    ]
   },
   {
    "id": "MK-CF-M-078",
    "words_on_screen": "SURPLUS — <MONTH> (retired)",
    "unit": "money",
    "per": "month",
    "what_it_answers": "What a retired person can spend this month: the guaranteed income that lands this month, plus the level draw from savings, less the big dated bills that fall in it.",
    "when_it_refuses": "No guaranteed income entered: the card asks for Social Security and pension; with nothing to spend, the pace line is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-CF-M-022",
    "words": "AN ESTIMATE, SAID TO BE ONE on the screen — never a promise."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-022",
    "words": "NOTHING BEFORE THERE IS A POT: with no accounts, or past retirement age, the card is not drawn."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-055",
    "words": "IN TODAY’S DOLLARS (decided 2026-10-03, the master’s old Q30): the draw keeps its buying power — the figure shown is what it buys today, and the dollars paid rise with inflation each year. It is what the simulation behind the odds already charges, so the draw shown and the odds beside it are the same plan. To reverse: hold the dollars flat instead, and the odds must be re-run that way."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-078",
    "words": "A short month shows the minus with the word “short” and the bill named — never smoothed, never clipped to zero."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0244",
   "DEC-0245",
   "DEC-0247",
   "DEC-2164",
   "DEC-8153"
  ],
  "period": [
   "MK-CF-M-022: a month",
   "MK-CF-M-023: a month",
   "MK-CF-M-055: a month",
   "MK-CF-M-070: no period on the figure — one step",
   "MK-CF-M-078: a month — one figure per household per month"
  ],
  "when_it_gives_no_number": [
   "MK-CF-M-022: No pot to project from, or retirement age already reached — the card is not drawn.",
   "MK-CF-M-023: No pot to project from, or retirement age already reached — the card is not drawn.",
   "MK-CF-M-055: No pot — no draw; the paycheck is the guaranteed income alone.",
   "MK-CF-M-070: No retirement money in any pot — no order to explain.",
   "MK-CF-M-078: No guaranteed income entered: the card asks for Social Security and pension; with nothing to spend, the pace line is not drawn."
  ]
 },
 {
  "id": "MK-CF-F-105",
  "name": "guaranteedRows",
  "kind": "function",
  "what_it_is_for": "The dated guaranteed-income rows for the next 12 months (the F2 grid seam).",
  "formula_in_words": "Nothing when the person's chosen income sources are listed without retirement income. Otherwise, over the twelve months starting with the current one, for Social Security, pension, annuity and other retirement income with an amount above zero: monthly → the amount in every month; quarterly → the amount in four months, three apart, starting at its named month (the current month when none); yearly → the amount once, in its named month (the current month when none). The amount is the amount of EACH PAYMENT.",
  "handed": "export function guaranteedRows(op: OnboardingProfile | null, now: Date = new Date()): GuaranteedRow[]",
  "inputs_it_reads": [
   "MK-XS-I-039 how often each income arrives",
   "MK-XS-I-040 whether a stream is already being received"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-106",
  "name": "solveSafeDraw",
  "kind": "function",
  "what_it_is_for": "Largest level monthly draw that keeps chance-of-success ≥ the floor.",
  "formula_in_words": "0 when the savings are zero or less. Otherwise the largest monthly draw from the savings, on top of the guaranteed income, at which the retirement simulation (1,000 futures, fixed seed 42) still lasts to the horizon in at least 80 of 100. It is tried first at twice (savings ÷ years ÷ 12), $100 at least; then narrowed by halving 12 times; then rounded DOWN to the nearest $5.",
  "handed": "export function solveSafeDraw(nestEgg: number, guaranteedMonthlyAvg: number, sim: PaycheckSimInputs, chanceFloor = 80): number",
  "inputs_it_reads": [
   "MK-XS-I-018 retirement age",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-029 inflation rate",
   "MK-XS-I-043 their own retirement contribution"
  ],
  "decisions_that_govern_it": [],
  "period": "No figure on screen names this function; its period is whatever its formula states.",
  "when_it_gives_no_number": "Not recorded apart from the formula: read the formula for what it gives when an input is missing."
 },
 {
  "id": "MK-CF-F-107",
  "name": "buildPaycheckYear",
  "kind": "function",
  "what_it_is_for": "Build the month-by-month paycheck.",
  "formula_in_words": "Guaranteed rows from guaranteedRows; savings = the figure given, otherwise the accounts set aside for retirement (retirementEarmarkedValue, handed the profile's rent entries, DEC-4913). Safe draw = solveSafeDraw, with average guaranteed income in a month = the rows' total ÷ 12. Draw flag: high when safe draw × 12 ÷ savings is above 4.5%; ok otherwise; none with no savings or no draw. For each of twelve months from the current one: guaranteed total = that month's rows; bills = that month's big bills, everyday expenses left out; safe to spend = guaranteed total + safe draw − bills. This year = the twelve added.",
  "handed": "export function buildPaycheckYear(op: OnboardingProfile | null, opts: PaycheckOptions): PaycheckYear",
  "inputs_it_reads": [
   "MK-XS-I-024 logged expenses",
   "MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest"
  ],
  "figures_it_feeds": [
   {
    "id": "MK-CF-M-022",
    "words_on_screen": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
    "unit": "money",
    "per": "month",
    "what_it_answers": "About what a month would bring at retirement: the guaranteed income plus a level draw from the projected pot.",
    "when_it_refuses": "No pot to project from, or retirement age already reached — the card is not drawn.",
    "shown_on": [
     "/cashflow"
    ]
   }
  ],
  "rules": [
   {
    "said_by": "author",
    "about": "MK-CF-M-022",
    "words": "AN ESTIMATE, SAID TO BE ONE on the screen — never a promise."
   },
   {
    "said_by": "author",
    "about": "MK-CF-M-022",
    "words": "NOTHING BEFORE THERE IS A POT: with no accounts, or past retirement age, the card is not drawn."
   }
  ],
  "decisions_that_govern_it": [
   "DEC-0245",
   "DEC-0247"
  ],
  "period": [
   "MK-CF-M-022: a month"
  ],
  "when_it_gives_no_number": [
   "MK-CF-M-022: No pot to project from, or retirement age already reached — the card is not drawn."
  ]
 }
]
```

## Formulas these cards lean on

7 functions named by the formulas above whose own cards are in another part. They are here so you can work your answers. Do not judge or test them in this part.

```json
[
 {
  "id": "MK-CF-F-076",
  "name": "guaranteedOutsideStreams",
  "what_it_is_for": "The guaranteed income that comes from outside the person's own savings, one row for each source that pays anything: Social Security, a pension, an annuity or another, each as a monthly amount with whether it rises with prices.",
  "formula_in_words": "Social Security, pension, annuity and other, each as a monthly amount (quarterly ÷ 3, yearly ÷ 12), only those above zero. Rises with prices: Social Security yes, the others no — unless the person said otherwise. Withdrawals and required distributions are not here."
 },
 {
  "id": "MK-NW-F-030",
  "name": "earmarkDefault",
  "what_it_is_for": "Default % of an account that's earmarked for retirement (rest funds other goals).",
  "formula_in_words": "The share of an account counted towards retirement by default (owner, 2026-08-11, DEC-0100: all assets minus the home lived in and the car driven): 0% for a 529, for the car driven (primaryCarIdOf), and for the home lived in. Told the household's home (its identifier, from primaryHomeIdOf), only that property is 0%; told the household has no home (null), no property is; told nothing, a property stated as the home lived in, or with no use stated, is 0%. 100% for everything else — a rental, a second home, a second car, valuables included."
 },
 {
  "id": "MK-NW-F-031",
  "name": "primaryCarIdOf",
  "what_it_is_for": "The vehicle treated as \"the car you drive\" — the most valuable one, so a second car stays a real asset.",
  "formula_in_words": "Among the accounts whose kind is vehicle, and no other: the vehicles whose value is entered are the candidates — a vehicle with no value is not ranked as $0 (DEC-4036j, 2026-10-10); when none has a value, every vehicle is. Of the candidates, the one with the largest balance; a tie goes to the lower id read as text (the one made first). Nothing when there is no vehicle. Valuables and other personal property are never the car."
 },
 {
  "id": "MK-NW-F-032",
  "name": "earmarkedAmount",
  "what_it_is_for": "The retirement-earmarked $ for one account (uses the saved % or the smart default).",
  "formula_in_words": "Balance × the share earmarked for retirement. The share is the one stated on the account, held between 0% and 100%, or the default (earmarkDefault, told which car is driven and which property is lived in, or that there is none) when none is stated."
 },
 {
  "id": "MK-NW-F-033",
  "name": "retirementEarmarkedValue",
  "what_it_is_for": "Total nest egg = sum of each account's retirement-earmarked portion.",
  "formula_in_words": "Every account's earmarked amount (earmarkedAmount) added up, with the car driven found by primaryCarIdOf and the home lived in by primaryHomeIdOf, handed the Income screen's rent entries when the caller has them (DEC-4913, 2026-10-13). Example: A $400,000 with no use stated, B $300,000 marked the home with rent entered for B → $700,000 (B a rental, A a second home, no home). Not handed the rent entries, the stored home mark decides: $400,000."
 },
 {
  "id": "MK-NW-F-110",
  "name": "primaryHomeIdOf",
  "what_it_is_for": "Which property is the home lived in: the one marked so; with none marked and no use stated on any, the one entered first; otherwise none.",
  "formula_in_words": "The property propertyUseMap reads as the home lived in, handed the rent entries when the caller has them. Nothing (null) when the household has no home — which is not the same as not being asked. Example (owner, 2026-10-13): B marked the home with a rent entry naming B, A with no use stated → null (B is a rental, A a second home)."
 },
 {
  "id": "MK-NW-F-117",
  "name": "propertyUseMap",
  "what_it_is_for": "What each property is for — the home lived in, a rental, or a second home — by his rule DEC-1926: a rental only when a rent entry on the Income screen names it; the one marked as the home is the home; with none marked and no use stated on any, the one entered first; every other property is a second home.",
  "formula_in_words": "For each real-estate account: rental when a live rent entry names it, or — only when no rent entries were handed in at all (unknown, not none) — when it is stored as a rental. Of the rest: the one marked as the home lived in is home. With none of the rest marked, the one entered first (last in the list) that is not stored as a rental is home — but ONLY when no property at all carries a stated use other than rental (owner, 2026-10-13: a 'primary' mark on a property a rent entry made a rental still counts as a stated use, so it stops this; a stored 'rental' word does not). A property stored as a rental is never made the home this way. Every other property is a second home. A rent entry that names no property makes no property a rental (owner rule DEC-4059d, 2026-10-10 — it used to make the one other property a rental when exactly one remained)."
 }
]
```

## The same idea, computed elsewhere — for comparison only

Some cards here compute something another card also computes. Their formulas are printed so you can check the two agree. Do not judge or test these here; where one disagrees with a card in this part, the finding goes on this part's card and names both identifiers.

**Guaranteed income in a month** — in this part: MK-CF-F-105

```json
[
 {
  "id": "MK-CF-F-072",
  "name": "currentRetirementIncomeMonthly",
  "what_it_is_for": "Retirement income (ri_*) counts as CURRENT income only when the user actually receives it now — i.e.",
  "formula_in_words": "0 when the person's chosen income sources are listed and retirement income is not among them; otherwise retirementIncomeMonthly."
 },
 {
  "id": "MK-CF-F-075",
  "name": "retirementIncomeMonthly",
  "what_it_is_for": "Retirement income (Social Security, pension, withdrawals, RMDs, annuities) per month — taxable.",
  "formula_in_words": "Social Security, pension, withdrawals, required distributions, annuities and other, each turned into a month — monthly as it is, quarterly ÷ 3, yearly ÷ 12 — and added."
 },
 {
  "id": "MK-CF-F-076",
  "name": "guaranteedOutsideStreams",
  "what_it_is_for": "The guaranteed income that comes from outside the person's own savings, one row for each source that pays anything: Social Security, a pension, an annuity or another, each as a monthly amount with whether it rises with prices.",
  "formula_in_words": "Social Security, pension, annuity and other, each as a monthly amount (quarterly ÷ 3, yearly ÷ 12), only those above zero. Rises with prices: Social Security yes, the others no — unless the person said otherwise. Withdrawals and required distributions are not here."
 }
]
```

**The age a person is in the tax year** — in this part: MK-CF-F-197

```json
[
 {
  "id": "MK-CF-F-089",
  "name": "over65CountOf",
  "what_it_is_for": "How many people on the tax return are 65 or older: none, one or two.",
  "formula_in_words": "Married filing jointly with the question answered: both → 2, neither → 0, one → 1. Otherwise from the person's own birth year: 1 when this year − birth year is 65 or more, else 0; 0 with no birth year."
 }
]
```

## The figures these cards feed — as the screen register holds them

The author's record of each figure, with a worked example the app's own door ran (convention 10). Judge the cards; the figures themselves are checked against the tenets in the screen parts.

```json
[
 {
  "id": "MK-CF-M-022",
  "label": "YOUR FUTURE PAYCHECK — At <age>: ~$X/month",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "About what a month would bring at retirement: the guaranteed income plus a level draw from the projected pot.",
  "formula": "guaranteed income a month + the draw the projected pot can support (the paycheck year’s level draw)",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-017 birth year",
   "MK-XS-I-018 retirement age",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-020 Social Security monthly amount"
  ],
  "decisions": [
   "AN ESTIMATE, SAID TO BE ONE on the screen — never a promise.",
   "NOTHING BEFORE THERE IS A POT: with no accounts, or past retirement age, the card is not drawn."
  ],
  "refusal": "No pot to project from, or retirement age already reached — the card is not drawn.",
  "worked": {
   "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
   "answer": "$4,345/month"
  },
  "door": "MK-CF-O-017 futurePaycheck",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › WorkingMain"
  ],
  "decisions_that_govern_it": [
   "DEC-0245",
   "DEC-0247"
  ]
 },
 {
  "id": "MK-CF-M-023",
  "label": "YOUR FUTURE PAYCHECK — Social Security · pension",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "The guaranteed part of that future month: Social Security, pension, annuity, other.",
  "formula": "the outside guaranteed streams a month, added up",
  "inputs": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-XS-I-035 annuity income",
   "MK-XS-I-036 other guaranteed income"
  ],
  "refusal": "No pot to project from, or retirement age already reached — the card is not drawn.",
  "worked": {
   "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
   "answer": "$2,000/month"
  },
  "door": "MK-CF-O-017 futurePaycheck",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › WorkingMain"
  ],
  "decisions_that_govern_it": [
   "DEC-0244"
  ]
 },
 {
  "id": "MK-CF-M-055",
  "label": "Draw from savings",
  "unit": "money",
  "per": "month",
  "screens": [
   "/cashflow"
  ],
  "answers": "The level amount a month the pot can support, so the paycheck does not fall when a bill lands.",
  "formula": "the paycheck year’s level draw from the pot, at the assumed return and horizon",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-028 assumed return",
   "MK-XS-I-018 retirement age"
  ],
  "decisions": [
   "IN TODAY’S DOLLARS (decided 2026-10-03, the master’s old Q30): the draw keeps its buying power — the figure shown is what it buys today, and the dollars paid rise with inflation each year. It is what the simulation behind the odds already charges, so the draw shown and the odds beside it are the same plan. To reverse: hold the dollars flat instead, and the odds must be re-run that way."
  ],
  "refusal": "No pot — no draw; the paycheck is the guaranteed income alone.",
  "worked": {
   "given": "Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.",
   "answer": "$2,345/month"
  },
  "door": "MK-CF-O-017 futurePaycheck",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › WorkingMain"
  ],
  "decisions_that_govern_it": [
   "DEC-2164"
  ]
 },
 {
  "id": "MK-CF-M-070",
  "label": "each step of the withdrawal order",
  "unit": "money",
  "grain": "one step",
  "screens": [
   "/cashflow"
  ],
  "answers": "Which pot the retired paycheck draws from first, second and so on, and how much sits in each.",
  "formula": "cash first, then taxable, then pre-tax, then Roth — each with what is earmarked for retirement in it",
  "inputs": [
   "MK-NW-I-001 your accounts",
   "MK-XS-I-002 account type (taxable, pre-tax, Roth)",
   "MK-XS-I-050 the share of an account earmarked for retirement"
  ],
  "refusal": "No retirement money in any pot — no order to explain.",
  "worked": {
   "given": "A $50,000 taxable brokerage account and a $120,000 pre-tax 401(k), both for retirement, at 68.",
   "answer": "$50,000"
  },
  "door": "MK-CF-O-017 futurePaycheck",
  "ruled": "2026-10-02",
  "printed_in": [
   "CashFlowScreen › DrawOrderWhy"
  ],
  "decisions_that_govern_it": []
 },
 {
  "id": "MK-CF-M-078",
  "label": "SURPLUS — <MONTH> (retired)",
  "unit": "money",
  "per": "month",
  "grain": "one figure per household per month",
  "screens": [
   "/cashflow"
  ],
  "answers": "What a retired person can spend this month: the guaranteed income that lands this month, plus the level draw from savings, less the big dated bills that fall in it.",
  "formula": "this month’s surplus = guaranteed income landing this month + the level draw the savings can support − the big dated bills in this month (everyday expenses and monthly debt payments are what it is for, so they are not taken off)",
  "inputs": [
   "MK-XS-I-020 Social Security monthly amount",
   "MK-XS-I-022 pension monthly amount",
   "MK-NW-I-001 your accounts",
   "MK-CF-I-014 big bill"
  ],
  "decisions": [
   "A short month shows the minus with the word “short” and the bill named — never smoothed, never clipped to zero."
  ],
  "refusal": "No guaranteed income entered: the card asks for Social Security and pension; with nothing to spend, the pace line is not drawn.",
  "note": "Printed in the retired view of This month: the paycheck card’s hero, and the $Y of the pace line (drawn only when it is above $0).",
  "worked": {
   "given": "Retired, on 15 Oct 2026: $2,400/month of Social Security, no savings to draw on, and $1,200 of car insurance due in October.",
   "answer": "$1,200/month"
  },
  "door": "MK-CF-O-017 futurePaycheck",
  "printed_in": [
   "CashFlowScreen › RetiredMain"
  ],
  "decisions_that_govern_it": [
   "DEC-8153"
  ]
 }
]
```

## The decisions that govern this part — one `rules_held` line for each

From the owner's decision log, in force. `his_words` are his; `the_log_records` is the log's record of what he decided; `governs` is what the log says it reaches; `whose` says when a row is the lead's decision under his rulings rather than his own. The names of the app's test files are replaced by [a test of the app]: you are not shown the tests.

```json
[
 {
  "id": "DEC-0243",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "show the HSA limit at 65+ only with 'If you are not enrolled in Medicare …' and a place to update it",
  "the_log_records": "“show the HSA limit at 65+ only with ‘If you are not enrolled in Medicare …’ and a place to update it.” Medicare bars an HSA contribution entirely, so the limit is shown at 65 and over only with that condition attached and a way to tell us.",
  "governs": "MK-MN-M-003 · MK-MN-M-004 · MK-MN-M-005 · MK-CF-F-055 · MK-XS-I-062"
 },
 {
  "id": "DEC-0244",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "ok — the paycheck's guaranteed line = the four outside sources",
  "the_log_records": "“ok — the paycheck’s guaranteed line = the four outside sources.” The guaranteed part of a retirement paycheck is the income that comes from outside your savings — four named sources — not anything drawn from the pot.",
  "governs": "MK-CF-M-023 · MK-CF-F-076"
 },
 {
  "id": "DEC-0245",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "question answered: yes, the row named the wrong function; the screen was right",
  "the_log_records": "“question answered: yes, the row named the wrong function; the screen was right.” The master file pointed at the wrong calculation; the app was correct. The file was fixed, not the code.",
  "governs": "MK-CF-M-022 · MK-CF-F-107 · MK-CF-F-076 · MK-PL-F-050"
 },
 {
  "id": "DEC-0247",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "plan",
  "whose": "his",
  "his_words": "1000 everywhere",
  "the_log_records": "“1000 everywhere.” Every projection runs 1,000 possible futures — one number, on every screen and in every calculation, so no two screens run a different many.",
  "governs": "MK-XS-M-002 · MK-CF-M-022 · MK-PL-F-050"
 },
 {
  "id": "DEC-0263",
  "decided": "2026-09-08",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "explained and fixed in the file: the four mis-rendered functions written by hand; caps declared",
  "the_log_records": "“explained and fixed in the file: the four mis-rendered functions written by hand; caps declared.” Four calculations the automatic reader could not render faithfully were written out by hand rather than left as a bad approximation.",
  "governs": "MK-CF-F-057 · MK-CF-F-097 · MK-CF-F-087 · MK-CF-F-101"
 },
 {
  "id": "DEC-0336",
  "decided": "2026-09-12",
  "type": "RULE",
  "tab": "process-and-standards",
  "whose": "his",
  "his_words": "ok — state the months-left convention; move the division off the screen",
  "the_log_records": "“ok — state the months-left convention; move the division off the screen.” How many months are left in the year is defined once and stated — the current month counts — and the arithmetic moves out of the screen into the calculation.",
  "governs": "MK-MN-M-003 · MK-MN-M-004 · MK-MN-M-005 · MK-MN-M-029 · MK-CF-F-195 · MK-CF-F-196"
 },
 {
  "id": "DEC-0339",
  "decided": "2026-09-12",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "agree — every contribution limit uses the age attained in the calendar year (this year − birth year), the IRS test",
  "the_log_records": "“agree — every contribution limit uses the age attained in the calendar year (this year − birth year), the IRS test.” The age that matters is the one you reach at any point in the year, not your age today — which is the rule for every catch-up allowance.",
  "governs": "MK-CF-F-053 · MK-CF-F-054 · MK-CF-F-055"
 },
 {
  "id": "DEC-0378",
  "decided": "2026-09-01",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "“how can I trust the formulas given how many errors his reviews find?” — stop checking the code against itself. Every statutory constant is typed in from its PUBLISHED source, never from our own constants.",
  "the_log_records": "Every figure set by law is typed in from the published source — the IRS or the SSA — and never from our own constants. It came from his question of how he can trust the formulas given how many errors his reviews find; the answer was to stop checking the code against itself. The first run against the published figures found three errors: the IRA limits were a year out of date, the bigger catch-up allowance for ages 60 to 63 was missing entirely in an app built for ages 55 to 70, and four of the required-withdrawal divisors were slightly wrong.",
  "governs": "src/domain/income/limits.ts · [a test of the app]"
 },
 {
  "id": "DEC-0495",
  "decided": "2026-06-30",
  "type": "RULE",
  "tab": "multiple_screens",
  "whose": "his",
  "his_words": "Do not like the name",
  "the_log_records": "“Do not like the name.” A tab name rejected.",
  "governs": "src/domain/paycheck/index.ts · MoneyKeel/documents/standards/moneykeel_naming_spec_calculation-vocabulary_v01.md"
 },
 {
  "id": "DEC-2164",
  "decided": "2026-09-28",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "his",
  "his_words": "rise with inflation each year",
  "the_log_records": "The draw from savings rises with inflation each year, so it keeps its buying power. The figure shown is what it buys today.",
  "governs": "MK-CF-M-055 · MoneyKeel/functions/cashflow/future-paycheck.ts (MK-CF-O-017 futurePaycheck)"
 },
 {
  "id": "DEC-8153",
  "decided": "2026-10-24",
  "type": "RULE",
  "tab": "cashflow",
  "whose": "the lead's decision under his rulings, recorded in his log — not his own",
  "his_words": "",
  "the_log_records": "NOT A DECISION OF HIS — the lead's decision of 2026-10-24 under his rulings DEC-1923 and DEC-3523 (tenets 1 and 4), made without asking him, as his order of 2026-09-30 says. One rule for a debt in a month, in two new shared functions, MK-CF-F-235 paysInMonth and MK-CF-F-236 paymentInMonth: from its first payment to its payoff, and a balance due in full once, in its month, at its balance. A $7,200 take-home, a $3,400 budget, the $2,400 mortgage, a $250 car loan whose first payment is Oct 28, a $300 loan paid off in August and a $1,000 tax bill due in full Sep 20: September's planned surplus read +$850, the car loan and the paid-off loan counted and the tax bill left out; it reads +$400 = 7,200 − 3,400 − 2,400 − 1,000, what the Bill calendar's September holds. October's card is unchanged, $1,150. ACTUAL no longer lists the car loan as due the 28th at $0; MONTHLY RECURRING EXPENSES reads $2,400 (it read $2,650); the tax bill is on the BIG-TICKET RADAR at $1,000; Home's due-soon reminder no longer fires for a loan not yet started. MK-CF-M-047, 048 and 049 now say they print on a later month's plan card, from the grid ($7,200 / $6,050 / $1,150), and the retired surplus line and the paycheck card's SURPLUS have their own number, MK-CF-M-078 (it printed under MK-CF-M-049). To reverse: count every debt's payment in this month again, whatever its dates. One word from him reverses it.",
  "governs": "MK-CF-F-235 paysInMonth · MK-CF-F-236 paymentInMonth (src/domain/debt/index.ts) · MK-CF-F-156 plannedMonthFlow · MK-CF-F-005 actualMonthFlow · MK-CF-F-149 recurringDebtPayments · MK-CF-F-153 radar · MK-XS-F-004 buildDatedGrid · MK-CF-M-002 · MK-CF-M-016 · MK-CF-M-047 · MK-CF-M-048 · MK-CF-M-049 · MK-CF-M-078 · src/screens/HomeScreen.tsx · src/components/PaycheckCard.tsx"
 }
]
```
