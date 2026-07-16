# Price-data provider research — status 2026-07-15 (partial; verification resumes after limit reset)

**Question:** which market-data vendor can lawfully power MoneyKeel's END-USER price display
(EOD / 15-min delayed, US stocks + ETFs, 3y history)? Tiingo ruled out (internal-use license).

## VERIFIED (3-0 adversarial votes, license language quoted from the vendor's own terms)
- **Polygon.io — self-serve plans RULED OUT.** Their Market Data ToS: *"…license to use Market
  Data exclusively for your personal, non-business, and non-commercial purposes"* and
  *"you may not use the Market Data to build an application intended for use by end users other
  than you"* and §5(c) prohibits redistributing/displaying data **or charts derived from it** to
  any third party. Business/redistribution license = sales contact (sales@massive.com), pricing
  unpublished. (polygon.io/legal/market-data-terms-of-service, /individuals-terms-of-service)
- **EODHD — self-serve plans RULED OUT.** *"packages on the pricing page are intended for
  personal use only as commercial use requires a more thorough approach to licensing"* —
  commercial license exists (incl. startups) but pricing/display rights = sales contact.
  (eodhd.com/financial-apis/commercial-vs-personal-license-use)

## SOURCED BUT UNVERIFIED (verification agents died on session limits; each has a URL + quote)
- **Alpaca:** standard terms grant personal, non-commercial use; displaying content through your
  own "User Application" requires 30 days' advance written notice and Alpaca may restrict it at
  its discretion → display rights are negotiated, not bought at checkout.
- **FMP:** terms reportedly prohibit redistribution/display on self-serve tiers (same pattern).
- **The exchange route (the industry-standard answer for consumer display):** under the
  UTP / CTA plans, 15-minute-DELAYED data reportedly carries no per-end-user fees and no
  end-user agreements for display — vendors like **Intrinio** package delayed SIP data WITH
  display licensing for consumer apps. This is how most portfolio apps do it. Pricing and the
  exact vendor terms still need verification + a sales quote.

## THE PATTERN (already decision-grade)
No credible vendor sells end-user display rights at API-checkout prices. **Every route ends in
a short sales conversation** ("consumer iOS app, delayed/EOD display, small startup, US
equities+ETFs"). The delayed-data route keeps exchange fees near zero.

## NEXT STEPS
1. Resume the verification workflow after the session-limit reset (~3:50pm ET) to finish
   Alpaca/FMP/Finnhub/Twelve Data/Marketstack + the UTP/CTA fee specifics + Intrinio pricing.
2. Draft 3 sales-contact emails (Intrinio, Polygon/Massive commercial, EODHD commercial) for
   the founder to send — parallel quotes, same spec sheet.
3. Note: the provider decision gates PUBLIC LAUNCH, not Build 43's TestFlight — but it must be
   signed before App Store release.
