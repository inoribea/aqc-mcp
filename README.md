# Astroquery MCP Server 🚀

A Model Context Protocol (MCP) server for astroquery-cli, providing HTTP and SSE (Server-Sent Events) transport options.

---

## Overview ✨

The aqc-mcp server provides direct HTTP/TAP API access to 17+ astronomical databases as MCP tools, allowing AI applications and other services to query astronomical data through standardized MCP protocols. Supports both HTTP and SSE transports.

---

## Features 🌟

- ⚡ **MCP Protocol**: Full implementation of MCP specification
- 🌐 **Multiple Transports**:
  - HTTP (default)
  - SSE (Server-Sent Events)
  - Stdio (for Claude Desktop)
- 🔌 **17 Databases**: Direct TAP/REST API access to major astronomical archives
- 🌍 **Language Support**: Multi-language output (English, Chinese)
- 📊 **Rich Output**: Formatted tables and structured results
- 🔑 **ADS API Token Support**: Environment variable injection for authenticated queries
- ⚡ **No Python Required**: Pure Node.js/TypeScript implementation

---

## Supported Modules 🧩

Currently implemented tools (17 astronomical databases):

### General Astronomy
- **SIMBAD**: Query SIMBAD astronomical database
- **VizieR**: Query VizieR catalog database
- **NED**: NASA/IPAC Extragalactic Database
- **ADS**: NASA Astrophysics Data System queries (requires API token)

### Radio & Millimeter
- **ALMA**: Query ALMA observations archive
- **ESO**: European Southern Observatory science archive

### High Energy & X-ray
- **Fermi LAT**: Fermi Large Area Telescope gamma-ray source catalog
- **HEASARC**: High Energy Astrophysics Science Archive (multiple missions)

### Infrared & Submillimeter
- **IRSA**: NASA/IPAC Infrared Science Archive

### Space Observatories
- **MAST**: Barbara A. Mikulski Archive for Space Telescopes
- **ESASky**: Multi-mission all-sky archive

### Solar System
- **JPL Horizons**: Solar system body ephemerides and state vectors
- **JPL SBDB**: Small-Body Database for asteroids and comets

### Exoplanets & Stars
- **Exoplanet**: NASA Exoplanet Archive
- **AAVSO**: Variable Star Index (VSX catalog)
- **NIST**: Atomic Spectra Database for spectral lines

### Optical Surveys
- **Gaia**: Gaia DR3 catalog cone search and ADQL queries
- **SDSS**: Sloan Digital Sky Survey (DR18)
- **Splatalogue**: Spectral line database

### Total: 17 databases, 30+ tools

---

## Installation 🛠️

### Quick Start

**Prerequisites:**
- Node.js ≥ 18.0.0

**No Python dependency required** - aqc-mcp uses direct HTTP/TAP APIs to astronomical services.

### MCP Server Configuration

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aqc-mcp": {
      "command": "npx",
      "args": ["-y", "aqc-mcp"],
      "env": {
        "ADS_API_KEY": "your-ads-api-token-here"
      }
    }
  }
}
```

**Without ADS token:**
```json
{
  "mcpServers": {
    "aqc-mcp": {
      "command": "npx",
      "args": ["-y", "aqc-mcp"]
    }
  }
}
```

Get ADS token: https://ui.adsabs.harvard.edu/user/settings/token

### Alternative: Global Install

```bash
npm install -g aqc-mcp
```

Then use in config:
```json
{
  "mcpServers": {
    "aqc-mcp": {
      "command": "aqc-mcp"
    }
  }
}
```

---

## Usage 🚀

### 1. Start Server

#### HTTP Mode (default)

```bash
npm start
# or
npm run dev
```

Server will start on `http://localhost:3000`

#### With ADS API Token

```bash
ADS_API_KEY="your-token" npm start
```

#### Custom Port

```bash
PORT=8080 npm start
```

#### SSE Mode

```bash
MCP_TRANSPORT=http npm start
```

#### Stdio Mode (for Claude Desktop)

```bash
MCP_TRANSPORT=stdio npm run dev
```

---

### 2. API Endpoints

#### Health Check

```bash
curl http://localhost:3000/health
```

#### Server Info

```bash
curl http://localhost:3000/
```

#### SSE Connection

```bash
curl http://localhost:3000/sse
```

---

## MCP Tools 🔧

### simbad_query

Query SIMBAD astronomical database.

**Parameters:**
- `object_name` (string, required): Object name (e.g., "M31", "NGC 1234")
- `lang` (string, optional): Output language ("en", "zh", "ja")

**Example:**

```json
{
  "name": "simbad_query",
  "arguments": {
    "object_name": "M31",
    "lang": "en"
  }
}
```

---

### vizier_query

Query VizieR catalog database.

**Parameters:**
- `target` (string, required): Target name or coordinates
- `radius` (string, required): Search radius (e.g., "10arcsec", "0.5deg")
- `catalog` (string, optional): Specific catalog name
- `lang` (string, optional): Output language

