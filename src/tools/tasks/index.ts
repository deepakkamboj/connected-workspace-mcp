import { McpServer } from '@modelcontextprotocol/server';
import { tasks_v1 } from 'googleapis';
import * as z from 'zod/v4';
import {
  destructiveTool,
  jsonText,
  readOnlyTool,
  runTool,
  writeTool,
} from '../shared.js';

export function registerTasksTools(
  server: McpServer,
  tasks: tasks_v1.Tasks,
): void {
  server.registerTool(
    'tasks_list_tasklists',
    {
      description: 'List Google Tasks lists with pagination.',
      inputSchema: z.object({
        maxResults: z.number().int().min(1).max(100).default(20),
        pageToken: z.string().optional(),
      }),
      annotations: readOnlyTool,
    },
    async ({ maxResults, pageToken }) =>
      runTool(
        'tasks_list_tasklists',
        async () => {
          const result = await tasks.tasklists.list({ maxResults, pageToken });
          return jsonText({
            taskLists: result.data.items || [],
            nextPageToken: result.data.nextPageToken,
          });
        },
        { retry: true },
      ),
  );

  server.registerTool(
    'tasks_list',
    {
      description: 'List tasks in a Google Tasks list with pagination.',
      inputSchema: z.object({
        taskListId: z.string().default('@default'),
        maxResults: z.number().int().min(1).max(100).default(20),
        pageToken: z.string().optional(),
        showCompleted: z.boolean().default(false),
      }),
      annotations: readOnlyTool,
    },
    async ({ taskListId, maxResults, pageToken, showCompleted }) =>
      runTool(
        'tasks_list',
        async () => {
          const result = await tasks.tasks.list({
            tasklist: taskListId,
            maxResults,
            pageToken,
            showCompleted,
            showHidden: showCompleted,
          });
          return jsonText({
            tasks: result.data.items || [],
            nextPageToken: result.data.nextPageToken,
          });
        },
        { retry: true },
      ),
  );

  server.registerTool(
    'tasks_create',
    {
      description: 'Create a Google task.',
      inputSchema: z.object({
        taskListId: z.string().default('@default'),
        title: z.string().min(1),
        notes: z.string().optional(),
        due: z.iso.datetime().optional(),
        parentTaskId: z.string().optional(),
      }),
      annotations: writeTool,
    },
    async ({ taskListId, title, notes, due, parentTaskId }) =>
      runTool('tasks_create', async () => {
        const result = await tasks.tasks.insert({
          tasklist: taskListId,
          parent: parentTaskId,
          requestBody: { title, notes, due },
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'tasks_update',
    {
      description: 'Update fields on a Google task.',
      inputSchema: z.object({
        taskListId: z.string().default('@default'),
        taskId: z.string().min(1),
        title: z.string().min(1).optional(),
        notes: z.string().optional(),
        due: z.iso.datetime().nullable().optional(),
        status: z.enum(['needsAction', 'completed']).optional(),
      }),
      annotations: writeTool,
    },
    async ({ taskListId, taskId, ...requestBody }) =>
      runTool('tasks_update', async () => {
        const result = await tasks.tasks.patch({
          tasklist: taskListId,
          task: taskId,
          requestBody,
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'tasks_complete',
    {
      description: 'Mark a Google task as completed.',
      inputSchema: z.object({
        taskListId: z.string().default('@default'),
        taskId: z.string().min(1),
      }),
      annotations: writeTool,
    },
    async ({ taskListId, taskId }) =>
      runTool('tasks_complete', async () => {
        const result = await tasks.tasks.patch({
          tasklist: taskListId,
          task: taskId,
          requestBody: {
            status: 'completed',
            completed: new Date().toISOString(),
          },
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'tasks_delete',
    {
      description: 'Permanently delete a Google task.',
      inputSchema: z.object({
        taskListId: z.string().default('@default'),
        taskId: z.string().min(1),
      }),
      annotations: destructiveTool,
    },
    async ({ taskListId, taskId }) =>
      runTool('tasks_delete', async () => {
        await tasks.tasks.delete({ tasklist: taskListId, task: taskId });
        return jsonText({ deleted: true, taskId });
      }),
  );
}
