# MoneyKeel Net Worth audit — Claude Code handoff

## Status and scope

This is a preliminary handoff based on the four uploaded card files and the master audit brief. The brief describes intended formulas and owner decisions; it does **not** include the implementation source or runtime results. Do not report tests as passed until the cases below (and the full expected-case set) have actually been mapped to and run against the implementation.

Scope in supplied card files: 101 cards across four batches. Required coverage: five independently worked cases per testable card (two easy, two complex, one edge), with full-precision expected values and shown values. The first batch also owns the cross-card owner-rule and screen-register checks.

## Review findings to resolve before treating the spec as closed

1. **Property-use rules may conflict with the settled owner rule.** DEC-1926 says a property is a second/vacation home unless rental income is entered for it on the Income screen; with rental income entered, it is a rental. However, `MK-NW-F-107 propertyUses` and `MK-NW-F-117 propertyUseMap` permit a stored `rental` value to determine use when no rent entries are handed in. Clarify whether “no entries handed in” means *the Income-screen data is unavailable* or *the user has no rent entry*. These are materially different states. Do not silently classify a property as a rental when the source data is merely absent.

2. **Default-home ordering is ambiguous across cards.** `MK-NW-F-107` says that when no home is marked and no use is stated, the first-entered property is the home. `MK-NW-F-117` repeats “entered first” but adds “(last in the list).” Confirm the account-list ordering contract and ensure `propertyUses`, `propertyUseMap`, `primaryHomeIdOf`, `realEstateUseOf`, and `earmarkDefault` all choose the same property.

3. **Mortgage/property invariant needs a defined invalid-data behavior.** DEC-1925 says every mortgage is matched to a property and there must never be more mortgages than properties. `MK-NW-F-106 mortgagesByProperty` also describes a result containing mortgages “on no property,” including excess or duplicate matches. That is useful for detecting inconsistent saved data, but it does not itself enforce the owner’s invariant. Define whether the function should report an integrity error/refuse a valid-state result when mortgages outnumber properties, rather than implying that an unmatched mortgage is an acceptable final state.

4. **Bond value terminology should be made unambiguous.** `MK-NW-F-056 bondInfo` describes value as “the balance,” while its registered input includes `MK-XS-I-049 bond price — what the bond is worth today`. `MK-NW-F-059 currentYield` and DEC-3390 require statement market value as entered, excluding accrued interest; `MK-NW-F-060 approxYTM` adds accrued interest (actual or estimated) to calculate yield to maturity. Ensure the implementation preserves these two distinct price bases and the UI labels explain them.

5. **No implementation pass/fail can be inferred from the cards.** The independent expected result is not the app result. Run each test and report `PASS` only for an exact match within a documented display-rounding tolerance; report mismatches with card ID, case title, expected value, actual value, and likely cause. Do not alter expected answers to match implementation output.

## Test execution requirements

- Preserve the exact card IDs and the five-case split (`easy`, `complex`, `edge`).
- Use deterministic dates (`now` is an explicit fixture input wherever a formula depends on dates); do not use the wall clock in tests.
- Keep calculations at full precision and round only for the displayed value.
- Represent absent information as `null`/missing according to the function contract, not as zero.
- Include broker/import wording, mixed case, whitespace, missing fields, zero and negative values, and date-boundary cases where applicable.
- Cross-check owner decisions against every function and screen they govern. Highest priority includes: time-weighted returns; rent counted in emergency-fund runway only when the rule says it is available; debts counted from the debt list rather than double-counted in planned expenses; mortgage/property integrity; no default return when there are no assets; owner-confirmed classifications not overwritten; money-market funds classified as Stocks / Funds; CDs and T-bills classified as Bonds & CDs; unknown holdings remain Unclassified; estimated accrued interest labelled as an estimate; no rate-move estimate for CDs; and no growth figure for alternatives when nothing is held.
- For each orchestrator, assert that component rows sum to the total and that shared figures are identical across screens.
- Keep the audit output in the JSON schema specified in `moneykeel_audit_module_nw_for-openai_v01.md`. Jobs 3 and 4 (`rules_held`, `screen_checks`) belong in batch 1 only.

## Suggested Claude Code workflow

1. Import the independently authored expected-case JSON for each batch as test fixtures; do not generate expected values from the implementation.
2. Add an adapter only where a fixture field must be mapped to the app’s data model. Log every mapping that cannot be represented without changing the expected value.
3. Run each case against the named function or orchestrator with a fixed clock.
4. Emit a result file with one row per case: `card_id`, `case_title`, `status`, `expected`, `actual`, `diff`, `display_expected`, `display_actual`, `notes`.
5. Emit a separate summary by card: formula verdict, number of cases passed/failed/not runnable, and any spec ambiguity.
6. Do not mark the module “ready to close” while any high-severity finding, unrun case, unresolved owner-rule conflict, or screen-total inconsistency remains.

## Important limitation

This file is a handoff checklist and preliminary specification review, not the completed 505-case independent audit and not evidence that the implementation has passed. The full audit must supply the case-by-case expected values before the execution step can produce genuine runtime results.
