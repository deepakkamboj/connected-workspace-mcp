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
LINKEDIN_REDIRECT_URI=http://localhost:3001/callback
LINKEDIN_API_VERSION=202609
```

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

The callback validates OAuth state, exchanges the authorization code, reads the
OpenID member identifier, and persists the token with its expiry metadata.

## API Limitations

Standard LinkedIn member APIs can read basic OpenID identity information and
manage posts when the app has approved products and scopes. They do not permit
arbitrary edits to headline, experience, education, or skills. Messaging and
some analytics require partner-only access.

LinkedIn access tokens expire. If LinkedIn does not grant your application a
refresh token, rerun authorization after expiry.

See [Authentication troubleshooting](troubleshooting.md) for product approval,
redirect URI, and `401 Unauthorized` checks.
