import { google } from 'googleapis';
import { loadGoogleTokens } from '../token-store.js';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/calendar',
];

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `${name} is required. Copy .env.example to .env and run npm run auth:google.`,
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
    throw new Error('Google is not authorized. Run npm run auth:google once.');
  auth.setCredentials({
    access_token: storedTokens?.accessToken,
    refresh_token: refreshToken,
    expiry_date: storedTokens?.expiryDate,
  });
  return auth;
}
