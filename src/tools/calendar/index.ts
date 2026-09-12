import { McpServer } from '@modelcontextprotocol/server';
import { calendar_v3 } from 'googleapis';
import * as z from 'zod/v4';
import { jsonText, runTool } from '../shared.js';

export function registerCalendarTools(
  server: McpServer,
  calendar: calendar_v3.Calendar,
): void {
  server.registerTool(
    'calendar_list_events',
    {
      description: 'List Google Calendar events in a date/time range.',
      inputSchema: z.object({
        calendarId: z.string().default('primary'),
        timeMin: z.iso.datetime(),
        timeMax: z.iso.datetime(),
        query: z.string().optional(),
        maxResults: z.number().int().min(1).max(250).default(50),
      }),
    },
    async ({ calendarId, timeMin, timeMax, query, maxResults }) =>
      runTool('calendar_list_events', async () => {
        const result = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          q: query,
          maxResults,
          singleEvents: true,
          orderBy: 'startTime',
        });
        return jsonText(result.data.items || []);
      }),
  );

  server.registerTool(
    'calendar_create_event',
    {
      description: 'Schedule an event on Google Calendar.',
      inputSchema: z.object({
        calendarId: z.string().default('primary'),
        summary: z.string().min(1),
        description: z.string().optional(),
        location: z.string().optional(),
        start: z.iso.datetime(),
        end: z.iso.datetime(),
        timeZone: z.string().optional(),
        attendees: z.array(z.string().email()).default([]),
        sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all'),
      }),
    },
    async ({
      calendarId,
      summary,
      description,
      location,
      start,
      end,
      timeZone,
      attendees,
      sendUpdates,
    }) =>
      runTool('calendar_create_event', async () => {
        const result = await calendar.events.insert({
          calendarId,
          sendUpdates,
          requestBody: {
            summary,
            description,
            location,
            start: { dateTime: start, timeZone },
            end: { dateTime: end, timeZone },
            attendees: attendees.map((email) => ({ email })),
          },
        });
        return jsonText({
          id: result.data.id,
          htmlLink: result.data.htmlLink,
          status: result.data.status,
        });
      }),
  );

  server.registerTool(
    'calendar_update_event',
    {
      description: 'Update fields on an existing Google Calendar event.',
      inputSchema: z.object({
        calendarId: z.string().default('primary'),
        eventId: z.string().min(1),
        summary: z.string().min(1).optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        start: z.iso.datetime().optional(),
        end: z.iso.datetime().optional(),
        timeZone: z.string().optional(),
        attendees: z.array(z.string().email()).optional(),
        sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all'),
      }),
    },
    async ({
      calendarId,
      eventId,
      summary,
      description,
      location,
      start,
      end,
      timeZone,
      attendees,
      sendUpdates,
    }) =>
      runTool('calendar_update_event', async () => {
        const result = await calendar.events.patch({
          calendarId,
          eventId,
          sendUpdates,
          requestBody: {
            summary,
            description,
            location,
            ...(start ? { start: { dateTime: start, timeZone } } : {}),
            ...(end ? { end: { dateTime: end, timeZone } } : {}),
            ...(attendees
              ? { attendees: attendees.map((email) => ({ email })) }
              : {}),
          },
        });
        return jsonText({
          id: result.data.id,
          htmlLink: result.data.htmlLink,
          status: result.data.status,
        });
      }),
  );

  server.registerTool(
    'calendar_delete_event',
    {
      description: 'Delete an event from Google Calendar.',
      inputSchema: z.object({
        calendarId: z.string().default('primary'),
        eventId: z.string().min(1),
        sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all'),
      }),
    },
    async ({ calendarId, eventId, sendUpdates }) =>
      runTool('calendar_delete_event', async () => {
        await calendar.events.delete({ calendarId, eventId, sendUpdates });
        return jsonText({ deleted: true, eventId });
      }),
  );

  server.registerTool(
    'calendar_free_busy',
    {
      description:
        'Read busy periods for one or more calendars in a date/time range.',
      inputSchema: z.object({
        calendarIds: z.array(z.string()).min(1).default(['primary']),
        timeMin: z.iso.datetime(),
        timeMax: z.iso.datetime(),
        timeZone: z.string().optional(),
      }),
    },
    async ({ calendarIds, timeMin, timeMax, timeZone }) =>
      runTool('calendar_free_busy', async () => {
        const result = await calendar.freebusy.query({
          requestBody: {
            timeMin,
            timeMax,
            timeZone,
            items: calendarIds.map((id) => ({ id })),
          },
        });
        return jsonText(result.data.calendars || {});
      }),
  );
}
