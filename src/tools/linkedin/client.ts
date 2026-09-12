import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { createLinkedInAuth } from '../../auth/linkedin/index.js';

const API_BASE = 'https://api.linkedin.com';

function imageContentType(path: string): string {
  const types: Record<string, string> = {
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
  };
  const contentType = types[extname(path).toLowerCase()];
  if (!contentType)
    throw new Error('LinkedIn images must be GIF, JPEG, or PNG files.');
  return contentType;
}

export class LinkedInClient {
  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<{ data: T; headers: Headers }> {
    const auth = createLinkedInAuth();
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'LinkedIn-Version': auth.apiVersion,
        'X-Restli-Protocol-Version': '2.0.0',
        ...init.headers,
      },
    });
    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};
    if (!response.ok) {
      throw new Error(
        `LinkedIn API ${response.status}: ${data.message || responseText || response.statusText}`,
      );
    }
    return { data: data as T, headers: response.headers };
  }

  async getProfile(): Promise<unknown> {
    const auth = createLinkedInAuth();
    const response = await fetch(`${API_BASE}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        `LinkedIn profile API ${response.status}: ${JSON.stringify(data)}`,
      );
    return data;
  }

  async listPosts(count: number): Promise<unknown> {
    const params = new URLSearchParams({
      author: createLinkedInAuth().userUrn,
      q: 'author',
      count: String(count),
    });
    return (await this.request(`/rest/posts?${params}`)).data;
  }

  async getPost(postUrn: string): Promise<unknown> {
    return (await this.request(`/rest/posts/${encodeURIComponent(postUrn)}`))
      .data;
  }

  async getEngagement(postUrn: string): Promise<unknown> {
    return (
      await this.request(`/rest/socialActions/${encodeURIComponent(postUrn)}`)
    ).data;
  }

  async publishText(
    commentary: string,
    visibility: 'PUBLIC' | 'CONNECTIONS',
  ): Promise<string> {
    return this.publish(commentary, visibility);
  }

  async publishImage(
    commentary: string,
    imagePath: string,
    altText: string | undefined,
    visibility: 'PUBLIC' | 'CONNECTIONS',
  ): Promise<string> {
    const image = await this.initializeImageUpload();
    const bytes = await readFile(image.uploadUrl ? imagePath : '');
    const upload = await fetch(image.uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${createLinkedInAuth().accessToken}`,
        'Content-Type': imageContentType(imagePath),
      },
      body: bytes,
    });
    if (!upload.ok)
      throw new Error(
        `LinkedIn image upload ${upload.status}: ${await upload.text()}`,
      );
    return this.publish(commentary, visibility, image.image, altText);
  }

  async deletePost(postUrn: string): Promise<void> {
    await this.request(`/rest/posts/${encodeURIComponent(postUrn)}`, {
      method: 'DELETE',
    });
  }

  private async initializeImageUpload(): Promise<{
    image: string;
    uploadUrl: string;
  }> {
    const auth = createLinkedInAuth();
    const result = await this.request<{
      value: { image: string; uploadUrl: string };
    }>('/rest/images?action=initializeUpload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initializeUploadRequest: { owner: auth.userUrn },
      }),
    });
    return result.data.value;
  }

  private async publish(
    commentary: string,
    visibility: 'PUBLIC' | 'CONNECTIONS',
    imageUrn?: string,
    altText?: string,
  ): Promise<string> {
    const auth = createLinkedInAuth();
    const result = await this.request('/rest/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: auth.userUrn,
        commentary,
        visibility,
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        ...(imageUrn
          ? {
              content: {
                media: { id: imageUrn, ...(altText ? { altText } : {}) },
              },
            }
          : {}),
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    });
    return result.headers.get('x-restli-id') || '';
  }
}
