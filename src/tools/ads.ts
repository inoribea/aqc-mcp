import { z } from 'zod';
import { restGet } from '../utils/http.js';

const ADS_API = 'https://api.adsabs.harvard.edu/v1/search/query';

export function registerAdsTools(server: any) {
  server.tool(
    'ads_search',
    'Search NASA ADS (Astrophysics Data System) for academic papers. Requires ADS_DEV_KEY or ADS_API_KEY env var.',
    {
      query: z.string().describe('Search query (e.g. "author:Einstein", "title:dark matter", "abs:exoplanet")'),
      max_results: z.number().default(10).describe('Maximum number of results'),
      sort: z.string().default('date desc').describe('Sort order (e.g. "date desc", "citation_count desc")'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ query, max_results, sort, lang }: { query: string; max_results: number; sort: string; lang: string }) => {
      const apiKey = process.env.ADS_DEV_KEY || process.env.ADS_API_KEY;
      if (!apiKey) {
        return { content: [{ type: 'text' as const, text: lang === 'zh' ? '错误: 未设置 ADS_DEV_KEY 或 ADS_API_KEY 环境变量' : 'Error: ADS_DEV_KEY or ADS_API_KEY environment variable not set' }] };
      }

      const params = new URLSearchParams({
        q: query,
        rows: String(max_results),
        sort,
        fl: 'title,author,year,bibcode,citation_count,abstract,pub,doi',
      });

      const data = await restGet(`${ADS_API}?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }) as { response?: { docs?: Array<Record<string, unknown>>; numFound?: number } };

      const docs = data?.response?.docs ?? [];
      const total = data?.response?.numFound ?? 0;

      if (docs.length === 0) {
        return { content: [{ type: 'text' as const, text: lang === 'zh' ? '未找到结果。' : 'No results found.' }] };
      }

      const lines: string[] = [];
      lines.push(lang === 'zh' ? `## ADS 搜索结果 (共 ${total} 条，显示 ${docs.length} 条)\n` : `## ADS Search Results (${total} total, showing ${docs.length})\n`);

      for (const doc of docs) {
        const title = Array.isArray(doc.title) ? doc.title[0] : doc.title;
        const authors = Array.isArray(doc.author) ? doc.author.slice(0, 3).join(', ') + (doc.author.length > 3 ? ' et al.' : '') : '';
        lines.push(`**${title}**`);
        lines.push(`  ${authors} (${doc.year})`);
        lines.push(`  Bibcode: ${doc.bibcode} | Citations: ${doc.citation_count ?? 0}`);
        if (doc.doi) lines.push(`  DOI: ${Array.isArray(doc.doi) ? doc.doi[0] : doc.doi}`);
        lines.push('');
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
