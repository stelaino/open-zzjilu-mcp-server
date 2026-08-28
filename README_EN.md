# open-zzjilu-mcp-server

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-8A2BE2)](https://modelcontextprotocol.io/)

[中文文档](./README.md)

An unofficial MCP Server built on the Zhizai Jilu (智在记录) Open API, enabling AI Agents to read from and write to a personal note-based knowledge base.

> **Disclaimer**: This is a personal open-source project and is not affiliated with the official Zhizai Jilu product. "智在记录" and related trademarks belong to Whale Cloud Technology Co., Ltd.

---

## Features

Provides 9 MCP tools:

| Tool | Description |
|------|-------------|
| `search_notes` | Search notes by topic, time range, and type |
| `get_note` | Read full note content |
| `get_note_status` | Query asynchronous processing status |
| `create_note` | Create text or link notes |
| `update_note` | Update note title / abstract / summary * |
| `list_scenes` | List available scene templates |
| `list_knowledge_collections` | Browse personal and shared note collections |
| `get_knowledge_collection` | Read collection details |
| `list_knowledge_cards` | List knowledge cards |

> \* The `update_note` tool relies on the `updateNote` API, which is documented but not yet available. The tool code is in place and will work automatically once the API is opened.

---

## Quick Start

### Prerequisites

- **Node.js** >= 20 LTS (required by MCP SDK v2)
- **Zhizai Jilu API Key**: Obtain from the [Developer Center](https://zzjilu.com/pc/developer)

### Installation

**Option 1: Use with npx (Recommended)**

No installation needed, use directly via npx in your MCP client config:

```bash
npx -y github:stelaino/open-zzjilu-mcp-server
```

**Option 2: Build Locally**

```bash
git clone https://github.com/stelaino/open-zzjilu-mcp-server.git
cd open-zzjilu-mcp-server
npm install && npm run build
```

---

## MCP Client Configuration

### Cursor

Edit `~/.cursor/mcp.json` or project-level `.cursor/mcp.json`:

#### macOS / Linux

```json
{
  "mcpServers": {
    "zzjilu": {
      "command": "npx",
      "args": ["--yes", "github:stelaino/open-zzjilu-mcp-server", "open-zzjilu-mcp-server"],
      "env": {
        "ZZJL_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

#### Windows

```json
{
  "mcpServers": {
    "zzjilu": {
      "command": "cmd",
      "args": ["/c", "npx", "--yes", "github:stelaino/open-zzjilu-mcp-server", "open-zzjilu-mcp-server"],
      "env": {
        "ZZJL_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

#### Local Build (Cross-platform)

```json
{
  "mcpServers": {
    "zzjilu": {
      "command": "node",
      "args": ["/absolute/path/to/open-zzjilu-mcp-server/dist/index.js"],
      "env": {
        "ZZJL_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

### Claude Desktop

Edit the configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zzjilu": {
      "command": "npx",
      "args": ["--yes", "github:stelaino/open-zzjilu-mcp-server", "open-zzjilu-mcp-server"],
      "env": {
        "ZZJL_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

> On Windows, if npx fails to start, change `command` to `cmd` and prepend `"/c", "npx"` to `args`.

### Claude Code (CLI)

```bash
claude mcp add zzjilu -- npx --yes github:stelaino/open-zzjilu-mcp-server open-zzjilu-mcp-server
```

### Other MCP Clients

Any MCP-compatible client supporting stdio transport (VS Code + Cline, Windsurf, etc.) can use the same configuration.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ZZJL_API_KEY` | **Yes** | — | Obtain from the [Developer Center](https://zzjilu.com/pc/developer) |
| `ZZJL_API_BASE_URL` | No | `https://openapi.zzjilu.com` | API base URL (HTTPS only) |
| `ZZJL_REQUEST_TIMEOUT_MS` | No | `10000` | Request timeout in milliseconds |
| `ZZJL_LOG_LEVEL` | No | `info` | debug / info / warn / error |

### Rate Limiting

The Zhizai Jilu API enforces a maximum of **2 requests per second**. The MCP Server includes a built-in token bucket rate limiter that automatically spaces requests at 500ms intervals — no additional configuration needed.

---

## AI Skill (Optional)

The project includes an AI Skill that provides precise tool orchestration guidance for AI agents.

### One-click Install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/stelaino/open-zzjilu-mcp-server/main/scripts/install-skill.sh)
```

### Manual Install

Copy `skills/open-zzjilu-mcp-workflow/` to your AI client's skills directory:

```bash
cp -r skills/open-zzjilu-mcp-workflow ~/.agents/skills/       # Universal (recommended)
cp -r skills/open-zzjilu-mcp-workflow ~/.cursor/skills/       # Cursor
cp -r skills/open-zzjilu-mcp-workflow ~/.claude/skills/        # Claude Code
```

---

## Project Structure

```
open-zzjilu-mcp-server/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── server.ts             # MCP Server registration + stdio transport
│   ├── config/env.ts         # Environment variable validation (Zod)
│   ├── api/                  # ApiRegistry + HTTP client (with rate limiting)
│   └── tools/                # 9 MCP tool implementations
├── skills/                   # AI Skill (optional)
├── scripts/                  # Utility scripts
├── tests/                    # Smoke tests
├── package.json
├── tsconfig.json
└── README.md
```

---

## Development

```bash
npm install                                                   # Install dependencies
npm run dev                                                   # Dev mode (watch)
npm run build                                                 # Build
npm test                                                      # Run tests
npx @modelcontextprotocol/inspector node dist/index.js        # MCP Inspector debugging
```

---

## Contributing

Issues and Pull Requests are welcome.

1. Fork the repository
2. Create your branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

[MIT](./LICENSE)
