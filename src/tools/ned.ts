import { z } from 'zod';
import { restGet } from '../utils/http.js';

const NED_API = 'https://ned.ipac.caltech.edu/srs/ObjectLookup';

export function registerNedTools(server: any) {
  server.tool(
    'ned_query',
    'Query NASA/IPAC Extragalactic Database (NED) for object information by name',
    {
      object_name: z.string().describe('Object name (e.g. "M31", "NGC 1068", "Arp 220")'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ object_name, lang }: { object_name: string; lang: string }) => {
      const url = `${NED_API}?name=${encodeURIComponent(object_name)}&of=json`;
      const data = await restGet(url) as Record<string, unknown>;

      const lines: string[] = [];
      const title = lang === 'zh' ? `NED 查询结果: ${object_name}` : `NED Query Result: ${object_name}`;
      lines.push(`## ${title}\n`);

      // NED returns different structures depending on the result
      const resultCode = data.ResultCode as number | undefined;
      if (resultCode !== undefined && resultCode !== 3 && resultCode !== 0) {
        // ResultCode 3 = success for some endpoints, 0 = success for others
        const msg = lang === 'zh' ? `未找到天体: ${object_name}` : `Object not found: ${object_name}`;
        lines.push(msg);
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      }

      const preferred = data.Preferred as Record<string, unknown> | undefined;
      if (preferred) {
        lines.push(lang === 'zh' ? '### 基本信息' : '### Basic Information');
        if (preferred.Name) lines.push(`  Name: ${preferred.Name}`);
        if (preferred.Type) lines.push(`  Type: ${preferred.Type}`);
        const pos = preferred.Position as Record<string, unknown> | undefined;
        if (pos) {
          const ra = pos.RA as string | number | undefined;
          const dec = pos.Dec as string | number | undefined;
          if (ra !== undefined) lines.push(`  RA: ${ra}`);
          if (dec !== undefined) lines.push(`  Dec: ${dec}`);
        }
        if (preferred.Redshift !== undefined && preferred.Redshift !== null) lines.push(`  Redshift: ${preferred.Redshift}`);
        if (preferred.Velocity !== undefined && preferred.Velocity !== null) lines.push(`  Velocity: ${preferred.Velocity} km/s`);
        lines.push('');
      }

      // If the response is a flat object with known fields
      if (!preferred) {
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined && typeof value !== 'object') {
            lines.push(`  ${key}: ${value}`);
          }
        }
      }

      if (lines.length <= 2) {
        lines.push(lang === 'zh' ? '未找到该天体的信息。' : 'No information found for this object.');
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