**Example:**

```json
{
  "name": "vizier_query",
  "arguments": {
    "target": "M31",
    "radius": "10arcsec",
    "catalog": "I/345/gaia2"
  }
}
```

---

### alma_query

Query ALMA observations archive.

**Parameters:**
- `object_name` (string, required): Object name
- `lang` (string, optional): Output language

**Example:**

```json
{
  "name": "alma_query",
  "arguments": {
    "object_name": "Orion KL"
  }
}
```

---

### ads_query

Query NASA Astrophysics Data System.

**Parameters:**
- `query` (string, optional): Search query string
- `latest` (boolean, optional): Get latest papers
- `review` (boolean, optional): Get review articles only
- `lang` (string, optional): Output language

**Requirements:**
- Set `ADS_API_KEY` environment variable before starting the server

**Example:**

```json
{
  "name": "ads_query",
  "arguments": {
    "latest": true,
    "lang": "en"
  }
}
```

---

### gaia_cone_search

Query Gaia archive via cone search.

**Parameters:**
- `target` (string, required): Target name or coordinates
- `radius` (string, optional): Search radius (default: "10arcsec")
- `lang` (string, optional): Output language

**Example:**

```json
{
  "name": "gaia_cone_search",
  "arguments": {
    "target": "M31",
    "radius": "1arcmin"
  }
}
```

---

## HTTP API Examples 📡

### Call a Single Tool

```bash
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "simbad_query",
    "arguments": {
      "object_name": "M31"
    }
  }'
```

### Batch Call Multiple Tools

```bash
curl -X POST http://localhost:3000/tools/batch \
  -H "Content-Type: application/json" \
  -d '{
    "tools": [
      {
        "name": "simbad_query",
        "arguments": {"object_name": "M31"}
      },
      {
        "name": "gaia_cone_search",
        "arguments": {"target": "M31", "radius": "10arcsec"}
      }
    ]
  }'
```

---

## Claude Desktop Integration 🖥️

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "astroquery": {
      "command": "node",
      "args": ["/path/to/astroquery-cli/astroquery-mcp/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "ADS_API_KEY": "your-ads-api-token-here"
      }
    }
  }
}
```

---

## Development 🔨

### Watch Mode

```bash
npm run watch
```

### Project Structure

```
aqc-mcp/
├── src/
│   ├── index.ts           # Main server entry
│   ├── tools/             # MCP tool definitions (17 databases)
│   │   ├── index.ts       # Tool registration
│   │   ├── simbad.ts      # SIMBAD queries
│   │   ├── vizier.ts      # VizieR catalog queries
│   │   ├── alma.ts        # ALMA archive queries
│   │   ├── ads.ts         # ADS bibliographic queries
│   │   ├── gaia.ts        # Gaia DR3 queries
│   │   ├── aavso.ts       # AAVSO VSX variable stars
│   │   ├── fermi.ts       # Fermi LAT gamma-ray sources
│   │   ├── heasarc.ts     # HEASARC queries
│   │   ├── esasky.ts      # ESASky multi-mission archive
│   │   ├── eso.ts         # ESO science archive
│   │   ├── exoplanet.ts   # NASA Exoplanet Archive
│   │   ├── irsa.ts        # IRSA infrared archive
│   │   ├── jpl.ts         # JPL Horizons & SBDB
│   │   ├── mast.ts        # MAST space telescopes
│   │   ├── ned.ts         # NED extragalactic DB
│   │   ├── nist.ts        # NIST atomic spectra
│   │   ├── sdss.ts        # SDSS optical survey
│   │   └── splatalogue.ts # Spectral line database
│   └── utils/
│       └── http.ts        # HTTP/TAP client utilities
├── dist/                  # Compiled JavaScript
├── package.json
└── tsconfig.json
```

---

## Environment Variables 🔧

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_TRANSPORT` | Transport mode (`http`, `stdio`) | `stdio` | No |
| `PORT` | HTTP server port | `3000` | No |
| `ADS_API_KEY` | NASA ADS API token | - | For ADS queries |

---

## Troubleshooting 🔍

### ADS queries fail

Set the `ADS_API_KEY` environment variable:

```bash
export ADS_API_KEY="your-token"
npm start
```

### Port already in use

Change the port:

```bash
PORT=8080 npm start
```

### Query timeouts

Some astronomical databases (e.g., Fermi LAT, HEASARC) may take longer to respond. The server uses reasonable timeout values, but you can adjust them if needed by modifying the `timeout` parameter in the HTTP client.

---

## License 📄

BSD-3-Clause

---

## Contributing 🤝

Contributions welcome! Please open an issue or PR.

---

## Links 🔗

- [GitHub Repository](https://github.com/inoribea/aqc-mcp)
- [MCP Specification](https://modelcontextprotocol.io/)
- [NASA ADS API](https://ui.adsabs.harvard.edu/)
