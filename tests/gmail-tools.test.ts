import type { gmail_v1 } from 'googleapis';
import { registerGmailTools } from '../src/tools/gmail/index.js';
import { parsedText, ToolHarness } from './tool-harness.js';

function gmailMock() {
  return {
    users: {
      messages: {
        list: jest.fn(),
        get: jest.fn(),
        send: jest.fn(),
        modify: jest.fn(),
      },
    },
  };
}

describe('Gmail tools', () => {
  let harness: ToolHarness;
  let gmail: ReturnType<typeof gmailMock>;

  beforeEach(() => {
    harness = new ToolHarness();
    gmail = gmailMock();
    registerGmailTools(harness.server, gmail as unknown as gmail_v1.Gmail);
  });

  it('registers every Gmail tool', () => {
    expect([...harness.handlers.keys()]).toEqual([
      'gmail_search',
      'gmail_get_message',
      'gmail_send_message',
      'gmail_reply',
      'gmail_modify_message',
    ]);
  });

  it('searches Gmail and returns normalized summaries', async () => {
    gmail.users.messages.list.mockResolvedValue({
      data: { messages: [{ id: 'message-1' }], nextPageToken: 'next-page' },
    });
    gmail.users.messages.get.mockResolvedValue({
      data: {
        id: 'message-1',
        threadId: 'thread-1',
        snippet: 'Short preview',
        labelIds: ['INBOX', 'UNREAD'],
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'owner@example.com' },
            { name: 'Subject', value: 'Test subject' },
            { name: 'Date', value: 'Fri, 11 Sep 2026 12:00:00 +0000' },
          ],
        },
      },
    });

    const result = await harness.handler('gmail_search')({
      query: 'in:inbox is:unread',
      maxResults: 10,
      pageToken: undefined,
    });

    expect(result.isError).not.toBe(true);
    expect(gmail.users.messages.list).toHaveBeenCalledWith({
      userId: 'me',
      q: 'in:inbox is:unread',
      maxResults: 10,
      pageToken: undefined,
    });
    expect(parsedText(result)).toEqual({
      messages: [
        {
          id: 'message-1',
          threadId: 'thread-1',
          from: 'sender@example.com',
          to: 'owner@example.com',
          subject: 'Test subject',
          date: 'Fri, 11 Sep 2026 12:00:00 +0000',
          snippet: 'Short preview',
          labelIds: ['INBOX', 'UNREAD'],
        },
      ],
      nextPageToken: 'next-page',
    });
  });

  it('reads and decodes a nested plain-text message body', async () => {
    gmail.users.messages.get.mockResolvedValue({
      data: {
        id: 'message-2',
        threadId: 'thread-2',
        snippet: 'Preview',
        labelIds: ['INBOX'],
        payload: {
          headers: [{ name: 'Subject', value: 'Nested body' }],
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: Buffer.from('Decoded body').toString('base64url') },
            },
          ],
        },
      },
    });

    const result = await harness.handler('gmail_get_message')({
      messageId: 'message-2',
    });

    expect(parsedText(result)).toMatchObject({
      id: 'message-2',
      headers: { subject: 'Nested body' },
      body: 'Decoded body',
    });
  });

  it('builds and sends a URL-safe MIME message', async () => {
    gmail.users.messages.send.mockResolvedValue({
      data: { id: 'sent-1', threadId: 'sent-thread', labelIds: ['SENT'] },
    });

    const result = await harness.handler('gmail_send_message')({
      to: ['to@example.com'],
      cc: ['cc@example.com'],
      bcc: [],
      subject: 'Hello',
      body: 'Message body',
    });

    const request = gmail.users.messages.send.mock.calls[0][0];
    const decoded = Buffer.from(request.requestBody.raw, 'base64url').toString(
      'utf8',
    );
    expect(decoded).toContain('To: to@example.com');
    expect(decoded).toContain('Cc: cc@example.com');
    expect(decoded).toContain('Subject: Hello');
    expect(decoded).toContain('\r\n\r\nMessage body');
    expect(parsedText(result)).toEqual({
      id: 'sent-1',
      threadId: 'sent-thread',
      labelIds: ['SENT'],
    });
  });

  it('replies in the original thread with reply headers', async () => {
    gmail.users.messages.get.mockResolvedValue({
      data: {
        threadId: 'thread-3',
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'Reply-To', value: 'reply@example.com' },
            { name: 'Subject', value: 'Original' },
            { name: 'Message-ID', value: '<message@example.com>' },
            { name: 'References', value: '<earlier@example.com>' },
          ],
        },
      },
    });
    gmail.users.messages.send.mockResolvedValue({
      data: { id: 'reply-1', threadId: 'thread-3' },
    });

    const result = await harness.handler('gmail_reply')({
      messageId: 'message-3',
      body: 'Reply body',
    });

    const request = gmail.users.messages.send.mock.calls[0][0];
    const decoded = Buffer.from(request.requestBody.raw, 'base64url').toString(
      'utf8',
    );
    expect(request.requestBody.threadId).toBe('thread-3');
    expect(decoded).toContain('To: reply@example.com');
    expect(decoded).toContain('Subject: Re: Original');
    expect(decoded).toContain('In-Reply-To: <message@example.com>');
    expect(decoded).toContain(
      'References: <earlier@example.com> <message@example.com>',
    );
    expect(parsedText(result)).toEqual({ id: 'reply-1', threadId: 'thread-3' });
  });

  it('adds and removes labels', async () => {
    gmail.users.messages.modify.mockResolvedValue({
      data: { id: 'message-4', labelIds: ['STARRED'] },
    });

    const result = await harness.handler('gmail_modify_message')({
      messageId: 'message-4',
      addLabelIds: ['STARRED'],
      removeLabelIds: ['UNREAD'],
    });

    expect(gmail.users.messages.modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'message-4',
      requestBody: { addLabelIds: ['STARRED'], removeLabelIds: ['UNREAD'] },
    });
    expect(parsedText(result)).toEqual({
      id: 'message-4',
      labelIds: ['STARRED'],
    });
  });

  it('returns an MCP error result when Gmail rejects a request', async () => {
    gmail.users.messages.list.mockRejectedValue(new Error('Gmail unavailable'));

    const result = await harness.handler('gmail_search')({
      query: 'in:inbox',
      maxResults: 5,
      pageToken: undefined,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Gmail unavailable'),
    });
  });
});
