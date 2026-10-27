# Using Connected Workspace MCP

Requires Node.js 20 or newer and an MCP host such as VS Code. This is a stdio
server, not an HTTP service or a library to import into your application.

## 1. Create A Private Environment File

From a clone of this repository:

```powershell
$configDir = Join-Path $HOME ".connected-workspace-mcp"
New-Item -ItemType Directory -Force $configDir | Out-Null
Copy-Item .\examples\.env.example (Join-Path $configDir ".env")
```

If you only installed the npm package, create the private file yourself using
the same template:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Optional: only needed to authorize LinkedIn.
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

Fill in your Google OAuth Desktop app credentials. See the
[Google setup guide](../docs/google-auth.md) for the APIs and permissions to
enable. Leave the LinkedIn settings blank unless you want LinkedIn tools.

No token, storage path, redirect URI, or API-version environment variables are
required. OAuth commands save reusable tokens automatically. Default callbacks:

- Google: `http://localhost:3000`
- LinkedIn: `http://localhost:3001/callback`

Keep this file private and outside the npm installation directory. Never commit
it or paste its contents into a chat.

## 2. Authorize Your Accounts

Install globally:

```powershell
npm install --global connected-workspace-mcp@1.0.2
connected-workspace-google-auth --env-file "$HOME\.connected-workspace-mcp\.env"
# Optional, after completing the LinkedIn app setup:
connected-workspace-linkedin-auth --env-file "$HOME\.connected-workspace-mcp\.env"
```

Open the URL printed by each command and approve the requested permissions.
Run the authorization commands one at a time. Google authorization is required
to start the server; LinkedIn authorization is optional.

Alternatively, use `npm exec` without installing globally. Use `--package`
explicitly to select the package's authorization executables:

```powershell
npm exec --yes --package=connected-workspace-mcp@1.0.2 -- connected-workspace-google-auth --env-file "$HOME\.connected-workspace-mcp\.env"
npm exec --yes --package=connected-workspace-mcp@1.0.2 -- connected-workspace-linkedin-auth --env-file "$HOME\.connected-workspace-mcp\.env"
```

## 3. Configure VS Code

Add this to your workspace's `.vscode/mcp.json`, replacing `you` with your
Windows account name:

```json
{
  "servers": {
    "connected-workspace": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "connected-workspace-mcp@1.0.2",
        "--env-file",
        "C:\\Users\\you\\.connected-workspace-mcp\\.env"
      ]
    }
  }
}
```

For a global installation, you can instead set `"command"` to
`"connected-workspace-mcp"` and `"args"` to `["--env-file", "C:\\Users\\you\\.connected-workspace-mcp\\.env"]`.
If a Windows host cannot launch `npx`, use `npx.cmd`.

For hosts using the `mcpServers` convention, use the same `command` and `args`
inside `"mcpServers": { "connected-workspace": { ... } }` and omit `"type"`.
On macOS or Linux, use an absolute path such as
`/Users/you/.connected-workspace-mcp/.env` in `args`.

Start the server through your MCP host and inspect its tool list. Running the
command directly in a terminal waits for MCP JSON-RPC input; it is not an
interactive command prompt. For reproducible deployments, pin a published
version in the package argument, for example `connected-workspace-mcp@1.0.2`.

### Windows Add MCP Server Form

No source checkout, build, or local JavaScript entry point is required:

| Field                 | Value                                             |
| --------------------- | ------------------------------------------------- |
| Server name           | `connected-workspace`                             |
| Server type           | Local                                             |
| Command               | `npx.cmd`                                         |
| Timeout               | 120 seconds                                       |
| Environment variables | Empty; the private environment file supplies them |

For an environment file at `D:\environment-file\.env`, paste this JSON array
into the Arguments field:

```json
[
  "-y",
  "connected-workspace-mcp@1.0.2",
  "--env-file",
  "D:\\environment-file\\.env"
]
```

In a space-separated Arguments field, use single backslashes instead:

```text
-y connected-workspace-mcp@1.0.2 --env-file "D:\environment-file\.env"
```

The host runs the npm-installed command locally; the repository is not used.
The host must run under the same Windows account that completed authorization.
If your npm mirror does not yet list the version, see
[registry and cache troubleshooting](../docs/troubleshooting.md#npm-installation-and-cache-errors).

## 4. Try Read-Only Requests

Ask your assistant to use the corresponding tool:

| Request                    | Tool                   | Example arguments                                                     |
| -------------------------- | ---------------------- | --------------------------------------------------------------------- |
| Find unread email          | `gmail_search`         | `{"query":"in:inbox is:unread","maxResults":5}`                       |
| List calendar events       | `calendar_list_events` | `{"timeMin":"2026-11-01T00:00:00Z","timeMax":"2026-11-08T00:00:00Z"}` |
| Read spreadsheet cells     | `sheets_read_range`    | `{"spreadsheetId":"YOUR_SPREADSHEET_ID","range":"Sheet1!A1:C10"}`     |
| Find Drive files           | `drive_search_files`   | `{"query":"trashed = false","pageSize":10}`                           |
| Find a contact             | `contacts_search`      | `{"query":"Alex","pageSize":5}`                                       |
| List tasks                 | `tasks_list`           | `{"taskListId":"@default","maxResults":10}`                           |
| Read your LinkedIn profile | `linkedin_get_profile` | `{}`                                                                  |

Google integrations share one authorization. LinkedIn tools require a separate
authorization and approved API products; post reads and analytics can require
additional access beyond basic sharing permissions.

## Write Safety And Troubleshooting

Require host confirmation before sending email, changing Google data, sharing
files, or publishing/deleting posts. Write tools act on real accounts.

Tokens default to `$HOME\.pa-mcp\tokens.json` and logs to
`$HOME\.pa-mcp\pa-mcp.log`. Keep these private. See
[configuration](../docs/configuration.md) for optional overrides and legacy
compatibility, the [tool reference](../docs/tools.md) for all tools, and
[troubleshooting](../docs/troubleshooting.md) for authorization failures.
