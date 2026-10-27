# Publishing To npm

The package name is `connected-workspace-mcp`. Confirm availability directly
against npmjs immediately before publishing. A previously published
name/version cannot be reused; choose a new version for each release.

## Before The First Publish

1. Confirm the GitHub repository URL in `package.json` is public and correct.
2. Confirm `.env` contains no values that should be copied into documentation.
3. Rotate any credentials that have been shared outside your password manager.
4. Add an `NPM_AUTH_TOKEN` repository secret with permission to publish the
   package.

## Configure The Publishing Secret

Create an npm granular access token scoped to `connected-workspace-mcp` with
read/write package permission and **Bypass 2FA** enabled for CI publishing.
Set an appropriate expiry and rotate the secret before it expires.

In GitHub, open **Settings > Secrets and variables > Actions > New repository
secret**, name it **`NPM_AUTH_TOKEN`**, and paste the token into the secret value.
Alternatively, run this command and enter the token at its hidden prompt:

```powershell
gh secret set NPM_AUTH_TOKEN --repo deepakkamboj/connected-workspace-mcp
```

Never supply a token as a command-line argument or commit it to an environment
template. The workflow exposes it as `NODE_AUTH_TOKEN` only to the secret check,
npm authentication, and publish steps. GitHub supplies the separate OIDC
permission needed for npm provenance.

## Validate

```powershell
npm run format:check
npm test
npm run check
npm run build
npm audit --audit-level=high
npm pack --dry-run
npm run test:package
```

The tarball should include only compiled `dist` files, documentation,
`examples/USAGE.md`, minimal `.env.example` templates, and top-level package metadata. It must not include `.env`,
tests, source files, tokens, logs, or coverage output.

`test:package` packs the build, checks the file allowlist and executable
shebangs, installs the tarball into a temporary consumer project with only
production dependencies, and verifies OAuth state rejection plus MCP
initialization and all 42 tools. It uses fake credentials and never calls live
providers. It does require access to the configured npm registry for dependency
installation. The temporary installation is removed afterward.

The check also launches the package through `npm exec` with an empty dedicated
cache and verifies its initialize handshake and all 42 tools. After publishing,
the workflow runs `npm run test:published` to download the actual published
version and repeat the installed-package and fresh-cache npm execution checks.
This tests npm-only consumption, not a local repository entry point.

The lockfile intentionally omits registry-specific `resolved` URLs so `npm ci`
uses the consumer's configured registry with locked versions and integrity
hashes, rather than requiring the maintainer's package mirror.

## Publish

The recommended release path is to create a GitHub Release with a tag matching
`v<version>`, for example `v1.0.1`. Commit the matching version in `package.json`
and `package-lock.json` first; the workflow does not silently rewrite it.
The release workflow validates the version, checks the installed package and
dependencies, authenticates using `NPM_AUTH_TOKEN`, publishes publicly with npm
provenance to the `latest` tag, and verifies that the version is visible on npm.
The tag must identify an unpublished stable version. GitHub prereleases are
skipped, and concurrent npm publishing runs are serialized.

After pushing the release commit, create a release targeting that commit:

```powershell
gh release create v1.0.1 --repo deepakkamboj/connected-workspace-mcp --target YOUR_RELEASE_COMMIT --title "Release v1.0.1" --generate-notes
```

Alternatively, use **Actions > Release and Publish > Run workflow**, choose
the branch or tag containing the release commit, and enter `1.0.1`. Once the
workflow with its manual trigger is on the default branch, you can also use:

```powershell
gh workflow run publish.yml --repo deepakkamboj/connected-workspace-mcp --ref YOUR_RELEASE_BRANCH -f version=1.0.1
```

Both paths require a valid existing secret and an unused version matching the
selected commit. A registry outage fails the availability check rather than
being mistaken for an unpublished version.

### npm Processing Delays

npm may accept a publish before making the version visible. The workflow waits
up to ten minutes for a 404 response to become a visible package version.
Other registry errors fail explicitly.

If npm accepted the publish but verification timed out, do not publish the
same version again. Run the workflow with **verify_only** enabled; it checks
visibility without using the npm secret or rerunning publish:

```powershell
gh workflow run publish.yml --repo deepakkamboj/connected-workspace-mcp --ref YOUR_RELEASE_BRANCH -f version=1.0.1 -f verify_only=true
```

For a manual release:

```powershell
npm login --registry=https://registry.npmjs.org/
npm publish
```

The package uses public access and the official npm registry through
`publishConfig`. The `prepack` script automatically checks formatting, runs all
tests, and rebuilds before a tarball or publish is created.
`prepublishOnly` additionally runs the isolated consumer package check.

For later releases, update the version first:

```powershell
npm version patch
npm publish
```

Use `minor` or `major` instead when the change warrants it.

## Rollback

An npm version cannot be overwritten. If a release is broken, deprecate it
with a clear message and tell consumers to pin the last known-good version:

```powershell
npm deprecate connected-workspace-mcp@BAD_VERSION "Use LAST_GOOD_VERSION while this release is repaired."
```

Publish a corrected version afterward. Do not delete user token stores during
rollback. No token-store migration is introduced by the additional Google tools;
users with older grants must reauthorize to approve the new scopes.
