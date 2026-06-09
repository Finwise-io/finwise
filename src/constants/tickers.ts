// A static, offline list of common US tickers for autocomplete in the holding editor.
// Not exhaustive — users can still type any symbol. kind maps to our asset-kind benchmark buckets.
export interface TickerHint { sym: string; name: string; kind: string }

export const COMMON_TICKERS: TickerHint[] = [
  // Broad-market & index ETFs
  { sym: 'VOO', name: 'Vanguard S&P 500 ETF', kind: 'stocks_etf' },
  { sym: 'SPY', name: 'SPDR S&P 500 ETF', kind: 'stocks_etf' },
  { sym: 'IVV', name: 'iShares Core S&P 500 ETF', kind: 'stocks_etf' },
  { sym: 'VTI', name: 'Vanguard Total Stock Market ETF', kind: 'stocks_etf' },
  { sym: 'QQQ', name: 'Invesco QQQ (Nasdaq-100)', kind: 'stocks_etf' },
  { sym: 'VUG', name: 'Vanguard Growth ETF', kind: 'stocks_etf' },
  { sym: 'VTV', name: 'Vanguard Value ETF', kind: 'stocks_etf' },
  { sym: 'VXUS', name: 'Vanguard Total International Stock ETF', kind: 'stocks_etf' },
  { sym: 'VEA', name: 'Vanguard Developed Markets ETF', kind: 'stocks_etf' },
  { sym: 'VWO', name: 'Vanguard Emerging Markets ETF', kind: 'stocks_etf' },
  { sym: 'SCHD', name: 'Schwab US Dividend Equity ETF', kind: 'stocks_etf' },
  { sym: 'VYM', name: 'Vanguard High Dividend Yield ETF', kind: 'stocks_etf' },
  { sym: 'VT', name: 'Vanguard Total World Stock ETF', kind: 'stocks_etf' },
  { sym: 'IWM', name: 'iShares Russell 2000 ETF', kind: 'stocks_etf' },
  { sym: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', kind: 'stocks_etf' },
  { sym: 'ITOT', name: 'iShares Core S&P Total US Stock ETF', kind: 'stocks_etf' },
  { sym: 'VGT', name: 'Vanguard Information Technology ETF', kind: 'stocks_etf' },
  { sym: 'SCHG', name: 'Schwab US Large-Cap Growth ETF', kind: 'stocks_etf' },
  // Bond ETFs
  { sym: 'BND', name: 'Vanguard Total Bond Market ETF', kind: 'bonds' },
  { sym: 'AGG', name: 'iShares Core US Aggregate Bond ETF', kind: 'bonds' },
  { sym: 'BNDX', name: 'Vanguard Total International Bond ETF', kind: 'bonds' },
  { sym: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', kind: 'bonds' },
  { sym: 'VTEB', name: 'Vanguard Tax-Exempt Bond ETF', kind: 'bonds' },
  { sym: 'TIP', name: 'iShares TIPS Bond ETF', kind: 'bonds' },
  // Mega-cap & popular single stocks
  { sym: 'AAPL', name: 'Apple Inc.', kind: 'stocks_etf' },
  { sym: 'MSFT', name: 'Microsoft Corp.', kind: 'stocks_etf' },
  { sym: 'NVDA', name: 'NVIDIA Corp.', kind: 'stocks_etf' },
  { sym: 'AMZN', name: 'Amazon.com Inc.', kind: 'stocks_etf' },
  { sym: 'GOOGL', name: 'Alphabet Inc. (Class A)', kind: 'stocks_etf' },
  { sym: 'GOOG', name: 'Alphabet Inc. (Class C)', kind: 'stocks_etf' },
  { sym: 'META', name: 'Meta Platforms Inc.', kind: 'stocks_etf' },
  { sym: 'TSLA', name: 'Tesla Inc.', kind: 'stocks_etf' },
  { sym: 'BRK.B', name: 'Berkshire Hathaway (Class B)', kind: 'stocks_etf' },
  { sym: 'JPM', name: 'JPMorgan Chase & Co.', kind: 'stocks_etf' },
  { sym: 'V', name: 'Visa Inc.', kind: 'stocks_etf' },
  { sym: 'MA', name: 'Mastercard Inc.', kind: 'stocks_etf' },
  { sym: 'UNH', name: 'UnitedHealth Group', kind: 'stocks_etf' },
  { sym: 'JNJ', name: 'Johnson & Johnson', kind: 'stocks_etf' },
  { sym: 'XOM', name: 'Exxon Mobil Corp.', kind: 'stocks_etf' },
  { sym: 'PG', name: 'Procter & Gamble Co.', kind: 'stocks_etf' },
  { sym: 'HD', name: 'Home Depot Inc.', kind: 'stocks_etf' },
  { sym: 'COST', name: 'Costco Wholesale Corp.', kind: 'stocks_etf' },
  { sym: 'WMT', name: 'Walmart Inc.', kind: 'stocks_etf' },
  { sym: 'KO', name: 'Coca-Cola Co.', kind: 'stocks_etf' },
  { sym: 'PEP', name: 'PepsiCo Inc.', kind: 'stocks_etf' },
  { sym: 'DIS', name: 'Walt Disney Co.', kind: 'stocks_etf' },
  { sym: 'NFLX', name: 'Netflix Inc.', kind: 'stocks_etf' },
  { sym: 'AMD', name: 'Advanced Micro Devices', kind: 'stocks_etf' },
  { sym: 'INTC', name: 'Intel Corp.', kind: 'stocks_etf' },
  { sym: 'BAC', name: 'Bank of America Corp.', kind: 'stocks_etf' },
  { sym: 'ABBV', name: 'AbbVie Inc.', kind: 'stocks_etf' },
  { sym: 'CRM', name: 'Salesforce Inc.', kind: 'stocks_etf' },
  { sym: 'AVGO', name: 'Broadcom Inc.', kind: 'stocks_etf' },
  { sym: 'ADBE', name: 'Adobe Inc.', kind: 'stocks_etf' },
  // Crypto (our crypto kind)
  { sym: 'BTC', name: 'Bitcoin', kind: 'crypto' },
  { sym: 'ETH', name: 'Ethereum', kind: 'crypto' },
  { sym: 'SOL', name: 'Solana', kind: 'crypto' },
  // Gold / commodity
  { sym: 'GLD', name: 'SPDR Gold Shares', kind: 'commodity' },
  { sym: 'IAU', name: 'iShares Gold Trust', kind: 'commodity' },
];

/** Up to `limit` matches for a query — prefix on symbol first, then symbol/name contains. */
export function searchTickers(query: string, limit = 6): TickerHint[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const starts = COMMON_TICKERS.filter((t) => t.sym.startsWith(q));
  const contains = COMMON_TICKERS.filter((t) => !t.sym.startsWith(q) && (t.sym.includes(q) || t.name.toUpperCase().includes(q)));
  return [...starts, ...contains].slice(0, limit);
}
