# How a mortgage, rent and a debt are entered and counted

MoneyKeel · calculation standard · v01 · 2026-10-07

The owner's rulings of 2026-10-04, in the order he gave them, and what each means for every screen
that counts money going out. Built on Net worth and Cash flow; not yet on Home, Plan, the Budget
screen and onboarding (the tracker carries that).

## The rule, in one sentence

A debt is counted from Debts, once, the moment it is entered — nobody has to add it to a budget.

## 1. Every debt is counted from Debts (DEC-1923)

*"Once user enters mortgage or any debt - the app deduct it directly to calculate surplus, emergency
fund, and any other place instead of leaving it for user to add it to planned expenses."*

- The planned surplus, the emergency fund and every other planned figure take each debt's required
  monthly payment from Debts.
- The **Rent / Mortgage budget line stands down** when the home's mortgage is in Debts, and the screen
  says so: "Your Rent / Mortgage budget line is not counted here: your home's mortgage, <name>, is in
  Debts and is counted from there." (MK-CF-O-020 theBudgetCounted)
- **Actual figures wait for the payment** to be logged; a debt is never assumed paid.
- The emergency fund counts every debt's MINIMUM (MK-NW-O-004 theEmergencyFund). A payment logged
  against a debt is not counted a second time.

## 2. A mortgage is not a running cost of a rental (DEC-1924, DEC-1859)

*"mortgage should not costs to run. We should ask to add monthly mortgage payment if any mortgage on
second property. And automatically add it to debt."* · *"remove langage to include interest on
mortgage in maintenance expenses, as that is not standard practice."*

- The Rent entry asks "Which property is it?" and "Monthly mortgage payment on this property, if any";
  saving adds that mortgage to Debts, on that property. The running-costs hint reads "Tax, insurance,
  repairs, management." — no mortgage interest.

## 3. Every mortgage is on a named property (DEC-1925)

*"Properties, mortgages, and debt we should ask user to name. App should map properties included in
networth against mortgages. It is feasible to have property without mortgage but no mortgage without
property. So check should be 3 properties in NW - 3 or less mortgage."*

- A mortgage is placed on its property by the property it names; else by a name that starts with the
  property's name; else when exactly one property and one mortgage are left. Never by balance. Two
  that cannot be placed are both shown under Debts for the person to fix: "Your mortgage "<name>" is
  not on a property. A mortgage is always on a property — open it and say which one."
  (MK-NW-F-106 mortgagesByProperty)
- The debt editor will not save a mortgage without a property: "Add the property first, on the Net
  worth page."
- Add an account, Real estate, asks "Mortgage balance (optional)" and "Monthly mortgage payment", and
  writes the mortgage on that property.

## 4. What a property is for is read, never asked (DEC-1926)

*"unless rental income is added on the income screen, assume property is second or vacation home."*

- A property with rent entered on the Income screen is a rental; the one marked "the home you live
  in" is the home (the first property entered, unless the person says otherwise); any other is a
  second or vacation home. (MK-NW-F-107 propertyUses)

## 5. Rent keeps arriving (DEC-1668)

*"add it to the cash as losing job does not mean loosing rental income too."*

- The emergency fund counts the rent that lands each month: months = cash ÷ (a month of essentials
  less the rent). Where the rent pays for the whole month no months are shown, and the card says the
  cash is not drawn on. The card says what it counted: "Both count $X/month of rent from your
  property, which keeps arriving if your pay stops." (MK-NW-M-064)

## Status and enforcement

Tests: `MoneyKeel/functions/networth-and-performance/emergency_fund_rent.test.ts`,
`src/screens/__tests__/emergency_fund_rent.test.tsx`, `src/screens/__tests__/mortgage_on_a_property.test.tsx`,
`src/screens/__tests__/housing_rule.test.tsx`, `MoneyKeel/functions/cashflow/budget-counted.test.ts`.
Drawings: Net worth v08, Cash flow v01, Income end-to-end v07 and Add an account v02 carry the rulings
at their top.
