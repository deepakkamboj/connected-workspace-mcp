# Project Instructions

- This is a TypeScript stdio MCP server using the official `@modelcontextprotocol/server` v2 SDK.
- Keep provider authorization under `src/auth/<provider>/`.
- Keep integration tools under `src/tools/<integration>/`; `src/index.ts` only wires clients and registrars.
- Gmail and Calendar share the Google OAuth client in `src/auth/google/index.ts`.
- Follow https://ts.sdk.modelcontextprotocol.io/v2/ and https://modelcontextprotocol.io/docs.
- Never log access tokens, refresh tokens, client secrets, or complete email bodies.
