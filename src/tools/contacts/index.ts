import { McpServer } from '@modelcontextprotocol/server';
import { people_v1 } from 'googleapis';
import * as z from 'zod/v4';
import {
  destructiveTool,
  jsonText,
  readOnlyTool,
  runTool,
  writeTool,
} from '../shared.js';

const personFields = 'names,emailAddresses,phoneNumbers,organizations';
const contactInput = z.object({
  givenName: z.string().min(1),
  familyName: z.string().optional(),
  emailAddresses: z.array(z.string().email()).default([]),
  phoneNumbers: z.array(z.string().min(1)).default([]),
  organization: z.string().optional(),
  jobTitle: z.string().optional(),
});

function person(input: z.infer<typeof contactInput>): people_v1.Schema$Person {
  return {
    names: [{ givenName: input.givenName, familyName: input.familyName }],
    emailAddresses: input.emailAddresses.map((value) => ({ value })),
    phoneNumbers: input.phoneNumbers.map((value) => ({ value })),
    organizations:
      input.organization || input.jobTitle
        ? [{ name: input.organization, title: input.jobTitle }]
        : [],
  };
}

export function registerContactsTools(
  server: McpServer,
  people: people_v1.People,
): void {
  server.registerTool(
    'contacts_list',
    {
      description: 'List Google contacts with pagination.',
      inputSchema: z.object({
        pageSize: z.number().int().min(1).max(1000).default(100),
        pageToken: z.string().optional(),
      }),
      annotations: readOnlyTool,
    },
    async ({ pageSize, pageToken }) =>
      runTool(
        'contacts_list',
        async () => {
          const result = await people.people.connections.list({
            resourceName: 'people/me',
            personFields,
            pageSize,
            pageToken,
          });
          return jsonText({
            contacts: result.data.connections || [],
            nextPageToken: result.data.nextPageToken,
          });
        },
        { retry: true },
      ),
  );

  server.registerTool(
    'contacts_search',
    {
      description:
        'Search Google contacts by name, email, phone, or organization.',
      inputSchema: z.object({
        query: z.string().min(1),
        pageSize: z.number().int().min(1).max(30).default(10),
      }),
      annotations: readOnlyTool,
    },
    async ({ query, pageSize }) =>
      runTool(
        'contacts_search',
        async () => {
          const result = await people.people.searchContacts({
            query,
            readMask: personFields,
            pageSize,
          });
          return jsonText({ results: result.data.results || [] });
        },
        { retry: true },
      ),
  );

  server.registerTool(
    'contacts_get',
    {
      description:
        'Read a Google contact by resource name such as people/c123.',
      inputSchema: z.object({ resourceName: z.string().startsWith('people/') }),
      annotations: readOnlyTool,
    },
    async ({ resourceName }) =>
      runTool(
        'contacts_get',
        async () => {
          const result = await people.people.get({
            resourceName,
            personFields,
          });
          return jsonText(result.data);
        },
        { retry: true },
      ),
  );

  server.registerTool(
    'contacts_create',
    {
      description: 'Create a Google contact.',
      inputSchema: contactInput,
      annotations: writeTool,
    },
    async (input) =>
      runTool('contacts_create', async () => {
        const result = await people.people.createContact({
          requestBody: person(input),
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'contacts_update',
    {
      description: 'Replace the supported fields on a Google contact.',
      inputSchema: contactInput.extend({
        resourceName: z.string().startsWith('people/'),
        etag: z.string().optional(),
      }),
      annotations: writeTool,
    },
    async ({ resourceName, etag, ...input }) =>
      runTool('contacts_update', async () => {
        const existing = await people.people.get({
          resourceName,
          personFields: 'metadata',
        });
        if (
          !existing.data.metadata?.sources?.some(
            (source) => source.type === 'CONTACT',
          )
        ) {
          throw new Error(
            'The requested person is not an editable Google contact.',
          );
        }
        if (etag && etag !== existing.data.etag) {
          throw new Error(
            'The contact changed. Read it again before updating.',
          );
        }
        const result = await people.people.updateContact({
          resourceName,
          updatePersonFields: personFields,
          requestBody: {
            ...person(input),
            etag: existing.data.etag,
            metadata: existing.data.metadata,
          },
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'contacts_delete',
    {
      description: 'Permanently delete a Google contact.',
      inputSchema: z.object({ resourceName: z.string().startsWith('people/') }),
      annotations: destructiveTool,
    },
    async ({ resourceName }) =>
      runTool('contacts_delete', async () => {
        await people.people.deleteContact({ resourceName });
        return jsonText({ deleted: true, resourceName });
      }),
  );
}
