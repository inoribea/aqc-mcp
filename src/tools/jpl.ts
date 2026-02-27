import { z } from 'zod';
import { restGet } from '../utils/http.js';

const HORIZONS_API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const SBDB_API = 'https://ssd-api.jpl.nasa.gov/sbdb.api';

export function registerJplTools(server: any) {
  server.tool(
    'jpl_horizons',
    'Query JPL Horizons for solar system body ephemerides, orbital elements, or state vectors',
    {
      target: z.string().describe('Target body (e.g. "Mars", "499", "Ceres", "1P/Halley")'),
      location: z.string().default('500').describe('Observer location code (default "500" = geocentric, "500@10" = heliocentric)'),
      ephemeris_type: z.enum(['ephemerides', 'elements', 'vectors']).default('ephemerides').describe('Type of ephemeris data'),
      start_time: z.string().optional().describe('Start time (e.g. "2024-01-01"). Defaults to today.'),
      stop_time: z.string().optional().describe('Stop time (e.g. "2024-01-02"). Defaults to start + 1 day.'),
      step_size: z.string().default('1d').describe('Step size (e.g. "1d", "1h", "30m")'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ target, location, ephemeris_type, start_time, stop_time, step_size, lang }: {
      target: string; location: string; ephemeris_type: string;
      start_time?: string; stop_time?: string; step_size: string; lang: string;
    }) => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultStart = now.toISOString().split('T')[0];
      const defaultStop = tomorrow.toISOString().split('T')[0];

      const commandMap: Record<string, string> = {
        ephemerides: 'OBSERVER',
        elements: 'ELEMENTS',
        vectors: 'VECTORS',
      };

      const params = new URLSearchParams({
        format: 'text',
        COMMAND: `'${target}'`,
        OBJ_DATA: 'YES',
        MAKE_EPHEM: 'YES',
        EPHEM_TYPE: commandMap[ephemeris_type] || 'OBSERVER',
        CENTER: `'${location}'`,
        START_TIME: `'${start_time || defaultStart}'`,
        STOP_TIME: `'${stop_time || defaultStop}'`,
        STEP_SIZE: `'${step_size}'`,
        CSV_FORMAT: 'NO',
      });

      const url = `${HORIZONS_API}?${params.toString()}`;
      const data = await restGet(url) as { result?: string; error?: string };

      if (data.error) {
        const errMsg = lang === 'zh' ? `JPL Horizons 错误: ${data.error}` : `JPL Horizons error: ${data.error}`;
        return { content: [{ type: 'text' as const, text: errMsg }] };
      }

      const result = data.result || JSON.stringify(data, null, 2);
      const title = lang === 'zh'
        ? `## JPL Horizons: ${target} (${ephemeris_type})\n`
        : `## JPL Horizons: ${target} (${ephemeris_type})\n`;
      return { content: [{ type: 'text' as const, text: title + result }] };
    }
  );

  server.tool(
    'jpl_sbdb',
    'Query JPL Small-Body Database for asteroid/comet orbital and physical data',
    {
      target: z.string().describe('Target small body name or designation (e.g. "Ceres", "433", "1P/Halley")'),
      phys: z.boolean().default(true).describe('Include physical parameters'),
      lang: z.enum(['en', 'zh']).default('en').describe('Output language'),
    },
    async ({ target, phys, lang }: { target: string; phys: boolean; lang: string }) => {
      const params = new URLSearchParams({
        sstr: target,
        phys_par: phys ? '1' : '0',
      });

      const url = `${SBDB_API}?${params.toString()}`;
      const data = await restGet(url) as Record<string, unknown>;

      const lines: string[] = [];
      const title = lang === 'zh' ? `JPL 小天体数据库: ${target}` : `JPL SBDB: ${target}`;
      lines.push(`## ${title}\n`);

      // Object info
      const obj = data.object as Record<string, unknown> | undefined;
      if (obj) {
        lines.push(lang === 'zh' ? '### 基本信息' : '### Object Info');
        if (obj.fullname) lines.push(`  Name: ${obj.fullname}`);
        if (obj.kind) lines.push(`  Type: ${obj.kind}`);
        if (obj.des) lines.push(`  Designation: ${obj.des}`);
        if (obj.prefix) lines.push(`  Prefix: ${obj.prefix}`);
        lines.push('');
      }

      // Orbital elements
      const orbit = data.orbit as Record<string, unknown> | undefined;
      if (orbit) {
        const elements = orbit.elements as Array<{ name: string; title: string; value: string; sigma?: string; units?: string }> | undefined;
        if (elements) {
          lines.push(lang === 'zh' ? '### 轨道要素' : '### Orbital Elements');
          for (const el of elements) {
            const unit = el.units ? ` ${el.units}` : '';
            lines.push(`  ${el.title || el.name}: ${el.value}${unit}`);
          }
          lines.push('');
        }
      }

      // Physical parameters
      const physPar = data.phys_par as Array<{ name: string; title: string; value: string; sigma?: string; units?: string; ref?: string }> | undefined;
      if (physPar && physPar.length > 0) {
        lines.push(lang === 'zh' ? '### 物理参数' : '### Physical Parameters');
        for (const p of physPar) {
          const unit = p.units ? ` ${p.units}` : '';
          lines.push(`  ${p.title || p.name}: ${p.value}${unit}`);
        }
        lines.push('');
      }

      if (lines.length <= 2) {
        lines.push(lang === 'zh' ? '未找到该天体的信息。' : 'No information found for this target.');
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
