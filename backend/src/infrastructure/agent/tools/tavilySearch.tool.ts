import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const TAVILY_API_URL = 'https://api.tavily.com/search';
const MAX_RESULTS = 5;

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

export interface TavilyResponse {
  results: TavilyResult[];
}

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

function formatResults(results: TavilyResult[]): string {
  if (results.length === 0) return 'No results found.';
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}\nSource: ${r.url}`)
    .join('\n\n');
}

export function createTavilySearchTool(fetchFn: FetchFn = fetch): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'tavily_search',
    description:
      'Search the web for off-road trail reports, gear reviews, technical specs, and current regulations.',
    schema: z.object({
      query: z.string().describe('The search query for off-road trails, gear, or technical specs'),
    }),
    func: async ({ query }: { query: string }): Promise<string> => {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return 'Search unavailable: TAVILY_API_KEY is not configured.';
      }

      try {
        const response = await fetchFn(TAVILY_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey, query, max_results: MAX_RESULTS }),
        });

        if (!response.ok) {
          return `Search currently unavailable (HTTP ${response.status}).`;
        }

        const data = (await response.json()) as TavilyResponse;
        return formatResults(data.results ?? []);
      } catch {
        return 'Search currently unavailable. Please try again later.';
      }
    },
  });
}

export const tavilySearchTool = createTavilySearchTool();
