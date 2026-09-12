import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { jsonText, runTool } from '../shared.js';
import { LinkedInClient } from './client.js';

export function registerLinkedInTools(
  server: McpServer,
  linkedin: LinkedInClient = new LinkedInClient(),
): void {
  server.registerTool(
    'linkedin_get_profile',
    {
      description: 'Read the authenticated LinkedIn member profile.',
      inputSchema: z.object({}),
    },
    async () =>
      runTool('linkedin_get_profile', async () =>
        jsonText(await linkedin.getProfile()),
      ),
  );

  server.registerTool(
    'linkedin_list_posts',
    {
      description: 'List posts authored by the authenticated LinkedIn member.',
      inputSchema: z.object({
        count: z.number().int().min(1).max(100).default(10),
      }),
    },
    async ({ count }) =>
      runTool('linkedin_list_posts', async () =>
        jsonText(await linkedin.listPosts(count)),
      ),
  );

  server.registerTool(
    'linkedin_get_post',
    {
      description: 'Read one LinkedIn post by its full URN.',
      inputSchema: z.object({ postUrn: z.string().min(1) }),
    },
    async ({ postUrn }) =>
      runTool('linkedin_get_post', async () =>
        jsonText(await linkedin.getPost(postUrn)),
      ),
  );

  server.registerTool(
    'linkedin_get_engagement',
    {
      description:
        'Read available like and comment metrics for a LinkedIn post.',
      inputSchema: z.object({ postUrn: z.string().min(1) }),
    },
    async ({ postUrn }) =>
      runTool('linkedin_get_engagement', async () =>
        jsonText(await linkedin.getEngagement(postUrn)),
      ),
  );

  server.registerTool(
    'linkedin_publish_text',
    {
      description:
        'Publish a text post to the authenticated LinkedIn member feed.',
      inputSchema: z.object({
        commentary: z.string().min(1).max(3000),
        visibility: z.enum(['PUBLIC', 'CONNECTIONS']).default('PUBLIC'),
      }),
    },
    async ({ commentary, visibility }) =>
      runTool('linkedin_publish_text', async () => {
        const postUrn = await linkedin.publishText(commentary, visibility);
        return jsonText({ published: true, postUrn });
      }),
  );

  server.registerTool(
    'linkedin_publish_image',
    {
      description:
        'Upload a local GIF, JPEG, or PNG and publish it with text to LinkedIn.',
      inputSchema: z.object({
        commentary: z.string().min(1).max(3000),
        imagePath: z.string().min(1),
        altText: z.string().max(4086).optional(),
        visibility: z.enum(['PUBLIC', 'CONNECTIONS']).default('PUBLIC'),
      }),
    },
    async ({ commentary, imagePath, altText, visibility }) =>
      runTool('linkedin_publish_image', async () => {
        const postUrn = await linkedin.publishImage(
          commentary,
          imagePath,
          altText,
          visibility,
        );
        return jsonText({ published: true, postUrn });
      }),
  );

  server.registerTool(
    'linkedin_delete_post',
    {
      description:
        'Permanently delete a LinkedIn post owned by the authenticated member.',
      inputSchema: z.object({ postUrn: z.string().min(1) }),
    },
    async ({ postUrn }) =>
      runTool('linkedin_delete_post', async () => {
        await linkedin.deletePost(postUrn);
        return jsonText({ deleted: true, postUrn });
      }),
  );
}
