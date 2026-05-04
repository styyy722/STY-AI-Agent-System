import "dotenv/config";

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  query: string;
}

// Keywords that signal the query needs live data
const LIVE_DATA_KEYWORDS = [
  "current", "today", "latest", "live", "now", "recent", "right now",
  "this week", "this month", "this year", "2025", "2026",
  "price", "stock price", "share price", "market cap",
  "interest rate", "cash rate", "rba", "fed rate", "yield",
  "news", "announcement", "asx", "earnings", "results",
  "inflation", "cpi", "gdp", "unemployment",
  "broke", "crashed", "surged", "fell", "rose", "dropped"
];

// Returns true if the query likely needs live web data
export function queryNeedsWebSearch(query: string): boolean {
  if (process.env.WEB_SEARCH_ENABLED !== "true") return false;

  const lower = query.toLowerCase();
  return LIVE_DATA_KEYWORDS.some((keyword) => lower.includes(keyword));
}

// Calls the Tavily search API and returns formatted results
export async function searchWeb(query: string): Promise<WebSe
