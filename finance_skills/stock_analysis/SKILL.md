---
name: stock-analysis
description: Analyze US stocks and cryptocurrencies using Yahoo Finance data. Includes portfolio management, crypto support, and periodic analysis.
---

# Stock Analysis Skill

Analyze US stocks and cryptocurrencies using Yahoo Finance data. Includes portfolio management, crypto support, and periodic analysis.

## Quick Start

**IMPORTANT:** Pass ONLY the stock ticker symbol(s) as arguments. Do NOT add extra text, headers, or formatting in the command.

### Analyze a single ticker

```bash
uv run {baseDir}/scripts/analyze_stock.py AAPL
uv run {baseDir}/scripts/analyze_stock.py MSFT --output json
```

### Compare multiple tickers

```bash
uv run {baseDir}/scripts/analyze_stock.py AAPL MSFT GOOGL
```

---

## Cryptocurrency Analysis

Analyze top 20 cryptocurrencies by market cap:

```bash
uv run {baseDir}/scripts/analyze_stock.py BTC-USD
uv run {baseDir}/scripts/analyze_stock.py ETH-USD SOL-USD
```

### Supported Cryptos

```text
BTC-USD, ETH-USD, BNB-USD, SOL-USD, XRP-USD, ADA-USD, DOGE-USD,
AVAX-USD, DOT-USD, MATIC-USD, LINK-USD, ATOM-USD, UNI-USD,
LTC-USD, BCH-USD, XLM-USD, ALGO-USD, VET-USD, FIL-USD, NEAR-USD
```

### Crypto Analysis Dimensions

- Market cap: large, mid, or small classification
- Category: Smart Contract L1, DeFi, Payment, etc.
- BTC correlation: 30-day
- Momentum: RSI and price range
- Market context: VIX and general market regime

---

## Portfolio Management

Create and manage portfolios with mixed assets, including stocks and crypto.

### Create portfolio

```bash
uv run {baseDir}/scripts/portfolio.py create "My Portfolio"
```

### Add assets

```bash
uv run {baseDir}/scripts/portfolio.py add AAPL --quantity 100 --cost 150.00
uv run {baseDir}/scripts/portfolio.py add BTC-USD --quantity 0.5 --cost 40000 --portfolio "My Portfolio"
```

### View holdings with current P&L

```bash
uv run {baseDir}/scripts/portfolio.py show
```

### Update or remove assets

```bash
uv run {baseDir}/scripts/portfolio.py update AAPL --quantity 150
uv run {baseDir}/scripts/portfolio.py remove BTC-USD
```

### List or delete portfolios

```bash
uv run {baseDir}/scripts/portfolio.py list
uv run {baseDir}/scripts/portfolio.py delete "My Portfolio"
```

### Portfolio Storage

```text
~/.clawdbot/skills/stock-analysis/portfolios.json
```

---

## Portfolio Analysis

Analyze all assets in a portfolio with optional period returns.

### Analyze portfolio

```bash
uv run {baseDir}/scripts/analyze_stock.py --portfolio "My Portfolio"
```

### Analyze portfolio with period returns

```bash
uv run {baseDir}/scripts/analyze_stock.py --portfolio "My Portfolio" --period weekly
uv run {baseDir}/scripts/analyze_stock.py -p "My Portfolio" --period monthly
```

### Portfolio Summary Includes

- Total cost, current value, and P&L
- Period return, if specified
- Concentration warnings above 30% in a single asset
- Recommendation summary: BUY, HOLD, and SELL counts

---

## Correct and Incorrect Input Examples

### Correct

```bash
uv run {baseDir}/scripts/analyze_stock.py BAC
uv run {baseDir}/scripts/analyze_stock.py BTC-USD
```

### Incorrect

```bash
uv run {baseDir}/scripts/analyze_stock.py === BANK OF AMERICA (BAC) - Q4 2025 EARNINGS ===
uv run {baseDir}/scripts/analyze_stock.py "Bank of America"
```

Use the ticker symbol only.

For example:

```text
BAC, not "Bank of America"
BTC-USD, not "Bitcoin"
```

---

## Analysis Components

The script evaluates eight key dimensions:

| Component | Weight | Description |
|---|---:|---|
| Earnings Surprise | 30% | Actual vs expected EPS, revenue beats or misses |
| Fundamentals | 20% | P/E ratio, profit margins, revenue growth, debt levels |
| Analyst Sentiment | 20% | Consensus ratings, price target vs current price |
| Historical Patterns | 10% | Past earnings reactions and volatility |
| Market Context | 10% | VIX, SPY/QQQ trends, and market regime |
| Sector Performance | 15% | Stock vs sector comparison and sector trends |
| Momentum | 15% | RSI, 52-week range, volume, and relative strength |
| Sentiment Analysis | 10% | Fear/Greed Index, short interest, VIX term structure, insider trading, and put/call ratio |

Weights auto-normalize if some components are unavailable.

