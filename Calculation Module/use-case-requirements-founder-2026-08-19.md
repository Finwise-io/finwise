# Founder requirements — use-case decomposition (verbatim, 2026-08-19)

Standing context: "You are a Certified Financial Advisor, and building this for your client."
"Organize everything across all tabs in the same way."
"For each metric — list all possible use cases, and how you will calculate that metric for that
use, instead of bundling everything in one."

## Unrealized gain — five cases the founder named, verbatim

"Unrealized Gain = sum of (quantity * (today price - cost)). Now various use cases are
(1) cost basis not available,
(2) only average cost basis available not by lot,
(3) quantity not available,
(4) If showing on performance page, and duration is 3 months — do you show unrealized gain for the
duration of 3 months or total purchase period. If Unrealized gain needed to calculated for only
3 days or 3 weeks or 3 months, how you determine cost basis for this calculation.
(5) if stock / fund / cd / bond is generating dividend — and dividend is marked as re-investment
versus cash. how do you calculate income for holding, and unrealized gain?"

Also standing (same date): threaded comments K6 (never circular; calculated vs live EMV with an
Unknown gap the user categorises), K12 (realized gain must respect the selected period), G6/G13
(realized gain on account detail + performance pages; harvest-losses insight in the change-driver
box), and the 54-item audit in audits/cross-tab-consistency-audit-2026-08-19.md as mandatory input.
