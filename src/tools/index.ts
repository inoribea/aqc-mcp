import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSimbadTools } from './simbad.js';
import { registerVizierTools } from './vizier.js';
import { registerAlmaTools } from './alma.js';
import { registerGaiaTools } from './gaia.js';
import { registerAdsTools } from './ads.js';
import { registerEsaskyTools } from './esasky.js';
import { registerEsoTools } from './eso.js';
import { registerExoplanetTools } from './exoplanet.js';
import { registerHeasarcTools } from './heasarc.js';
import { registerIrsaTools } from './irsa.js';
import { registerJplTools } from './jpl.js';
import { registerMastTools } from './mast.js';
import { registerNedTools } from './ned.js';
import { registerNistTools } from './nist.js';
import { registerSdssTools } from './sdss.js';
import { registerSplatalogueTools } from './splatalogue.js';

export function registerAllTools(server: McpServer) {
  registerSimbadTools(server);
  registerVizierTools(server);
  registerAlmaTools(server);
  registerGaiaTools(server);
  registerAdsTools(server);
  registerEsaskyTools(server);
  registerEsoTools(server);
  registerExoplanetTools(server);
  registerHeasarcTools(server);
  registerIrsaTools(server);
  registerJplTools(server);
  registerMastTools(server);
  registerNedTools(server);
  registerNistTools(server);
  registerSdssTools(server);
  registerSplatalogueTools(server);
}
