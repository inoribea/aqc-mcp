import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface AqcResult {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Execute astroquery-cli command
 * @param args Command arguments (e.g., ['simbad', 'object', 'M31'])
 * @returns Execution result
 */
export async function executeAqc(args: string[]): Promise<AqcResult> {
  try {
    // Determine the CLI project root (parent of astroquery-mcp)
    const cliRoot = join(__dirname, '..', '..', '..');
    
    // Build command - use poetry run from CLI root directory
    const command = `cd ${cliRoot} && poetry run aqc ${args.join(' ')}`;
    
    // Pass through ADS_API_KEY if set
    const env = { ...process.env };
    if (process.env.ADS_API_KEY) {
      env.ADS_API_KEY = process.env.ADS_API_KEY;
    }
    
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 60000, // 60s timeout
      env,
      shell: '/bin/bash'
    });
    
    if (stderr && !stdout) {
      return {
        success: false,
        error: stderr
      };
    }
    
    return {
      success: true,
      output: stdout || stderr
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error)
    };
  }
}
