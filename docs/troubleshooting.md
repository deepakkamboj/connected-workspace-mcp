# Authentication Troubleshooting

Never include client secrets, access tokens, refresh tokens, complete email
bodies, or complete logs in issues or support requests.

## Google `invalid_grant`

In Google Cloud Console, verify that Gmail API and Google Calendar API are
enabled and that the OAuth client configured in `.env` is a Desktop app. The
client ID and secret must belong to the same client, and the redirect URI must
be exactly:

```text
http://localhost:3000
```

If the consent screen is in testing mode, add the account under **Test users**.
Testing-mode refresh tokens may expire after seven days. Confirm that all four
required scopes in the [Google setup guide](google-auth.md) are approved.

Common causes include a revoked or expired refresh token, credentials from a
different OAuth client, a changed account password, too many issued refresh
tokens, a redirect mismatch, or an incorrect system clock. Remove the old app
grant at https://myaccount.google.com/connections and authorize again when
needed.

## LinkedIn `401 Unauthorized`

In LinkedIn Developer Console, verify that the app is active, associated with a
verified LinkedIn Page, and has active access to both **Sign In with LinkedIn
using OpenID Connect** and **Share on LinkedIn**. Requested products are not
usable until LinkedIn approves them.

Confirm the client ID, client secret, required scopes, and this exact redirect:

```text
http://localhost:3001/callback
```

A 401 commonly means the access token expired, was revoked, belongs to another
app, or lacks an approved product or scope. Standard apps may not receive
refresh tokens, so reauthorization after expiry can be expected.

## Reauthorize And Restart

From a source checkout:

```powershell
npm run auth:google
npm run auth:linkedin
npm run build
```

For a global npm installation, use
`connected-workspace-google-auth` or
`connected-workspace-linkedin-auth`. Restart the MCP server afterward so it
reloads the token store.

Run `npm run test:auth` to validate local token persistence and client
construction. Passing mocked tests does not prove that a live provider accepts
a token.
