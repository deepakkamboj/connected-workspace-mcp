import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { TOKEN_STORE_PATH } from '../src/auth/token-store.js';
import { LinkedInClient } from '../src/tools/linkedin/client.js';

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
}

describe('LinkedIn REST client', () => {
  const originalFetch = global.fetch;
  const imagePath = join(dirname(TOKEN_STORE_PATH), 'linkedin-test-image.png');
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(async () => {
    await rm(TOKEN_STORE_PATH, { force: true });
    process.env.LINKEDIN_ACCESS_TOKEN = 'test-access-token';
    process.env.LINKEDIN_USER_URN = 'urn:li:person:test-member';
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await rm(imagePath, { force: true });
  });

  it('reads the OpenID profile with bearer authentication', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ sub: 'test-member', name: 'Test Member' }),
    );

    const profile = await new LinkedInClient().getProfile();

    expect(profile).toEqual({ sub: 'test-member', name: 'Test Member' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.linkedin.com/v2/userinfo',
      {
        headers: { Authorization: 'Bearer test-access-token' },
      },
    );
  });

  it('lists posts with encoded author and standard LinkedIn headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ elements: [] }));

    await new LinkedInClient().listPosts(12);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/rest/posts?');
    expect(String(url)).toContain('author=urn%3Ali%3Aperson%3Atest-member');
    expect(String(url)).toContain('count=12');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer test-access-token',
      'LinkedIn-Version': '202609',
      'X-Restli-Protocol-Version': '2.0.0',
    });
  });

  it('encodes post URNs for post and engagement reads', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}));
    const client = new LinkedInClient();

    await client.getPost('urn:li:share:123');
    await client.getEngagement('urn:li:share:123');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.linkedin.com/rest/posts/urn%3Ali%3Ashare%3A123',
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.linkedin.com/rest/socialActions/urn%3Ali%3Ashare%3A123',
    );
  });

  it('publishes a text post and returns the response URN', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {},
        {
          status: 201,
          headers: { 'x-restli-id': 'urn:li:share:456' },
        },
      ),
    );

    const postUrn = await new LinkedInClient().publishText(
      'Test commentary',
      'PUBLIC',
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      author: 'urn:li:person:test-member',
      commentary: 'Test commentary',
      visibility: 'PUBLIC',
      lifecycleState: 'PUBLISHED',
    });
    expect(postUrn).toBe('urn:li:share:456');
  });

  it('initializes, uploads, and publishes an image in sequence', async () => {
    await mkdir(dirname(imagePath), { recursive: true });
    await writeFile(imagePath, Buffer.from([1, 2, 3]));
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          value: {
            image: 'urn:li:image:1',
            uploadUrl: 'https://upload.example/image',
          },
        }),
      )
      .mockResolvedValueOnce(new Response('', { status: 201 }))
      .mockResolvedValueOnce(
        jsonResponse(
          {},
          { status: 201, headers: { 'x-restli-id': 'urn:li:share:789' } },
        ),
      );

    const postUrn = await new LinkedInClient().publishImage(
      'Image commentary',
      imagePath,
      'Alt text',
      'PUBLIC',
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.linkedin.com/rest/images?action=initializeUpload',
    );
    expect(fetchMock.mock.calls[1][0]).toBe('https://upload.example/image');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
    expect(fetchMock.mock.calls[2][0]).toBe(
      'https://api.linkedin.com/rest/posts',
    );
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toMatchObject({
      content: { media: { id: 'urn:li:image:1', altText: 'Alt text' } },
    });
    expect(postUrn).toBe('urn:li:share:789');
  });

  it('deletes a post using its encoded URN', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await new LinkedInClient().deletePost('urn:li:share:999');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/posts/urn%3Ali%3Ashare%3A999',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('surfaces LinkedIn API error messages', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Permission denied' }, { status: 403 }),
    );

    await expect(
      new LinkedInClient().getPost('urn:li:share:blocked'),
    ).rejects.toThrow('LinkedIn API 403: Permission denied');
  });
});
