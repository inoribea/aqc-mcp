/**
 * Shared HTTP utilities for astronomical database APIs.
 * TAP (Table Access Protocol) client for SIMBAD, VizieR, Gaia, ALMA.
 * REST client for NASA ADS.
 */

export interface TapQueryOptions {
  endpoint: string;
  adql: string;
  format?: 'json' | 'csv' | 'votable' | 'text';
  timeout?: number;
  maxrec?: number;
}

export interface TapResult {
  columns: string[];
  rows: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

/**
 * Execute a synchronous TAP query via HTTP POST.
 * Works with SIMBAD, VizieR, Gaia, ALMA TAP endpoints.
 */
export async function tapQuery(options: TapQueryOptions): Promise<TapResult> {
  const { endpoint, adql, format = 'json', timeout = 60000, maxrec } = options;

  const params = new URLSearchParams({
    REQUEST: 'doQuery',
    LANG: 'ADQL',
    FORMAT: format === 'json' ? 'json' : format,
    QUERY: adql,
  });
  if (maxrec !== undefined) {
    params.set('MAXREC', String(maxrec));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`TAP query failed (${response.status}): ${body.slice(0, 500)}`);
    }

    const text = await response.text();
    return parseTapResponse(text, format);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse TAP response based on format.
 */
function parseTapResponse(text: string, format: string): TapResult {
  if (format === 'json') {
    return parseJsonResponse(text);
  }
  if (format === 'csv') {
    return parseCsvResponse(text);
  }
  if (format === 'text') {
    return parseTextResponse(text);
  }
  // votable — return raw text as single-row result
  return { columns: ['votable'], rows: [{ votable: text }] };
}

/**
 * Parse pipe-delimited text response from HEASARC TAP.
 * Format: header row with | separators, data rows, footer with 'Number of rows/columns'.
 */
function parseTextResponse(text: string): TapResult {
  const lines = text.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('Number of');
  });
  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }
  const headers = lines[0].split('|').map(h => h.trim()).filter(h => h.length > 0);
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('|').map(v => v.trim());
    // Skip separator lines (e.g. '---+---+---')
    if (values.every(v => /^[-+]+$/.test(v) || v.length === 0)) continue;
    const obj: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const val = values[j + (values.length > headers.length ? 1 : 0)] ?? '';
      const num = Number(val);
      obj[headers[j]] = val.length > 0 && !isNaN(num) && val !== '' ? num : val;
    }
    rows.push(obj);
  }
  return { columns: headers, rows };
}

function parseJsonResponse(text: string): TapResult {
  const data = JSON.parse(text);

  // Standard TAP JSON response format (used by most TAP services)
  if (data.metadata && data.data) {
    const columns = data.metadata.map((m: { name: string }) => m.name);
    const rows = data.data.map((row: unknown[]) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });
    return { columns, rows, metadata: { raw_metadata: data.metadata } };
  }

  // Some services return array of objects directly
  if (Array.isArray(data)) {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    return { columns, rows: data };
  }

  // Fallback: wrap as single result
  return { columns: Object.keys(data), rows: [data] };
}

function parseCsvResponse(text: string): TapResult {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return { columns: [], rows: [] };

  const columns = lines[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = values[i] ?? '';
    });
    return obj;
  });

  return { columns, rows };
}

/**
 * Format TAP result as readable text for MCP tool output.
 */
export function formatTapResult(result: TapResult, title?: string): string {
  const lines: string[] = [];

  if (title) lines.push(`## ${title}\n`);

  if (result.rows.length === 0) {
    lines.push('No results found.');
    return lines.join('\n');
  }

  lines.push(`Found ${result.rows.length} result(s).\n`);

  // Format as readable key-value pairs for small result sets
  if (result.rows.length <= 5) {
    result.rows.forEach((row, idx) => {
      if (result.rows.length > 1) lines.push(`--- Result ${idx + 1} ---`);
      for (const [key, value] of Object.entries(row)) {
        if (value !== null && value !== undefined && value !== '') {
          lines.push(`  ${key}: ${value}`);
        }
      }
      lines.push('');
    });
  } else {
    // For larger result sets, format as a compact table
    const cols = result.columns.slice(0, 8); // limit columns for readability
    lines.push(cols.join(' | '));
    lines.push(cols.map(() => '---').join(' | '));
    result.rows.slice(0, 20).forEach(row => {
      lines.push(cols.map(c => String(row[c] ?? '')).join(' | '));
    });
    if (result.rows.length > 20) {
      lines.push(`\n... and ${result.rows.length - 20} more rows.`);
    }
  }

  return lines.join('\n');
}

/**
 * Generic JSON REST API call (for ADS, etc.)
 */
export async function restGet(
  url: string,
  options?: {
    headers?: Record<string, string>;
    timeout?: number;
  }
): Promise<unknown> {
  const { headers = {}, timeout = 30000 } = options ?? {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json', ...headers },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`API request failed (${response.status}): ${body.slice(0, 500)}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
