import type { drive_v3 } from 'googleapis';
import { registerDriveTools } from '../src/tools/drive/index.js';
import { parsedText, ToolHarness } from './tool-harness.js';

describe('Google Drive tools', () => {
  const drive = {
    files: {
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      copy: jest.fn(),
      update: jest.fn(),
    },
    permissions: { create: jest.fn() },
  };
  let harness: ToolHarness;

  beforeEach(() => {
    jest.resetAllMocks();
    harness = new ToolHarness();
    registerDriveTools(harness.server, drive as unknown as drive_v3.Drive);
  });

  it('registers every Drive tool', () => {
    expect([...harness.handlers.keys()]).toEqual([
      'drive_search_files',
      'drive_get_file',
      'drive_create_folder',
      'drive_copy_file',
      'drive_share_file',
      'drive_trash_file',
    ]);
  });

  it('searches files and preserves pagination', async () => {
    drive.files.list.mockResolvedValue({
      data: { files: [{ id: 'file' }], nextPageToken: 'next' },
    });
    const result = await harness.handler('drive_search_files')({
      query: 'trashed = false',
      pageSize: 5,
      pageToken: 'page',
    });
    expect(drive.files.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'trashed = false',
        pageSize: 5,
        pageToken: 'page',
      }),
    );
    expect(parsedText(result)).toEqual({
      files: [{ id: 'file' }],
      nextPageToken: 'next',
    });
  });

  it('reads file metadata', async () => {
    drive.files.get.mockResolvedValue({ data: { id: 'file', name: 'Notes' } });
    const result = await harness.handler('drive_get_file')({ fileId: 'file' });
    expect(drive.files.get).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'file' }),
    );
    expect(parsedText(result)).toEqual({ id: 'file', name: 'Notes' });
  });

  it('creates folders and copies files into the requested parent', async () => {
    drive.files.create.mockResolvedValue({ data: { id: 'folder' } });
    drive.files.copy.mockResolvedValue({ data: { id: 'copy' } });
    await harness.handler('drive_create_folder')({
      name: 'Archive',
      parentId: 'parent',
    });
    await harness.handler('drive_copy_file')({
      fileId: 'file',
      name: 'Copy',
      parentId: 'parent',
    });
    expect(drive.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: {
          name: 'Archive',
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['parent'],
        },
      }),
    );
    expect(drive.files.copy).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'file',
        requestBody: { name: 'Copy', parents: ['parent'] },
      }),
    );
  });

  it('shares a file with the requested permission', async () => {
    drive.permissions.create.mockResolvedValue({ data: { id: 'permission' } });
    await harness.handler('drive_share_file')({
      fileId: 'file',
      type: 'user',
      role: 'reader',
      emailAddress: 'reader@example.com',
      sendNotificationEmail: false,
    });
    expect(drive.permissions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'file',
        sendNotificationEmail: false,
        requestBody: {
          type: 'user',
          role: 'reader',
          emailAddress: 'reader@example.com',
          domain: undefined,
        },
      }),
    );
  });

  it('moves files to trash without permanently deleting them', async () => {
    drive.files.update.mockResolvedValue({
      data: { id: 'file', trashed: true },
    });
    const result = await harness.handler('drive_trash_file')({
      fileId: 'file',
    });
    expect(drive.files.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'file',
        requestBody: { trashed: true },
      }),
    );
    expect(parsedText(result)).toEqual({ id: 'file', trashed: true });
  });

  it('surfaces provider failures without retrying writes', async () => {
    drive.permissions.create.mockRejectedValue(
      Object.assign(new Error('Unavailable'), { status: 503 }),
    );
    const result = await harness.handler('drive_share_file')({
      fileId: 'file',
      type: 'anyone',
      role: 'reader',
    });
    expect(result.isError).toBe(true);
    expect(drive.permissions.create).toHaveBeenCalledTimes(1);
  });
});
