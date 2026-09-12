# Connected Workspace MCP Documentation

Connected Workspace MCP connects MCP-compatible assistants to Gmail, Google
Calendar, and LinkedIn through a TypeScript stdio server.

## Guides

- [Installation and MCP host setup](installation.md)
- [Google OAuth setup](google-auth.md)
- [LinkedIn OAuth setup](linkedin-auth.md)
- [Configuration, tokens, and logs](configuration.md)
- [Tool reference](tools.md)
- [Authentication troubleshooting](troubleshooting.md)
- [Publishing to npm](publishing.md)

## Security Model

- OAuth client settings are read from environment variables or a local `.env`.
- Reusable provider tokens are stored outside the package directory.
- Tool arguments, email bodies, post text, and credentials are excluded from
  logs.
- Write operations are exposed as explicit MCP tools so the host can request
  confirmation according to its own policy.

Never commit `.env`, token files, or log files.