---

## Sentiment Sub-Indicators

### Fear & Greed Index

Contrarian signal.

- Extreme fear may indicate a buy opportunity.
- Extreme greed may indicate caution.

### Short Interest

- High short interest plus squeeze potential may be bullish.
- Justified short interest may be bearish.

### VIX Term Structure

- Contango may suggest complacency or bullish conditions.
- Backwardation may suggest stress or bearish conditions.

### Insider Activity

Net buying or selling from SEC Form 4 filings over a 90-day window.

### Put/Call Ratio

- High ratio may indicate excessive fear and can be bullish.
- Low ratio may indicate complacency and can be bearish.

---

## Special Timing Checks

### Pre-Earnings Warning

If earnings are less than 14 days away, BUY signals are adjusted to HOLD.

### Post-Earnings Spike Detection

If the stock is up more than 15% in 5 days after earnings, flag that gains may already be priced in.

### Overbought Conditions

If RSI is above 70 and the price is near a 52-week high, reduce confidence.

---

## Timing Warnings and Risk Flags

The script detects high-risk scenarios.

### Earnings Timing

- **Pre-Earnings Period:** If earnings are less than 14 days away, BUY signals become HOLD.
- **Post-Earnings Spike:** If stock is up more than 15% in 5 days after earnings, warn that gains may be priced in.

### Technical Risk

- **Overbought Conditions:** RSI above 70 and near 52-week high indicates a high-risk entry.

### Market Risk

- **High VIX:** Market fear, where VIX is above 30, reduces confidence in BUY signals.
- **Risk-Off Mode:** When safe-haven assets rise together, BUY confidence is reduced by 30%.

Risk-off mode detects flight to safety across:

- Gold
- Treasuries
- US dollar

Risk-off mode triggers when:

```text
GLD ≥ +2%
TLT ≥ +1%
UUP ≥ +1%
```

based on 5-day change.

### Sector Risk

Sector weakness may indicate that a stock looks strong individually, but its sector is rotating out.

---

## Geopolitical Risk

The script scans breaking news from the last 24 hours for crisis keywords and flags affected stocks.

### Taiwan Conflict

Affected stocks:

```text
NVDA, AMD, TSM, INTC, and other semiconductor-related stocks
```

Impact:

```text
30% confidence penalty
```

### China Tensions

Affected stocks:

```text
AAPL, QCOM, NKE, SBUX, and other tech or consumer-exposed stocks
```

Impact:

```text
30% confidence penalty
```

### Russia-Ukraine

Affected stocks:

```text
XOM, CVX, MOS, CF, and other energy or materials stocks
```

Impact:

```text
30% confidence penalty
```

### Middle East

Affected stocks:

```text
XOM, LMT, RTX, and other oil or defense stocks
```

Impact:

```text
30% confidence penalty
```

### Banking Crisis

Affected stocks:

```text
JPM, BAC, WFC, C, and other financial stocks
```

Impact:

```text
30% confidence penalty
```

If a ticker is not in the affected list but its sector is exposed, apply a 15% confidence penalty.

### Example Alert

```text
⚠️ SECTOR RISK: Tech supply chain and consumer market exposure detected: china, tariff
```

---

## Breaking News Alerts

The script:

- Scans Google News RSS for crisis keywords such as war, recession, sanctions, disasters, etc.
- Displays up to 2 breaking news alerts in caveats from the last 24 hours.
- Uses a 1-hour cache to avoid excessive API calls.

---

## Output Format

### Default Text Output

Concise BUY, HOLD, or SELL signal with:

- 3 to 5 bullet points
- Caveats
- Prominent not-financial-advice warning

### JSON Output

Structured data with:

- Scores
- Metrics
- Raw data for further analysis

---

## Limitations

### Data Freshness

Yahoo Finance may lag by 15 to 20 minutes.

### Sentiment Data Staleness

- Short interest data lags by approximately 2 weeks due to FINRA reporting schedules.
- Insider trades may lag filing by 2 to 3 days.
- VIX term structure only updates during futures trading hours.

### Breaking News Limitations

- Google News RSS may lag by 15 to 60 minutes.
- Keyword matching may have false positives or false negatives.
- The script does not analyze sentiment. It only detects keywords.
- The 1-hour cache means alerts may be slightly stale.

### Missing Data

Not all stocks have analyst coverage, options chains, or complete fundamentals.

### Execution Time

The expected execution time is 3 to 5 seconds per stock with async parallel fetching and caching.

Shared indicators are cached for 1 hour.

### Disclaimer

All outputs must include a prominent not-financial-advice warning.

### Market Coverage

The skill is primarily designed for US markets.

Non-US tickers may have incomplete data.

---

## Error Handling

The script should gracefully handle:

- Invalid tickers with a clear error message
- Missing analyst data by generating a signal based on available metrics only
- API failures with retry logic and exponential backoff
- Failure after 3 retry attempts
