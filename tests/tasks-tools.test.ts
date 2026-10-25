import type { tasks_v1 } from 'googleapis';
import { registerTasksTools } from '../src/tools/tasks/index.js';
import { parsedText, ToolHarness } from './tool-harness.js';

describe('Google Tasks tools', () => {
  const tasks = {
    tasklists: { list: jest.fn() },
    tasks: {
      list: jest.fn(),
      insert: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
  };
  let harness: ToolHarness;

  beforeEach(() => {
    jest.resetAllMocks();
    harness = new ToolHarness();
    registerTasksTools(harness.server, tasks as unknown as tasks_v1.Tasks);
  });

  it('registers every Tasks tool', () => {
    expect([...harness.handlers.keys()]).toEqual([
      'tasks_list_tasklists',
      'tasks_list',
      'tasks_create',
      'tasks_update',
      'tasks_complete',
      'tasks_delete',
    ]);
  });

  it('lists task lists with pagination', async () => {
    tasks.tasklists.list.mockResolvedValue({
      data: { items: [{ id: 'list' }], nextPageToken: 'next' },
    });
    const result = await harness.handler('tasks_list_tasklists')({
      maxResults: 5,
      pageToken: 'page',
    });
    expect(tasks.tasklists.list).toHaveBeenCalledWith({
      maxResults: 5,
      pageToken: 'page',
    });
    expect(parsedText(result)).toEqual({
      taskLists: [{ id: 'list' }],
      nextPageToken: 'next',
    });
  });

  it('includes hidden tasks when completed tasks are requested', async () => {
    tasks.tasks.list.mockResolvedValue({
      data: { items: [{ id: 'task' }], nextPageToken: 'next' },
    });
    const result = await harness.handler('tasks_list')({
      taskListId: 'list',
      maxResults: 5,
      pageToken: 'page',
      showCompleted: true,
    });
    expect(tasks.tasks.list).toHaveBeenCalledWith({
      tasklist: 'list',
      maxResults: 5,
      pageToken: 'page',
      showCompleted: true,
      showHidden: true,
    });
    expect(parsedText(result)).toEqual({
      tasks: [{ id: 'task' }],
      nextPageToken: 'next',
    });
  });

  it('creates a task with its parent and due date', async () => {
    tasks.tasks.insert.mockResolvedValue({ data: { id: 'task' } });
    const result = await harness.handler('tasks_create')({
      taskListId: 'list',
      title: 'Follow up',
      notes: 'Details',
      due: '2026-11-01T00:00:00Z',
      parentTaskId: 'parent',
    });
    expect(tasks.tasks.insert).toHaveBeenCalledWith({
      tasklist: 'list',
      parent: 'parent',
      requestBody: {
        title: 'Follow up',
        notes: 'Details',
        due: '2026-11-01T00:00:00Z',
      },
    });
    expect(parsedText(result)).toEqual({ id: 'task' });
  });

  it('patches only supplied fields and supports clearing due dates', async () => {
    tasks.tasks.patch.mockResolvedValue({ data: { id: 'task' } });
    await harness.handler('tasks_update')({
      taskListId: 'list',
      taskId: 'task',
      title: 'Updated',
      due: null,
    });
    expect(tasks.tasks.patch).toHaveBeenCalledWith({
      tasklist: 'list',
      task: 'task',
      requestBody: { title: 'Updated', due: null },
    });
  });

  it('completes and deletes a task', async () => {
    tasks.tasks.patch.mockResolvedValue({
      data: { id: 'task', status: 'completed' },
    });
    tasks.tasks.delete.mockResolvedValue({ data: {} });
    const completed = await harness.handler('tasks_complete')({
      taskListId: 'list',
      taskId: 'task',
    });
    const deleted = await harness.handler('tasks_delete')({
      taskListId: 'list',
      taskId: 'task',
    });
    expect(tasks.tasks.patch).toHaveBeenCalledWith({
      tasklist: 'list',
      task: 'task',
      requestBody: { status: 'completed', completed: expect.any(String) },
    });
    expect(parsedText(completed).status).toBe('completed');
    expect(parsedText(deleted)).toEqual({ deleted: true, taskId: 'task' });
    expect(tasks.tasks.delete).toHaveBeenCalledWith({
      tasklist: 'list',
      task: 'task',
    });
  });

  it('returns provider errors without retrying mutations', async () => {
    tasks.tasks.insert.mockRejectedValue(
      Object.assign(new Error('Unavailable'), { status: 503 }),
    );
    const result = await harness.handler('tasks_create')({
      taskListId: 'list',
      title: 'Follow up',
    });
    expect(result.isError).toBe(true);
    expect(tasks.tasks.insert).toHaveBeenCalledTimes(1);
  });
});
