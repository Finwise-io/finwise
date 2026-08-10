# STANDING ORDER — how you audit a build against an approved mock
*Written by the founder, 2026-08-10, after Claude claimed "matches" three times on screens that did not.*

## Read this first
"Match" means **100% mirror**: same elements, same words, same order, same grouping, same
alignment, same numbers, same flow. Not "the component is in the file." Not "the tests pass."
If a user can open the mock, open the app, and point at a difference — it does not match, and
saying it does is a false report.

Three times now you have told me a screen matched when it did not. Every time the cause was the
same: you searched the code for the *presence* of a thing instead of comparing the *whole screen*
to the *whole picture*. A presence check can never prove a match. Stop using it as if it can.

## The only method I will accept

### Step 1 — Extract the mock, completely
From the approved mock file, extract IN ORDER, top to bottom:
- every band / heading, with its exact text (including dates, info dots, totals on the band)
- every row label and every value
- every sub-heading and what sits under it
- every button and link, with its exact words
- the order of the sections, and which sections are inside which
Write it out as a numbered list. That list is the specification.

### Step 2 — Extract the built screen the same way
Render the screen in a test with realistic data (mine, not a toy fixture) and dump every visible
string in render order. Not what the code *says* — what the screen *shows*.

### Step 3 — DIFF the two lists, line by line
Every line falls in one of three buckets:
- **same** — text and position both match
- **different** — the text differs, however slightly ("as of Aug 10" ≠ "since Aug 3, 2026")
- **missing / extra** — in one list and not the other
Report the diff. Every "different", "missing" and "extra" is a defect until I say otherwise.

### Step 4 — Check the four things a text diff cannot see
1. **Order** — is section 3 in the mock still section 3 on screen? (Pills above the lists, not below.)
2. **Nesting** — does anything appear twice, or under the wrong parent? (A "Cash" heading inside
   the Cash group is a defect.)
3. **Alignment** — do ALL numbers share one right edge, including totals riding a band?
4. **Data reality** — open it with MY data. A CD must not sit under Cash. A money-market fund must
   not sit under Cash. If a rule was changed, existing accounts must be re-classified, not just new
   ones — a rule that only applies to future data is not built.

### Step 5 — Audit APPEARANCE. It is not optional and "a test can't see it" is not an excuse
Appearance is half the mock. Check every one of these against the picture, and report each:

1. **Colours** — pull the ACTUAL style values off the rendered element (not the stylesheet
   definition, the rendered node) and compare them to the mock's: band background, band text,
   sub-band background and text, hero number colour, gain/loss colours, every class dot. A colour
   that differs by one token is a defect.
2. **Font sizes and weights** — same method: the rendered size and weight of every heading, hero
   number, row label, row value and footnote, against the mock's. All sizes must be on the design
   scale; a heading at the wrong step is a defect.
3. **The shared right edge** — every number on the screen must resolve to ONE right edge: group
   totals riding a band, row values, and section totals alike. Compare the rendered width/inset of
   each number column; if the band's value inset differs from the rows' inset, that is a defect
   (this is exactly the "totals sit slightly left" defect I found by eye).
4. **Spacing and padding** — card padding, row height, indent of nested rows, the gap between a
   name and its number. Nested rows must indent by one step, not two, not zero.
5. **Charts and marks** — the donut: slice ORDER, slice colours from the validated palette, direct
   labels present, the centre content, its size. A chart that renders in a different order or with
   borrowed colours is a defect even if the totals are right.
6. **Order and nesting, visually** — walk the rendered tree top to bottom and confirm section order
   matches the mock, and that nothing is duplicated or nested under the wrong parent.

Where a test genuinely cannot reach (real device rendering, fonts as drawn by iOS), say exactly
which item you could not check and how you would check it — never let "audit complete" imply
"looks right" when you have not looked.

## Rules of reporting
- Never write "matches" unless steps 1–4 all came back clean. Write "elements present, appearance
  unverified" when that is what you actually did.
- A coverage line is required: "N of N lines identical; X different; Y missing".
- If you find one defect of a class, find every instance of that class before reporting (a
  misclassified CD means every misclassified holding, not just the one I named).
- Report defects I have not found yet. I should never be the one finding the 6th, 7th, 8th gap.

## Why this matters
Mockups exist so we agree ONCE and build ONCE. If the build drifts from the approved picture, the
mock was wasted, my review time was wasted, and I lose confidence in every "done" you report.
Quality is the first priority — a slipped date is fine, an unverified claim is not.
