import type { people_v1 } from 'googleapis';
import { registerContactsTools } from '../src/tools/contacts/index.js';
import { parsedText, ToolHarness } from './tool-harness.js';

describe('Google Contacts tools', () => {
  const people = {
    people: {
      connections: { list: jest.fn() },
      searchContacts: jest.fn(),
      get: jest.fn(),
      createContact: jest.fn(),
      updateContact: jest.fn(),
      deleteContact: jest.fn(),
    },
  };
  const input = {
    givenName: 'Alex',
    familyName: 'Example',
    emailAddresses: ['alex@example.com'],
    phoneNumbers: ['123'],
    organization: 'Example',
    jobTitle: 'Engineer',
  };
  let harness: ToolHarness;

  beforeEach(() => {
    jest.resetAllMocks();
    harness = new ToolHarness();
    registerContactsTools(
      harness.server,
      people as unknown as people_v1.People,
    );
  });

  it('registers every Contacts tool', () => {
    expect([...harness.handlers.keys()]).toEqual([
      'contacts_list',
      'contacts_search',
      'contacts_get',
      'contacts_create',
      'contacts_update',
      'contacts_delete',
    ]);
  });

  it('lists contacts and preserves pagination', async () => {
    people.people.connections.list.mockResolvedValue({
      data: {
        connections: [{ resourceName: 'people/1' }],
        nextPageToken: 'next',
      },
    });
    const result = await harness.handler('contacts_list')({
      pageSize: 5,
      pageToken: 'page',
    });
    expect(people.people.connections.list).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceName: 'people/me',
        pageSize: 5,
        pageToken: 'page',
      }),
    );
    expect(parsedText(result)).toEqual({
      contacts: [{ resourceName: 'people/1' }],
      nextPageToken: 'next',
    });
  });

  it('searches and reads contacts', async () => {
    people.people.searchContacts.mockResolvedValue({
      data: { results: [{ person: { resourceName: 'people/1' } }] },
    });
    people.people.get.mockResolvedValue({
      data: { resourceName: 'people/1', etag: 'etag' },
    });
    const searched = await harness.handler('contacts_search')({
      query: 'Alex',
      pageSize: 10,
    });
    const found = await harness.handler('contacts_get')({
      resourceName: 'people/1',
    });
    expect(people.people.searchContacts).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'Alex', pageSize: 10 }),
    );
    expect(parsedText(searched).results).toHaveLength(1);
    expect(parsedText(found)).toEqual({
      resourceName: 'people/1',
      etag: 'etag',
    });
  });

  it('creates a contact with supported fields', async () => {
    people.people.createContact.mockResolvedValue({
      data: { resourceName: 'people/new' },
    });
    const result = await harness.handler('contacts_create')(input);
    expect(people.people.createContact).toHaveBeenCalledWith({
      requestBody: {
        names: [{ givenName: 'Alex', familyName: 'Example' }],
        emailAddresses: [{ value: 'alex@example.com' }],
        phoneNumbers: [{ value: '123' }],
        organizations: [{ name: 'Example', title: 'Engineer' }],
      },
    });
    expect(parsedText(result).resourceName).toBe('people/new');
  });

  it('includes required source metadata when updating a contact', async () => {
    const metadata = {
      sources: [{ type: 'CONTACT', id: '1', etag: 'source-etag' }],
    };
    people.people.get.mockResolvedValue({ data: { etag: 'etag', metadata } });
    people.people.updateContact.mockResolvedValue({
      data: { resourceName: 'people/1' },
    });
    const result = await harness.handler('contacts_update')({
      ...input,
      resourceName: 'people/1',
      etag: 'etag',
    });
    expect(people.people.get).toHaveBeenCalledWith({
      resourceName: 'people/1',
      personFields: 'metadata',
    });
    expect(people.people.updateContact).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceName: 'people/1',
        updatePersonFields: 'names,emailAddresses,phoneNumbers,organizations',
        requestBody: expect.objectContaining({ metadata, etag: 'etag' }),
      }),
    );
    expect(result.isError).not.toBe(true);
  });

  it.each([
    [{ etag: 'new', metadata: { sources: [{ type: 'CONTACT' }] } }, 'old'],
    [{ etag: 'etag', metadata: { sources: [{ type: 'PROFILE' }] } }, undefined],
  ])(
    'rejects stale or non-editable contacts before mutation',
    async (data, etag) => {
      people.people.get.mockResolvedValue({ data });
      const result = await harness.handler('contacts_update')({
        ...input,
        resourceName: 'people/1',
        etag,
      });
      expect(result.isError).toBe(true);
      expect(people.people.updateContact).not.toHaveBeenCalled();
    },
  );

  it('deletes a contact and reports the identifier', async () => {
    people.people.deleteContact.mockResolvedValue({ data: {} });
    const result = await harness.handler('contacts_delete')({
      resourceName: 'people/1',
    });
    expect(people.people.deleteContact).toHaveBeenCalledWith({
      resourceName: 'people/1',
    });
    expect(parsedText(result)).toEqual({
      deleted: true,
      resourceName: 'people/1',
    });
  });

  it('surfaces provider failures', async () => {
    people.people.createContact.mockRejectedValue(
      new Error('Permission denied'),
    );
    const result = await harness.handler('contacts_create')(input);
    expect(result.isError).toBe(true);
    expect(people.people.createContact).toHaveBeenCalledTimes(1);
  });
});
