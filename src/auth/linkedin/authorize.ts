#!/usr/bin/env node
import '../../config/bootstrap.js';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { saveLinkedInTokens, TOKEN_STORE_PATH } from '../token-store.js';
import { logger } from '../../logging/logger.js';

const clientId = process.env.LINKEDIN_CLIENT_ID;
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
const redirectUri =
  process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/callback';

if (!clientId || !clientSecret) {
  throw new Error(
    'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env first.',
  );
}

const state = randomBytes(24).toString('hex');
const callback = new URL(redirectUri);
const authorizationUrl = new URL(
  'https://www.linkedin.com/oauth/v2/authorization',
);
authorizationUrl.search = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  state,
  scope: 'openid profile email w_member_social',
}).toString();

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', redirectUri);
  if (requestUrl.pathname !== callback.pathname) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (requestUrl.searchParams.get('state') !== state) {
    response.writeHead(400).end('Invalid OAuth state.');
    return;
  }

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    response
      .writeHead(400)
      .end('LinkedIn did not return an authorization code.');
    return;
  }

  try {
    const tokenResponse = await fetch(
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      },
    );
    const tokens = (await tokenResponse.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error_description?: string;
    };
    if (!tokenResponse.ok || !tokens.access_token) {
      throw new Error(
        tokens.error_description || 'LinkedIn token exchange failed.',
      );
    }

    const profileResponse = await fetch(
      'https://api.linkedin.com/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );
    const profile = (await profileResponse.json()) as { sub?: string };
    if (!profileResponse.ok || !profile.sub)
      throw new Error('LinkedIn profile lookup failed.');

    await saveLinkedInTokens({
      accessToken: tokens.access_token,
      userUrn: `urn:li:person:${profile.sub}`,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : undefined,
    });
    response
      .writeHead(200, { 'Content-Type': 'text/plain' })
      .end('LinkedIn authorization complete. You can close this tab.');
    await logger.info('LinkedIn authorization completed', {
      tokenStore: TOKEN_STORE_PATH,
    });
    console.log(`Saved reusable LinkedIn credentials to ${TOKEN_STORE_PATH}.`);
  } catch (error) {
    response
      .writeHead(500)
      .end('LinkedIn authorization failed. Check the terminal.');
    await logger.error('LinkedIn authorization failed', error);
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(Number(callback.port || 80), callback.hostname, () => {
  console.log('Open this URL in your browser:');
  console.log(authorizationUrl.toString());
});
