import { google } from 'googleapis';
import { loadGoogleTokens } from '../token-store.js';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/tasks',
];

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `${name} is required. Configure your environment file and run connected-workspace-google-auth --env-file <path>.`,
    );
  return value;
}

export function createGoogleAuth() {
  const storedTokens = loadGoogleTokens();
  const auth = new google.auth.OAuth2(
    requiredEnv('GOOGLE_CLIENT_ID'),
    requiredEnv('GOOGLE_CLIENT_SECRET'),
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000',
  );
  const refreshToken =
    storedTokens?.refreshToken || process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken)
    throw new Error(
      'Google is not authorized. Run connected-workspace-google-auth --env-file <path> once.',
    );
  auth.setCredentials({
    access_token: storedTokens?.accessToken,
    refresh_token: refreshToken,
    expiry_date: storedTokens?.expiryDate,
  });
  return auth;
}
