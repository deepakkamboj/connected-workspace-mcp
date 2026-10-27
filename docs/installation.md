# Installation And MCP Setup

## Requirements

- Node.js 20 or newer
- An MCP-compatible host such as VS Code
- Google Cloud OAuth credentials
- Optional LinkedIn developer application credentials

## Install From npm

Install globally when you want stable command names:

```powershell
npm install --global connected-workspace-mcp
```

Available commands:

```text
connected-workspace-mcp
connected-workspace-google-auth
connected-workspace-linkedin-auth
```

You can also run the server without a global installation:

```powershell
npx -y connected-workspace-mcp --env-file "C:\Users\you\.connected-workspace-mcp\.env"
```

## Configure The Environment

See [examples/USAGE.md](../examples/USAGE.md) for a complete walkthrough and
[examples/.env.example](../examples/.env.example) for the minimal template.

Create a private configuration directory, copy `.env.example` from the package
or repository, and populate the provider client settings. Pass its path with
`--env-file` when the current working directory does not contain `.env`.

Only Google client credentials are required to start the server after OAuth
authorization. LinkedIn client credentials are needed only for its optional
authorization. Tokens and logs default to your user profile; no path overrides
or token environment values are required. See [configuration.md](configuration.md)
for optional settings.

## VS Code MCP Configuration

For an npm-installed server, add a server entry equivalent to:

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

Alternatively, set provider values in the MCP host's `env` configuration. Never
place secrets directly in `args`, where process inspection may expose them.
Restart the MCP server after changing configuration or authorization.

## Local Development

```powershell
npm install
Copy-Item .env.example .env
npm run auth:google
npm run auth:linkedin
npm run build
npm start
```

The repository includes `.vscode/mcp.json` for running the compiled local
server.
