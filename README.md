# Connected Workspace MCP

[![npm version](https://img.shields.io/npm/v/connected-workspace-mcp)](https://www.npmjs.com/package/connected-workspace-mcp)
[![CI](https://github.com/deepakkamboj/connected-workspace-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/deepakkamboj/connected-workspace-mcp/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-v2-0A7EA4)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

A TypeScript stdio MCP server for Gmail, Google Calendar, and LinkedIn. It gives
MCP-compatible assistants explicit tools for email, scheduling, professional
profile access, and social publishing.

Gmail and Calendar share one Google OAuth grant. LinkedIn uses a separate OAuth
grant. Both providers persist tokens outside the package directory so the
server can restart without repeated authorization.

## Install

Requires Node.js 20 or newer.

```powershell
npm install --global connected-workspace-mcp
```

Configure the provider credentials described in the auth guides, then run:

```powershell
connected-workspace-google-auth
connected-workspace-linkedin-auth
connected-workspace-mcp
```

With `npx`, keep credentials in a private file and pass only its path:

```powershell
npx -y connected-workspace-mcp --env-file "C:\Users\you\.connected-workspace-mcp\.env"
```

LinkedIn is optional. The server can run with only Google configured.

## MCP Host Configuration

```json
{
  "servers": {
    "connected-workspace": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "connected-workspace-mcp",
        "--env-file",
        "C:\\Users\\you\\.connected-workspace-mcp\\.env"
      ]
    }
  }
}
```

The process can instead inherit provider environment variables directly. Never
pass client secrets or tokens as command-line arguments.

## Documentation

- [Documentation index](docs/README.md)
- [Installation and MCP host setup](docs/installation.md)
- [Google OAuth setup](docs/google-auth.md)
- [LinkedIn OAuth setup](docs/linkedin-auth.md)
- [Configuration, token storage, and logs](docs/configuration.md)
- [Tool reference](docs/tools.md)
- [Authentication troubleshooting](docs/troubleshooting.md)
- [npm publishing guide](docs/publishing.md)

## Capabilities

Gmail tools search and read messages, send new messages, reply in threads, and
modify labels. Calendar tools list, create, update, and delete events, and query
free/busy periods. LinkedIn tools read the authenticated profile and posts,
inspect available engagement, publish text or image posts, and delete owned
posts.

Standard LinkedIn APIs do not support arbitrary edits to profile fields such as
headline, experience, or skills. Available endpoints depend on the products and
permissions approved for the LinkedIn app.

## Local Development

```powershell
npm install
Copy-Item .env.example .env
npm run auth:google
npm run auth:linkedin
npm run build
npm start
```

Run the deterministic mocked test suite and project checks with:

```powershell
npm test
npm run check
npm run format:check
```

Tests never contact live providers or mutate real accounts.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for project
structure, security requirements, validation commands, and pull-request
guidance.

## Security

Never commit `.env`, token files, or logs. The JSON-lines logger excludes tool
arguments, message bodies, post content, and credentials. Configure your MCP
host to require confirmation before write tools send email, modify calendars,
or publish and delete LinkedIn posts.

## License

Licensed under the [MIT License](LICENSE).
