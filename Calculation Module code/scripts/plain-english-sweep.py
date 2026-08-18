# Replaces internal jargon in the workbook with words a person outside the code would use.
#
# Founder, 2026-08-17, on the wrapper row: "not sure what this means? What is wrapper and how is it
# getting determined?" He was right, and the word was in 22 cells. "Payload", "earmark", "sleeve"
# and "dedupe" were in another 66. Every one of them is a term that exists because of how the code
# is organised, not because of anything a person would recognise about their own money.
#
# The engine NAMES matter most: they are what he reads first and what we will call things forever.
import openpyxl, os

OUT = "/Users/palakjain/Vibe_Coding/finwise/Calculation Module/calculation-inventory-v1.xlsx"

# Ordered: longer phrases first, so a phrase is fixed before its individual words are.
SWAPS = [
    # ── engine names ────────────────────────────────────────────────────────────────────────────
    ("WRAPPER_GUESS",        "ACCOUNT_TAX_TYPE_GUESS"),
    ("WRAPPER_CONFIRMED",    "ACCOUNT_TAX_TYPE_CONFIRMED"),
    ("EARMARK_DEFAULT",      "RETIREMENT_SHARE_DEFAULT"),
    ("EARMARK_AMOUNT",       "RETIREMENT_SHARE_AMOUNT"),
    ("CASH_SLEEVE",          "UNINVESTED_CASH"),
    ("INGEST_DEDUPE",        "ALREADY_SEEN_CHECK"),
    ("INGEST_ACTIVITY_KEY",  "ACTIVITY_FINGERPRINT"),
    # ── phrases ─────────────────────────────────────────────────────────────────────────────────
    ("the wrapper picked on Add account",  "the tax type picked on Add account"),
    ("the wrapper chosen on Add account",  "the tax type chosen on Add account"),
    ("wrapper picked on Add account",      "tax type picked on Add account"),
    ("wrapper chosen on Add account",      "tax type chosen on Add account"),
    ("a wrapper whose contents",           "an account whose contents"),
    ("a cash wrapper",                     "an account marked as cash"),
    ("a property wrapper",                 "an account marked as property"),
    ("retirement wrappers",                "retirement accounts"),
    ("A wrong wrapper is wrong TAX MATH",  "The wrong tax type means the wrong tax maths"),
    ("a wrong wrapper is wrong tax maths", "the wrong tax type means the wrong tax maths"),
    ("wrong wrapper is wrong tax maths",   "wrong tax type means wrong tax maths"),
    ("the wrapper question",               "the question about how it is taxed"),
    ("A CONFIRMED WRAPPER",                "A CONFIRMED TAX TYPE"),
    ("a confirmed wrapper",                "a confirmed tax type"),
    ("the person's own answer on the next refresh", "the person's own answer on the next refresh"),
    ("SnapTrade sends no standard wrapper", "SnapTrade sends no standard tax type"),
    ("its wrapper",                        "its tax type"),
    ("The wrapper it sits in, for tax",    "How it is taxed"),
    ("The \"where is it held?\" wrapper",  "The \"where is it held?\" account type"),
    ("wrapper → tax_bucket",               "how it is taxed → tax_bucket"),
    ("The wrapper guess",                  "The tax-type guess"),
    ("wrapper guess",                      "tax-type guess"),
    ("the wrapper",                        "the tax type"),
    ("Wrapper",                            "Tax type"),
    ("wrapper",                            "tax type"),

    ("positions payload",                  "positions data"),
    ("the SnapTrade payload",              "the data SnapTrade sends"),
    ("SnapTrade payload",                  "the data SnapTrade sends"),
    ("the broker payload",                 "the data the broker sends"),
    ("broker payload",                     "the data the broker sends"),
    ("the account's payload",              "the data sent for that account"),
    ("the connected account's payload",    "the data sent for that connected account"),
    ("payload paths",                      "field names in the data they send"),
    ("the payload",                        "the data they send"),
    ("payload",                            "the data they send"),

    ("retirementEarmarkedValue",           "retirementEarmarkedValue"),   # a real function name: leave it
    ("the earmarked portion",              "the share counted toward retirement"),
    ("earmarked for retirement",           "counted toward retirement"),
    ("EARMARKED",                          "COUNTED TOWARD RETIREMENT"),
    ("earmarked amount",                   "amount counted toward retirement"),
    ("earmarked",                          "counted toward retirement"),
    ("legally earmarked",                  "legally set aside"),
    ("earmark rule",                       "retirement-share rule"),
    ("the earmark",                        "the share counted toward retirement"),
    ("earmark",                            "retirement share"),

    ("the cash sleeve",                    "the uninvested cash"),
    ("cash sleeve",                        "uninvested cash"),
    ("the sleeve dedupe",                  "the uninvested-cash adjustment"),
    ("sleeve",                             "uninvested cash"),

    ("the dedupe key",                     "the fingerprint that spots a repeat"),
    ("the dedupe set",                     "the list of activities already seen"),
    ("dedupe registry",                    "list of activities already seen"),
    ("deduplicated",                       "correctly spotted as repeats"),
    ("dedupe",                             "duplicate check"),

    ("is a RESIDUAL",                      "is WHATEVER IS LEFT OVER"),
    ("a RESIDUAL",                         "whatever is left over"),
    ("residual",                           "leftover"),
]

wb = openpyxl.load_workbook(OUT)
changed, cells = 0, 0
for tab in wb.sheetnames:
    ws = wb[tab]
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if not isinstance(v, str):
                continue
            new = v
            for a, b in SWAPS:
                if a in new:
                    new = new.replace(a, b)
            if new != v:
                cell.value = new
                cells += 1
                changed += sum(v.count(a) for a, _ in SWAPS)
wb.save(OUT)
print(f"  rewrote {cells} cells")

# ── and check nothing survived ──────────────────────────────────────────────────────────────────
BANNED = ['wrapper', 'payload', 'earmark', 'residual', 'dedupe', 'sleeve', 'idempot', 'arity']
wb = openpyxl.load_workbook(OUT)
# The GENERATED columns carry real code identifiers - netCashSleeve, earmarkDefault - and must keep
# them: they are how a developer finds the function. Only the words WE write are swept.
GENERATED = {"Function", "Build order", "Built from", "Screens", "Called by", "Returns", "Source"}
left = []
for tab in wb.sheetnames:
    ws = wb[tab]
    hdr = {c: ws.cell(2, c).value for c in range(1, ws.max_column + 1)}
    for row in ws.iter_rows():
        for cell in row:
            if isinstance(cell.value, str) and hdr.get(cell.column) not in GENERATED:
                for b in BANNED:
                    if b in cell.value.lower():
                        left.append((tab, cell.row, cell.column, b))
if left:
    print(f"  ⚠ {len(left)} cells still carry internal jargon:")
    for t, r, c, b in left[:20]:
        print(f"      {t} row {r} col {c}: '{b}'")
else:
    print("  no internal jargon left anywhere in the workbook")
