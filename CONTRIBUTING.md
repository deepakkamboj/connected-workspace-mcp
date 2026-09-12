# Contributing

Contributions to Connected Workspace MCP are welcome. Bug reports, focused
feature proposals, documentation improvements, and pull requests are all
useful.

## Development Setup

1. Fork and clone the repository.
2. Install Node.js 20 or newer.
3. Install dependencies with `npm ci`.
4. Copy `.env.example` to `.env` only when live local testing is necessary.
5. Build with `npm run build`.

Do not commit `.env`, OAuth tokens, logs, email content, or LinkedIn post data.
Use mocked provider clients in automated tests.

## Making Changes

- Keep provider authorization under `src/auth/<provider>/`.
- Keep integration tools under `src/tools/<integration>/`.
- Keep `src/index.ts` limited to client construction and tool registration.
- Preserve the shared Google OAuth client used by Gmail and Calendar.
- Add or update focused Jest coverage for behavior changes.
- Avoid unrelated formatting or refactoring in the same pull request.

## Validate

Run the same checks used by pull-request automation:

```powershell
npm run format:check
npm test
npm run check
npm run build
```

Tests must not contact live providers or mutate real accounts.

## Pull Requests

Describe the user-visible behavior, note any provider permissions or API
products required, and include the validation performed. Link related issues
and call out breaking changes explicitly.

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
