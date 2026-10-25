# LinkedIn OAuth Setup

## Create The LinkedIn Application

1. Open https://www.linkedin.com/developers/apps and create or select an app.
2. Associate and verify the appropriate LinkedIn Page.
3. Enable **Sign In with LinkedIn using OpenID Connect**.
4. Enable **Share on LinkedIn**.
5. Add this exact authorized redirect URL:

```text
http://localhost:3001/callback
```

Configure:

```dotenv
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
```

The redirect URI and API version default to `http://localhost:3001/callback`
and `202609`; they do not need environment entries unless overriding them.

## Required Scopes

```text
openid
profile
email
w_member_social
```

## Authorize

From a source checkout:

```powershell
npm run auth:linkedin
```

After a global npm installation:

```powershell
connected-workspace-linkedin-auth
```

Add `--env-file <path>` when using a private environment file outside the
current directory.

The callback validates OAuth state, exchanges the authorization code, reads the
OpenID member identifier, and persists the token with its expiry metadata.

## API Limitations

Standard LinkedIn member APIs can read basic OpenID identity information and
manage posts when the app has approved products and scopes. They do not permit
arbitrary edits to headline, experience, education, or skills. Messaging and
some analytics require partner-only access.

Listing and reading member posts generally require `r_member_social`, which is
restricted; `w_member_social` alone does not grant those read operations.
Post engagement also depends on approved API products and permissions. The
server exposes these tools but cannot grant access to restricted endpoints.

LinkedIn access tokens expire. If LinkedIn does not grant your application a
refresh token, rerun authorization after expiry.

See [Authentication troubleshooting](troubleshooting.md) for product approval,
redirect URI, and `401 Unauthorized` checks.
