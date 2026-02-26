# Astroquery MCP Server 🚀

A Model Context Protocol (MCP) server for astroquery-cli, providing HTTP and SSE (Server-Sent Events) transport options.

---

## Overview ✨

The astroquery-mcp server exposes astroquery CLI functionality as MCP tools, allowing AI applications and other services to query astronomical databases through standardized MCP protocols. Supports both HTTP and SSE transports.

---

## Features 🌟

- ⚡ **MCP Protocol**: Full implementation of MCP specification
- 🌐 **Multiple Transports**:
  - HTTP (default)
  - SSE (Server-Sent Events)
  - Stdio (for Claude Desktop)
- 🔌 **Extensible**: Easy to add new tools and modules
- 🌍 **Language Support**: Multi-language output (English, Chinese, Japanese)
- 📊 **Rich Output**: Formatted tables and structured results
- 🔑 **ADS API Token Support**: Environment variable injection for authenticated queries

---

## Supported Modules 🧩

Currently implemented tools:

- **SIMBAD**: Query SIMBAD astronomical database
- **VizieR**: Query VizieR catalog database
- **ALMA**: Query ALMA observations archive
- **ADS**: NASA Astrophysics Data System queries (requires API token)
- **Gaia**: Gaia archive cone search

> ⚠️ More modules (ESASky, IRSA, Heasarc, JPL, MAST, NED, NIST, Exoplanet, SDSS, ESO, Splatalogue) coming soon!

---

## Installation 🛠️

### Quick Start

**Prerequisites:**
- Python ≥ 3.11
- Node.js ≥ 18.0.0

**Install Python CLI:**
```bash
pip install astroquery-cli
```

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
astroquery-mcp/
├── src/
│   ├── index.ts           # Main server entry
│   ├── tools/             # MCP tool definitions
│   │   ├── index.ts       # Tool registration
│   │   ├── simbad.ts
│   │   ├── vizier.ts
│   │   ├── alma.ts
│   │   ├── ads.ts
│   │   └── gaia.ts
│   └── utils/
│       └── executor.ts    # CLI command executor
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

### "aqc: command not found"

Make sure you're running the MCP server from within the `astroquery-mcp` directory, and that the parent `astroquery-cli` project has been installed via poetry.

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

---

## License 📄

BSD-3-Clause

---

## Contributing 🤝

Contributions welcome! Please open an issue or PR.

---

## Links 🔗

- [astroquery-cli](../README.md)
- [MCP Specification](https://modelcontextprotocol.io/)
- [NASA ADS API](https://ui.adsabs.harvard.edu/)
