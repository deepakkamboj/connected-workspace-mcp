#!/usr/bin/env node
import '../../config/bootstrap.js';
import { createServer } from 'node:http';
import { google } from 'googleapis';
import { saveGoogleTokens, TOKEN_STORE_PATH } from '../token-store.js';
import { logger } from '../../logging/logger.js';
import { GOOGLE_SCOPES } from './index.js';

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';

if (!clientId || !clientSecret) {
  throw new Error(
    'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.',
  );
}

const callback = new URL(redirectUri);
const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const authorizationUrl = auth.generateAuthUrl({
  access_type: 'offline',
  include_granted_scopes: true,
  prompt: 'consent',
  scope: GOOGLE_SCOPES,
});

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', redirectUri);
  if (requestUrl.pathname !== callback.pathname) {
    response.writeHead(404).end('Not found');
    return;
  }

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    response.writeHead(400).end('Google did not return an authorization code.');
    return;
  }

  try {
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        'No refresh token returned. Revoke existing app access and authorize again.',
      );
    }
    const grantedScopes = new Set(
      (tokens.scope || '').split(' ').filter(Boolean),
    );
    const missingScopes = GOOGLE_SCOPES.filter(
      (scope) => !grantedScopes.has(scope),
    );
    if (missingScopes.length > 0) {
      throw new Error(
        `Authorization was incomplete. Approve these missing scopes: ${missingScopes.join(', ')}`,
      );
    }
    await saveGoogleTokens({
      accessToken: tokens.access_token || undefined,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date || undefined,
    });
    response
      .writeHead(200, { 'Content-Type': 'text/plain' })
      .end('Google authorization complete. You can close this tab.');
    await logger.info('Google authorization completed', {
      tokenStore: TOKEN_STORE_PATH,
    });
    console.log(`Saved reusable Google credentials to ${TOKEN_STORE_PATH}.`);
  } catch (error) {
    response
      .writeHead(500)
      .end('Google authorization failed. Check the terminal.');
    await logger.error('Google authorization failed', error);
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(Number(callback.port || 80), callback.hostname, () => {
  console.log('Open this URL in your browser:');
  console.log(authorizationUrl);
});
