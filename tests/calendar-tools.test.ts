import type { calendar_v3 } from 'googleapis';
import { registerCalendarTools } from '../src/tools/calendar/index.js';
import { parsedText, ToolHarness } from './tool-harness.js';

function calendarMock() {
  return {
    events: {
      list: jest.fn(),
      insert: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
    freebusy: { query: jest.fn() },
  };
}

describe('Google Calendar tools', () => {
  let harness: ToolHarness;
  let calendar: ReturnType<typeof calendarMock>;

  beforeEach(() => {
    harness = new ToolHarness();
    calendar = calendarMock();
    registerCalendarTools(
      harness.server,
      calendar as unknown as calendar_v3.Calendar,
    );
  });

  it('registers every Calendar tool', () => {
    expect([...harness.handlers.keys()]).toEqual([
      'calendar_list_events',
      'calendar_create_event',
      'calendar_update_event',
      'calendar_delete_event',
      'calendar_free_busy',
    ]);
  });

  it('lists ordered events in a requested range', async () => {
    calendar.events.list.mockResolvedValue({
      data: { items: [{ id: 'event-1', summary: 'Planning' }] },
    });

    const result = await harness.handler('calendar_list_events')({
      calendarId: 'primary',
      timeMin: '2026-09-11T00:00:00.000Z',
      timeMax: '2026-09-18T00:00:00.000Z',
      query: 'planning',
      maxResults: 25,
    });

    expect(calendar.events.list).toHaveBeenCalledWith({
      calendarId: 'primary',
      timeMin: '2026-09-11T00:00:00.000Z',
      timeMax: '2026-09-18T00:00:00.000Z',
      q: 'planning',
      maxResults: 25,
      singleEvents: true,
      orderBy: 'startTime',
    });
    expect(parsedText(result)).toEqual([
      { id: 'event-1', summary: 'Planning' },
    ]);
  });

  it('creates an event with attendees and notification settings', async () => {
    calendar.events.insert.mockResolvedValue({
      data: {
        id: 'event-2',
        htmlLink: 'https://calendar.example/event-2',
        status: 'confirmed',
      },
    });

    const result = await harness.handler('calendar_create_event')({
      calendarId: 'primary',
      summary: 'Team sync',
      description: 'Weekly meeting',
      location: 'Online',
      start: '2026-09-14T16:00:00.000Z',
      end: '2026-09-14T17:00:00.000Z',
      timeZone: 'America/Los_Angeles',
      attendees: ['guest@example.com'],
      sendUpdates: 'all',
    });

    expect(calendar.events.insert).toHaveBeenCalledWith({
      calendarId: 'primary',
      sendUpdates: 'all',
      requestBody: {
        summary: 'Team sync',
        description: 'Weekly meeting',
        location: 'Online',
        start: {
          dateTime: '2026-09-14T16:00:00.000Z',
          timeZone: 'America/Los_Angeles',
        },
        end: {
          dateTime: '2026-09-14T17:00:00.000Z',
          timeZone: 'America/Los_Angeles',
        },
        attendees: [{ email: 'guest@example.com' }],
      },
    });
    expect(parsedText(result)).toEqual({
      id: 'event-2',
      htmlLink: 'https://calendar.example/event-2',
      status: 'confirmed',
    });
  });

  it('patches only supplied optional event fields', async () => {
    calendar.events.patch.mockResolvedValue({
      data: {
        id: 'event-3',
        htmlLink: 'https://calendar.example/event-3',
        status: 'confirmed',
      },
    });

    await harness.handler('calendar_update_event')({
      calendarId: 'primary',
      eventId: 'event-3',
      summary: 'Updated title',
      description: undefined,
      location: undefined,
      start: '2026-09-15T18:00:00.000Z',
      end: undefined,
      timeZone: 'UTC',
      attendees: ['guest@example.com'],
      sendUpdates: 'externalOnly',
    });

    expect(calendar.events.patch).toHaveBeenCalledWith({
      calendarId: 'primary',
      eventId: 'event-3',
      sendUpdates: 'externalOnly',
      requestBody: {
        summary: 'Updated title',
        description: undefined,
        location: undefined,
        start: { dateTime: '2026-09-15T18:00:00.000Z', timeZone: 'UTC' },
        attendees: [{ email: 'guest@example.com' }],
      },
    });
  });

  it('deletes an event and reports the deleted identifier', async () => {
    calendar.events.delete.mockResolvedValue({ data: {} });

    const result = await harness.handler('calendar_delete_event')({
      calendarId: 'primary',
      eventId: 'event-4',
      sendUpdates: 'none',
    });

    expect(calendar.events.delete).toHaveBeenCalledWith({
      calendarId: 'primary',
      eventId: 'event-4',
      sendUpdates: 'none',
    });
    expect(parsedText(result)).toEqual({ deleted: true, eventId: 'event-4' });
  });

  it('queries free/busy data for multiple calendars', async () => {
    calendar.freebusy.query.mockResolvedValue({
      data: {
        calendars: {
          primary: {
            busy: [
              { start: '2026-09-16T10:00:00Z', end: '2026-09-16T11:00:00Z' },
            ],
          },
        },
      },
    });

    const result = await harness.handler('calendar_free_busy')({
      calendarIds: ['primary', 'team@example.com'],
      timeMin: '2026-09-16T00:00:00.000Z',
      timeMax: '2026-09-17T00:00:00.000Z',
      timeZone: 'UTC',
    });

    expect(calendar.freebusy.query).toHaveBeenCalledWith({
      requestBody: {
        timeMin: '2026-09-16T00:00:00.000Z',
        timeMax: '2026-09-17T00:00:00.000Z',
        timeZone: 'UTC',
        items: [{ id: 'primary' }, { id: 'team@example.com' }],
      },
    });
    expect(parsedText(result)).toEqual({
      primary: {
        busy: [{ start: '2026-09-16T10:00:00Z', end: '2026-09-16T11:00:00Z' }],
      },
    });
  });

  it('returns an MCP error result when Calendar rejects a request', async () => {
    calendar.events.list.mockRejectedValue(new Error('Calendar unavailable'));

    const result = await harness.handler('calendar_list_events')({
      calendarId: 'primary',
      timeMin: '2026-09-11T00:00:00.000Z',
      timeMax: '2026-09-18T00:00:00.000Z',
      query: undefined,
      maxResults: 10,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Calendar unavailable'),
    });
  });
});
