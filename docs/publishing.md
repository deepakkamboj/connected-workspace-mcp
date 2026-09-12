# Publishing To npm

The package name is `connected-workspace-mcp`. Confirm availability directly
against npmjs immediately before the first publish.

## Before The First Publish

1. Confirm the GitHub repository URL in `package.json` is public and correct.
2. Confirm `.env` contains no values that should be copied into documentation.
3. Rotate any credentials that have been shared outside your password manager.
4. Add an `NPM_AUTH_TOKEN` repository secret with permission to publish the
   package.

## Validate

```powershell
npm run format:check
npm test
npm run check
npm run build
npm pack --dry-run
```

The tarball should include only compiled `dist` files, documentation,
`.env.example`, and top-level package metadata. It must not include `.env`,
tests, source files, tokens, logs, or coverage output.

## Publish

The recommended release path is to create a GitHub Release with a tag matching
`v<version>`, for example `v1.0.0`. The release workflow validates the project,
sets the package version from the tag, and publishes with npm provenance.

For a manual release:

```powershell
npm login --registry=https://registry.npmjs.org/
npm publish
```

The package uses public access and the official npm registry through
`publishConfig`. The `prepack` script automatically checks formatting, runs all
tests, and rebuilds before a tarball or publish is created.

For later releases, update the version first:

```powershell
npm version patch
npm publish
```

Use `minor` or `major` instead when the change warrants it.
