# Configuration

## Storage

```dotenv
PA_MCP_TOKEN_PATH=C:/Users/you/.connected-workspace-mcp/tokens.json
PA_MCP_LOG_PATH=C:/Users/you/.connected-workspace-mcp/server.log
```

When these are omitted, the current defaults remain
`%USERPROFILE%/.pa-mcp/tokens.json` and `pa-mcp.log` beside it for backward
compatibility.

The token file contains sensitive OAuth credentials. Restrict access to your
user account, never commit it, and do not include it in support requests.

Logs are JSON Lines, rotate at 5 MB, and retain one rotated file. The logger
redacts common credential forms and never records tool arguments.

## Google

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000
```

`GOOGLE_REFRESH_TOKEN` is supported only as a legacy fallback. New
authorizations write the token store.

## LinkedIn

```dotenv
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3001/callback
LINKEDIN_API_VERSION=202609
```

`LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_USER_URN` are legacy fallbacks. The OAuth
command persists both values in the token store.

## Loading Rules

All three executables accept either `--env-file <path>` or
`--env-file=<path>`. This is the recommended approach for `npx`, because its
working directory depends on the MCP host:

```powershell
npx -y connected-workspace-mcp --env-file "C:\Users\you\.connected-workspace-mcp\.env"
```

Without this argument, the process loads `.env` from its current working
directory. Values already in the process environment take precedence over the
file. Provider tokens are loaded from the token store before legacy token
environment values.

Pass only the file path in command arguments. Credentials supplied directly on
the command line can be exposed by process inspection.
