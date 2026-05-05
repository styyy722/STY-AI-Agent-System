---
name: stock-analysis
description: Analyze US stocks and cryptocurrencies using Yahoo Finance data. Includes portfolio analysis, crypto support, fundamentals, technicals, and sentiment. Write and execute Python code using yfinance to fetch live data and produce structured analysis.
---

# Stock Analysis Skill

Analyze US stocks and cryptocurrencies by writing and executing Python code using the `yfinance` library. This skill runs entirely through the STY Agent code execution engine — no external scripts required.

## How to Use This Skill

When a user asks to analyze a stock or crypto ticker, write a complete, self-contained Python script using `yfinance`. Use `print()` statements throughout so the agent can read and interpret the output.

**Always use the ticker symbol, not the company name.**

```text
AAPL     → Apple Inc.
MSFT     → Microsoft
BTC-USD  → Bitcoin
ETH-USD  → Ethereum
```

## Standard Analysis Template

For any stock analysis request, write Python code following this pattern:

```python
import yfinance as yf

ticker = "AAPL"  # replace with requested ticker
stock = yf.Ticker(ticker)
info = stock.info
hist = stock.history(period="6mo")

# Price and momentum
current_price = info.get("currentPrice") or info.get("regularMarketPrice")
week52_high = info.get("fiftyTwoWeekHigh")
week52_low = info.get("fiftyTwoWeekLow")
avg_volume = info.get("averageVolume")

print(f"=== {ticker} — Stock Analysis ===")
print(f"Current Price:  ${current_price:.2f}")
print(f"52-Week High:   ${week52_high:.2f}")
print(f"52-Week Low:    ${week52_low:.2f}")
print(f"Avg Volume:     {avg_volume:,}")

# Fundamentals
pe = info.get("trailingPE")
pb = info.get("priceToBook")
ev_ebitda = info.get("enterpriseToEbitda")
net_margin = info.get("profitMargins")
revenue_growth = info.get("revenueGrowth")
debt_equity = info.get("debtToEquity")

print(f"\n--- Fundamentals ---")
print(f"P/E Ratio:       {pe:.1f}" if pe else "P/E Ratio:       N/A")
print(f"P/B Ratio:       {pb:.2f}" if pb else "P/B Ratio:       N/A")
print(f"EV/EBITDA:       {ev_ebitda:.1f}" if ev_ebitda else "EV/EBITDA:       N/A")
print(f"Net Margin:      {net_margin*100:.1f}%" if net_margin else "Net Margin:      N/A")
print(f"Revenue Growth:  {revenue_growth*100:.1f}%" if revenue_growth else "Revenue Growth:  N/A")
print(f"Debt/Equity:     {debt_equity:.2f}" if debt_equity else "Debt/Equity:     N/A")

# Analyst consensus
target = info.get("targetMeanPrice")
recommendation = info.get("recommendationKey", "N/A").upper()
print(f"\n--- Analyst View ---")
print(f"Consensus:       {recommendation}")
print(f"Price Target:    ${target:.2f}" if target else "Price Target:    N/A")
if target and current_price:
    upside = ((target - current_price) / current_price) * 100
    print(f"Implied Upside:  {upside:+.1f}%")
```

## Cryptocurrency Analysis

For crypto tickers (e.g. BTC-USD, ETH-USD), adapt the template — fundamentals like P/E are not available. Focus on price momentum, volume, market cap, and 52-week range.

**Supported ticker format:** append `-USD` to the symbol.

```text
BTC-USD, ETH-USD, SOL-USD, BNB-USD, XRP-USD, ADA-USD, DOGE-USD,
AVAX-USD, DOT-USD, LINK-USD, UNI-USD, LTC-USD, BCH-USD
```

## Portfolio Analysis

When the user provides a list of tickers with quantities and cost bases, loop through each, fetch current price via yfinance, and compute P&L for each position. Then summarise total portfolio value, total cost, overall P&L %, and flag any single position over 30% of the portfolio as a concentration risk.

---

## Analysis Components

Evaluate eight dimensions and weight them to produce an overall Outlook (Positive / Neutral / Cautious):

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

Weights auto-normalise if some components are unavailable. Never express the outlook as BUY / HOLD / SELL — use Positive / Neutral / Cautious only.

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

Structure every stock analysis response as follows:

```
=== [TICKER] — Stock Analysis ===

PRICE & MOMENTUM
  Current price, 52-week range, RSI, volume vs average

FUNDAMENTALS
  P/E, P/B, EV/EBITDA, net margin, revenue growth, debt/equity

ANALYST VIEW
  Consensus rating, mean price target, implied upside/downside

KEY RISKS
  2–4 specific risks flagged for this ticker and current market context

OUTLOOK
  Positive / Neutral / Cautious  — one sentence rationale

⚠ DISCLAIMER: This analysis is for informational and educational purposes
only. It is not financial advice and should not be used as the basis for
investment decisions. Always conduct your own research and consult a licensed
financial adviser before investing.
```

**Do not use BUY / HOLD / SELL language.** Use Positive / Neutral / Cautious outlook instead. These are research summaries, not investment recommendations.

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
