import { McpServer } from '@modelcontextprotocol/server';
import { gmail_v1 } from 'googleapis';
import * as z from 'zod/v4';
import { jsonText, runTool } from '../shared.js';

function encodeMessage(message: string): string {
  return Buffer.from(message)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function mimeMessage(input: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const headers = [
    `To: ${input.to.join(', ')}`,
    ...(input.cc?.length ? [`Cc: ${input.cc.join(', ')}`] : []),
    ...(input.bcc?.length ? [`Bcc: ${input.bcc.join(', ')}`] : []),
    `Subject: ${input.subject}`,
    ...(input.inReplyTo ? [`In-Reply-To: ${input.inReplyTo}`] : []),
    ...(input.references ? [`References: ${input.references}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  return [...headers, '', input.body].join('\r\n');
}

function decodedBody(part?: gmail_v1.Schema$MessagePart): string {
  if (!part) return '';
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return Buffer.from(part.body.data, 'base64url').toString('utf8');
  }
  for (const child of part.parts || []) {
    const body = decodedBody(child);
    if (body) return body;
  }
  if (part.body?.data)
    return Buffer.from(part.body.data, 'base64url').toString('utf8');
  return '';
}

function headers(message: gmail_v1.Schema$Message): Record<string, string> {
  return Object.fromEntries(
    (message.payload?.headers || [])
      .filter((header) => header.name && header.value)
      .map((header) => [header.name!.toLowerCase(), header.value!]),
  );
}

const recipientsSchema = {
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).default([]),
  bcc: z.array(z.string().email()).default([]),
  subject: z.string().min(1),
  body: z.string(),
};

export function registerGmailTools(
  server: McpServer,
  gmail: gmail_v1.Gmail,
): void {
  server.registerTool(
    'gmail_search',
    {
      description:
        'Search Gmail using Gmail query syntax and return message summaries.',
      inputSchema: z.object({
        query: z.string().default('in:inbox'),
        maxResults: z.number().int().min(1).max(100).default(20),
        pageToken: z.string().optional(),
      }),
    },
    async ({ query, maxResults, pageToken }) =>
      runTool('gmail_search', async () => {
        const result = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults,
          pageToken,
        });
        const messages = await Promise.all(
          (result.data.messages || []).map(async ({ id }) => {
            const response = await gmail.users.messages.get({
              userId: 'me',
              id: id!,
              format: 'metadata',
              metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
            });
            const messageHeaders = headers(response.data);
            return {
              id: response.data.id,
              threadId: response.data.threadId,
              from: messageHeaders.from,
              to: messageHeaders.to,
              cc: messageHeaders.cc,
              subject: messageHeaders.subject,
              date: messageHeaders.date,
              snippet: response.data.snippet,
              labelIds: response.data.labelIds,
            };
          }),
        );
        return jsonText({ messages, nextPageToken: result.data.nextPageToken });
      }),
  );

  server.registerTool(
    'gmail_get_message',
    {
      description: 'Read one Gmail message with headers and decoded body text.',
      inputSchema: z.object({ messageId: z.string().min(1) }),
    },
    async ({ messageId }) =>
      runTool('gmail_get_message', async () => {
        const result = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        });
        return jsonText({
          id: result.data.id,
          threadId: result.data.threadId,
          headers: headers(result.data),
          body: decodedBody(result.data.payload),
          snippet: result.data.snippet,
          labelIds: result.data.labelIds,
        });
      }),
  );

  server.registerTool(
    'gmail_send_message',
    {
      description:
        'Send a plain-text email from the authenticated Gmail account.',
      inputSchema: z.object(recipientsSchema),
    },
    async (input) =>
      runTool('gmail_send_message', async () => {
        const result = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: encodeMessage(mimeMessage(input)) },
        });
        return jsonText({
          id: result.data.id,
          threadId: result.data.threadId,
          labelIds: result.data.labelIds,
        });
      }),
  );

  server.registerTool(
    'gmail_reply',
    {
      description: 'Reply to a Gmail message in its existing thread.',
      inputSchema: z.object({
        messageId: z.string().min(1),
        body: z.string().min(1),
      }),
    },
    async ({ messageId, body }) =>
      runTool('gmail_reply', async () => {
        const original = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'metadata',
          metadataHeaders: [
            'From',
            'Reply-To',
            'Subject',
            'Message-ID',
            'References',
          ],
        });
        const originalHeaders = headers(original.data);
        const subject = originalHeaders.subject?.toLowerCase().startsWith('re:')
          ? originalHeaders.subject
          : `Re: ${originalHeaders.subject || ''}`;
        const messageIdHeader = originalHeaders['message-id'];
        const raw = mimeMessage({
          to: [originalHeaders['reply-to'] || originalHeaders.from],
          subject,
          body,
          inReplyTo: messageIdHeader,
          references: [originalHeaders.references, messageIdHeader]
            .filter(Boolean)
            .join(' '),
        });
        const result = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodeMessage(raw),
            threadId: original.data.threadId,
          },
        });
        return jsonText({ id: result.data.id, threadId: result.data.threadId });
      }),
  );

  server.registerTool(
    'gmail_modify_message',
    {
      description:
        'Add or remove Gmail labels such as UNREAD, STARRED, INBOX, or TRASH.',
      inputSchema: z.object({
        messageId: z.string().min(1),
        addLabelIds: z.array(z.string()).default([]),
        removeLabelIds: z.array(z.string()).default([]),
      }),
    },
    async ({ messageId, addLabelIds, removeLabelIds }) =>
      runTool('gmail_modify_message', async () => {
        const result = await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: { addLabelIds, removeLabelIds },
        });
        return jsonText({ id: result.data.id, labelIds: result.data.labelIds });
      }),
  );
}
