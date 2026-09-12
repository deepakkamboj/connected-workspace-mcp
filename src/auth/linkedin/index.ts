import { loadLinkedInTokens } from '../token-store.js';

export interface LinkedInAuth {
  accessToken: string;
  userUrn: string;
  apiVersion: string;
  expiresAt?: number;
}

export function createLinkedInAuth(): LinkedInAuth {
  const storedTokens = loadLinkedInTokens();
  const accessToken =
    storedTokens?.accessToken || process.env.LINKEDIN_ACCESS_TOKEN;
  if (!accessToken)
    throw new Error(
      'LinkedIn is not authorized. Run npm run auth:linkedin once.',
    );
  const userUrn = storedTokens?.userUrn || process.env.LINKEDIN_USER_URN;
  if (!userUrn)
    throw new Error(
      'LinkedIn user URN is missing. Run npm run auth:linkedin once.',
    );
  return {
    accessToken,
    userUrn,
    apiVersion: process.env.LINKEDIN_API_VERSION || '202609',
    expiresAt: storedTokens?.expiresAt,
  };
}
