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
export async function searchWeb(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Tavily API key is missing.\n" +
      "  Add TAVILY_API_KEY=tvly-... to your .env file.\n" +
      "  Get a free key at: https://tavily.com"
    );
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tavily search failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json() as any;

  const results: WebSearchResult[] = (data.results || []).map((r: any) => ({
    title: r.title || "",
    url: r.url || "",
    content: r.content || "",
  }));

  return { results, query };
}

// Formats search results into a clean context block for the LLM
export function formatSearchContext(search: WebSearchResponse): string {
  if (search.results.length === 0) return "";

  const lines = [
    `--- WEB SEARCH RESULTS (query: "${search.query}") ---`,
    `Retrieved: ${new Date().toISOString()}`,
    "",
  ];

  search.results.forEach((r, i) => {
    lines.push(`[${i + 1}] ${r.title}`);
    lines.push(`URL: ${r.url}`);
    lines.push(r.content.slice(0, 400));
    lines.push("");
  });

  lines.push("--- END WEB SEARCH RESULTS ---");
  lines.push("Use the above search results to inform your answer where relevant.");
  lines.push("Always cite the source URL when using specific data from search results.");

  return lines.join("\n");
}
