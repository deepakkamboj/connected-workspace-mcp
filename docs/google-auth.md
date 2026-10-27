# Google OAuth Setup

Gmail, Calendar, Sheets, Drive, Contacts, and Tasks share one OAuth client and
one refresh token.

## Create The Google Client

1. Open https://console.cloud.google.com/ and select a project.
2. Enable **Gmail API**, **Google Calendar API**, **Google Sheets API**,
   **Google Drive API**, **People API**, and **Google Tasks API**.
3. Configure the Google Auth Platform consent screen.
4. Add your Google account as a test user if the app remains in testing mode.
5. Create an OAuth client of type **Desktop app**.
6. Save the client ID and create a client secret.

Configure:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

The default redirect URI is `http://localhost:3000`. Set
`GOOGLE_REDIRECT_URI` only if you need a different local callback.

## Required Scopes

```text
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/contacts
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/tasks
```

## Authorize

From a source checkout:

```powershell
npm run auth:google
```

After a global npm installation:

```powershell
connected-workspace-google-auth
```

Pass `--env-file <path>` to the installed command if the private environment
file is not in the current directory.

Open the printed URL and approve every Google permission. The flow validates
OAuth state,
rejects partial grants and saves credentials only after all required scopes are
returned.

Existing Gmail/Calendar-only grants must be authorized again to add the
Sheets, Drive, Contacts, and Tasks scopes. Gmail and Drive scopes can require
Google verification when distributing an OAuth application to other users;
publishing this npm package does not grant that approval.

## Verify

The server automatically refreshes Google access tokens. A successful setup
allows `gmail_search` and `calendar_list_events` to run without another browser
login.

If Google returns `invalid_grant`, confirm the client ID and secret belong to
the same OAuth client, revoke the old grant, and authorize again. Testing-mode
Google refresh tokens may expire after seven days.

See [Authentication troubleshooting](troubleshooting.md) for detailed provider
console checks and reauthorization steps.
