import { rm } from 'node:fs/promises';
import { createGoogleAuth, GOOGLE_SCOPES } from '../src/auth/google/index.js';
import { createLinkedInAuth } from '../src/auth/linkedin/index.js';
import {
  loadGoogleTokens,
  loadLinkedInTokens,
  saveGoogleTokens,
  saveLinkedInTokens,
  TOKEN_STORE_PATH,
} from '../src/auth/token-store.js';

describe('persistent authentication', () => {
  beforeEach(async () => {
    await rm(TOKEN_STORE_PATH, { force: true });
    delete process.env.GOOGLE_REFRESH_TOKEN;
    delete process.env.LINKEDIN_ACCESS_TOKEN;
    delete process.env.LINKEDIN_USER_URN;
  });

  it('persists and reloads Google and LinkedIn tokens in one store', async () => {
    await saveGoogleTokens({
      refreshToken: 'google-refresh',
      accessToken: 'google-access',
      expiryDate: 123,
    });
    await saveLinkedInTokens({
      accessToken: 'linkedin-access',
      userUrn: 'urn:li:person:test',
      refreshToken: 'linkedin-refresh',
      expiresAt: 456,
    });

    expect(loadGoogleTokens()).toEqual({
      refreshToken: 'google-refresh',
      accessToken: 'google-access',
      expiryDate: 123,
    });
    expect(loadLinkedInTokens()).toEqual({
      accessToken: 'linkedin-access',
      userUrn: 'urn:li:person:test',
      refreshToken: 'linkedin-refresh',
      expiresAt: 456,
    });
  });

  it('constructs shared Google OAuth credentials from persisted tokens', async () => {
    await saveGoogleTokens({
      refreshToken: 'persisted-refresh',
      accessToken: 'persisted-access',
      expiryDate: 789,
    });

    const auth = createGoogleAuth();

    expect(auth.credentials).toMatchObject({
      refresh_token: 'persisted-refresh',
      access_token: 'persisted-access',
      expiry_date: 789,
    });
    expect(GOOGLE_SCOPES).toEqual(
      expect.arrayContaining([
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/calendar',
      ]),
    );
  });

  it('constructs LinkedIn auth from persisted tokens', async () => {
    await saveLinkedInTokens({
      accessToken: 'persisted-linkedin',
      userUrn: 'urn:li:person:persisted',
      expiresAt: 999,
    });

    expect(createLinkedInAuth()).toEqual({
      accessToken: 'persisted-linkedin',
      userUrn: 'urn:li:person:persisted',
      apiVersion: '202609',
      expiresAt: 999,
    });
  });

  it('rejects missing provider authorization', () => {
    expect(() => createGoogleAuth()).toThrow('Google is not authorized');
    expect(() => createLinkedInAuth()).toThrow('LinkedIn is not authorized');
  });
});
