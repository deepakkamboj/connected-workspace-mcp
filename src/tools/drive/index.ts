import { McpServer } from '@modelcontextprotocol/server';
import { drive_v3 } from 'googleapis';
import * as z from 'zod/v4';
import {
  destructiveTool,
  jsonText,
  readOnlyTool,
  runTool,
  writeTool,
} from '../shared.js';

const fileFields =
  'id,name,mimeType,modifiedTime,size,webViewLink,parents,trashed';

export function registerDriveTools(
  server: McpServer,
  drive: drive_v3.Drive,
): void {
  server.registerTool(
    'drive_search_files',
    {
      description: 'Search Google Drive files using Drive query syntax.',
      inputSchema: z.object({
        query: z.string().default('trashed = false'),
        pageSize: z.number().int().min(1).max(1000).default(100),
        pageToken: z.string().optional(),
      }),
      annotations: readOnlyTool,
    },
    async ({ query, pageSize, pageToken }) =>
      runTool(
        'drive_search_files',
        async () => {
          const result = await drive.files.list({
            q: query,
            pageSize,
            pageToken,
            fields: `nextPageToken,files(${fileFields})`,
            orderBy: 'modifiedTime desc',
          });
          return jsonText({
            files: result.data.files || [],
            nextPageToken: result.data.nextPageToken,
          });
        },
        { retry: true },
      ),
  );

  server.registerTool(
    'drive_get_file',
    {
      description: 'Read metadata for a Google Drive file.',
      inputSchema: z.object({ fileId: z.string().min(1) }),
      annotations: readOnlyTool,
    },
    async ({ fileId }) =>
      runTool(
        'drive_get_file',
        async () => {
          const result = await drive.files.get({ fileId, fields: fileFields });
          return jsonText(result.data);
        },
        { retry: true },
      ),
  );

  server.registerTool(
    'drive_create_folder',
    {
      description: 'Create a Google Drive folder.',
      inputSchema: z.object({
        name: z.string().min(1),
        parentId: z.string().optional(),
      }),
      annotations: writeTool,
    },
    async ({ name, parentId }) =>
      runTool('drive_create_folder', async () => {
        const result = await drive.files.create({
          requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : undefined,
          },
          fields: fileFields,
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'drive_copy_file',
    {
      description: 'Copy a Google Drive file.',
      inputSchema: z.object({
        fileId: z.string().min(1),
        name: z.string().min(1),
        parentId: z.string().optional(),
      }),
      annotations: writeTool,
    },
    async ({ fileId, name, parentId }) =>
      runTool('drive_copy_file', async () => {
        const result = await drive.files.copy({
          fileId,
          requestBody: { name, parents: parentId ? [parentId] : undefined },
          fields: fileFields,
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'drive_share_file',
    {
      description: 'Grant a user or domain access to a Google Drive file.',
      inputSchema: z.object({
        fileId: z.string().min(1),
        type: z.enum(['user', 'group', 'domain', 'anyone']),
        role: z.enum(['reader', 'commenter', 'writer']),
        emailAddress: z.string().email().optional(),
        domain: z.string().optional(),
        sendNotificationEmail: z.boolean().default(true),
      }),
      annotations: writeTool,
    },
    async ({
      fileId,
      type,
      role,
      emailAddress,
      domain,
      sendNotificationEmail,
    }) =>
      runTool('drive_share_file', async () => {
        const result = await drive.permissions.create({
          fileId,
          sendNotificationEmail,
          requestBody: { type, role, emailAddress, domain },
          fields: 'id,type,role,emailAddress,domain',
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'drive_trash_file',
    {
      description: 'Move a Google Drive file to trash.',
      inputSchema: z.object({ fileId: z.string().min(1) }),
      annotations: destructiveTool,
    },
    async ({ fileId }) =>
      runTool('drive_trash_file', async () => {
        const result = await drive.files.update({
          fileId,
          requestBody: { trashed: true },
          fields: fileFields,
        });
        return jsonText(result.data);
      }),
  );
}
