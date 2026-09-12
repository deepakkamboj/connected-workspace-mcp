import { LinkedInClient } from '../src/tools/linkedin/client.js';
import { registerLinkedInTools } from '../src/tools/linkedin/index.js';
import { parsedText, ToolHarness } from './tool-harness.js';

function linkedinMock() {
  return {
    getProfile: jest.fn(),
    listPosts: jest.fn(),
    getPost: jest.fn(),
    getEngagement: jest.fn(),
    publishText: jest.fn(),
    publishImage: jest.fn(),
    deletePost: jest.fn(),
  };
}

describe('LinkedIn tools', () => {
  let harness: ToolHarness;
  let linkedin: ReturnType<typeof linkedinMock>;

  beforeEach(() => {
    harness = new ToolHarness();
    linkedin = linkedinMock();
    registerLinkedInTools(
      harness.server,
      linkedin as unknown as LinkedInClient,
    );
  });

  it('registers every LinkedIn tool', () => {
    expect([...harness.handlers.keys()]).toEqual([
      'linkedin_get_profile',
      'linkedin_list_posts',
      'linkedin_get_post',
      'linkedin_get_engagement',
      'linkedin_publish_text',
      'linkedin_publish_image',
      'linkedin_delete_post',
    ]);
  });

  it('reads the authenticated profile', async () => {
    linkedin.getProfile.mockResolvedValue({
      sub: 'member-1',
      name: 'Test Member',
    });

    const result = await harness.handler('linkedin_get_profile')({});

    expect(linkedin.getProfile).toHaveBeenCalledTimes(1);
    expect(parsedText(result)).toEqual({
      sub: 'member-1',
      name: 'Test Member',
    });
  });

  it('lists authored posts using the requested count', async () => {
    linkedin.listPosts.mockResolvedValue({
      elements: [{ id: 'urn:li:share:1' }],
    });

    const result = await harness.handler('linkedin_list_posts')({ count: 5 });

    expect(linkedin.listPosts).toHaveBeenCalledWith(5);
    expect(parsedText(result)).toEqual({
      elements: [{ id: 'urn:li:share:1' }],
    });
  });

  it('reads one post and its engagement metrics', async () => {
    linkedin.getPost.mockResolvedValue({
      id: 'urn:li:share:2',
      commentary: 'Post',
    });
    linkedin.getEngagement.mockResolvedValue({
      likesSummary: { totalLikes: 3 },
    });

    const post = await harness.handler('linkedin_get_post')({
      postUrn: 'urn:li:share:2',
    });
    const engagement = await harness.handler('linkedin_get_engagement')({
      postUrn: 'urn:li:share:2',
    });

    expect(linkedin.getPost).toHaveBeenCalledWith('urn:li:share:2');
    expect(linkedin.getEngagement).toHaveBeenCalledWith('urn:li:share:2');
    expect(parsedText(post)).toMatchObject({ id: 'urn:li:share:2' });
    expect(parsedText(engagement)).toEqual({ likesSummary: { totalLikes: 3 } });
  });

  it('publishes text with the requested visibility', async () => {
    linkedin.publishText.mockResolvedValue('urn:li:share:3');

    const result = await harness.handler('linkedin_publish_text')({
      commentary: 'Test post',
      visibility: 'CONNECTIONS',
    });

    expect(linkedin.publishText).toHaveBeenCalledWith(
      'Test post',
      'CONNECTIONS',
    );
    expect(parsedText(result)).toEqual({
      published: true,
      postUrn: 'urn:li:share:3',
    });
  });

  it('publishes a local image with text and alt text', async () => {
    linkedin.publishImage.mockResolvedValue('urn:li:share:4');

    const result = await harness.handler('linkedin_publish_image')({
      commentary: 'Image post',
      imagePath: 'C:/temp/image.png',
      altText: 'Test image',
      visibility: 'PUBLIC',
    });

    expect(linkedin.publishImage).toHaveBeenCalledWith(
      'Image post',
      'C:/temp/image.png',
      'Test image',
      'PUBLIC',
    );
    expect(parsedText(result)).toEqual({
      published: true,
      postUrn: 'urn:li:share:4',
    });
  });

  it('deletes an owned post', async () => {
    linkedin.deletePost.mockResolvedValue(undefined);

    const result = await harness.handler('linkedin_delete_post')({
      postUrn: 'urn:li:share:5',
    });

    expect(linkedin.deletePost).toHaveBeenCalledWith('urn:li:share:5');
    expect(parsedText(result)).toEqual({
      deleted: true,
      postUrn: 'urn:li:share:5',
    });
  });

  it('returns an MCP error result when LinkedIn rejects a request', async () => {
    linkedin.getProfile.mockRejectedValue(new Error('LinkedIn unavailable'));

    const result = await harness.handler('linkedin_get_profile')({});

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('LinkedIn unavailable'),
    });
  });
});
