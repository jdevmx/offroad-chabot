import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTavilySearchTool, type FetchFn, type TavilyResponse } from './tavilySearch.tool';

function makeFetch(status: number, body: TavilyResponse | null, throws = false): FetchFn {
  return async (_url: string, _init?: RequestInit): Promise<Response> => {
    if (throws) throw new Error('Network error');
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  };
}

const successBody: TavilyResponse = {
  results: [
    { title: 'Trail Report: Rubicon Trail', url: 'https://example.com/rubicon', content: 'Great trail for 4x4.' },
    { title: 'Gear Review: ARB Bumper', url: 'https://example.com/arb', content: 'Solid protection.' },
  ],
};

describe('tavilySearchTool', () => {
  let savedEnv: string | undefined;

  beforeEach(() => {
    savedEnv = process.env.TAVILY_API_KEY;
    process.env.TAVILY_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    if (savedEnv === undefined) {
      delete process.env.TAVILY_API_KEY;
    } else {
      process.env.TAVILY_API_KEY = savedEnv;
    }
  });

  it('has the correct name', () => {
    const tool = createTavilySearchTool(makeFetch(200, successBody));
    expect(tool.name).toBe('tavily_search');
  });

  it('has a schema with a query field', () => {
    const tool = createTavilySearchTool(makeFetch(200, successBody));
    expect(tool.schema.shape).toHaveProperty('query');
  });

  it('returns formatted results on success', async () => {
    const tool = createTavilySearchTool(makeFetch(200, successBody));
    const result = await tool.invoke({ query: 'rubicon trail conditions' });
    expect(result).toContain('Rubicon Trail');
    expect(result).toContain('ARB Bumper');
    expect(result).toContain('https://example.com/rubicon');
  });

  it('returns an error string on 4xx response', async () => {
    const tool = createTavilySearchTool(makeFetch(401, null));
    const result = await tool.invoke({ query: 'test query' });
    expect(result).toContain('401');
    expect(result).not.toThrow;
  });

  it('returns an error string on 5xx response', async () => {
    const tool = createTavilySearchTool(makeFetch(500, null));
    const result = await tool.invoke({ query: 'test query' });
    expect(result).toContain('500');
  });

  it('returns an error string when fetch throws (network failure)', async () => {
    const tool = createTavilySearchTool(makeFetch(0, null, true));
    const result = await tool.invoke({ query: 'test query' });
    expect(result).toContain('unavailable');
  });

  it('returns an error string when TAVILY_API_KEY is missing', async () => {
    delete process.env.TAVILY_API_KEY;
    const tool = createTavilySearchTool(makeFetch(200, successBody));
    const result = await tool.invoke({ query: 'test query' });
    expect(result).toContain('TAVILY_API_KEY');
  });

  it('returns "No results found." when results array is empty', async () => {
    const tool = createTavilySearchTool(makeFetch(200, { results: [] }));
    const result = await tool.invoke({ query: 'obscure query' });
    expect(result).toBe('No results found.');
  });
});
