import { McpServer } from '@modelcontextprotocol/server';
import { sheets_v4 } from 'googleapis';
import * as z from 'zod/v4';
import {
  destructiveTool,
  jsonText,
  readOnlyTool,
  runTool,
  writeTool,
} from '../shared.js';

const cellValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const values = z.array(z.array(cellValue));

export function registerSheetsTools(
  server: McpServer,
  sheets: sheets_v4.Sheets,
): void {
  server.registerTool(
    'sheets_get_spreadsheet',
    {
      description: 'Read spreadsheet metadata and sheet properties.',
      inputSchema: z.object({ spreadsheetId: z.string().min(1) }),
      annotations: readOnlyTool,
    },
    async ({ spreadsheetId }) =>
      runTool(
        'sheets_get_spreadsheet',
        async () => {
          const result = await sheets.spreadsheets.get({
            spreadsheetId,
            includeGridData: false,
          });
          return jsonText({
            spreadsheetId: result.data.spreadsheetId,
            title: result.data.properties?.title,
            locale: result.data.properties?.locale,
            timeZone: result.data.properties?.timeZone,
            spreadsheetUrl: result.data.spreadsheetUrl,
            sheets: (result.data.sheets || []).map((sheet) => sheet.properties),
          });
        },
        { retry: true },
      ),
  );

  server.registerTool(
    'sheets_read_range',
    {
      description: 'Read values from an A1-notation spreadsheet range.',
      inputSchema: z.object({
        spreadsheetId: z.string().min(1),
        range: z.string().min(1),
        majorDimension: z.enum(['ROWS', 'COLUMNS']).default('ROWS'),
        valueRenderOption: z
          .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
          .default('FORMATTED_VALUE'),
      }),
      annotations: readOnlyTool,
    },
    async ({ spreadsheetId, range, majorDimension, valueRenderOption }) =>
      runTool(
        'sheets_read_range',
        async () => {
          const result = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            majorDimension,
            valueRenderOption,
          });
          return jsonText({
            range: result.data.range,
            majorDimension: result.data.majorDimension,
            values: result.data.values || [],
          });
        },
        { retry: true },
      ),
  );

  server.registerTool(
    'sheets_batch_read',
    {
      description: 'Read values from multiple A1-notation ranges.',
      inputSchema: z.object({
        spreadsheetId: z.string().min(1),
        ranges: z.array(z.string().min(1)).min(1).max(100),
        majorDimension: z.enum(['ROWS', 'COLUMNS']).default('ROWS'),
        valueRenderOption: z
          .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
          .default('FORMATTED_VALUE'),
      }),
      annotations: readOnlyTool,
    },
    async ({ spreadsheetId, ranges, majorDimension, valueRenderOption }) =>
      runTool(
        'sheets_batch_read',
        async () => {
          const result = await sheets.spreadsheets.values.batchGet({
            spreadsheetId,
            ranges,
            majorDimension,
            valueRenderOption,
          });
          return jsonText({ valueRanges: result.data.valueRanges || [] });
        },
        { retry: true },
      ),
  );

  server.registerTool(
    'sheets_write_range',
    {
      description: 'Replace values in an A1-notation spreadsheet range.',
      inputSchema: z.object({
        spreadsheetId: z.string().min(1),
        range: z.string().min(1),
        values,
        majorDimension: z.enum(['ROWS', 'COLUMNS']).default('ROWS'),
        valueInputOption: z
          .enum(['RAW', 'USER_ENTERED'])
          .default('USER_ENTERED'),
      }),
      annotations: writeTool,
    },
    async ({
      spreadsheetId,
      range,
      values,
      majorDimension,
      valueInputOption,
    }) =>
      runTool('sheets_write_range', async () => {
        const result = await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption,
          requestBody: { majorDimension, values },
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'sheets_append_rows',
    {
      description: 'Append rows after the current data in a spreadsheet range.',
      inputSchema: z.object({
        spreadsheetId: z.string().min(1),
        range: z.string().min(1),
        values: values.min(1),
        valueInputOption: z
          .enum(['RAW', 'USER_ENTERED'])
          .default('USER_ENTERED'),
        insertDataOption: z
          .enum(['OVERWRITE', 'INSERT_ROWS'])
          .default('INSERT_ROWS'),
      }),
      annotations: writeTool,
    },
    async ({
      spreadsheetId,
      range,
      values,
      valueInputOption,
      insertDataOption,
    }) =>
      runTool('sheets_append_rows', async () => {
        const result = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption,
          insertDataOption,
          requestBody: { majorDimension: 'ROWS', values },
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'sheets_clear_range',
    {
      description: 'Clear all values from an A1-notation spreadsheet range.',
      inputSchema: z.object({
        spreadsheetId: z.string().min(1),
        range: z.string().min(1),
      }),
      annotations: destructiveTool,
    },
    async ({ spreadsheetId, range }) =>
      runTool('sheets_clear_range', async () => {
        const result = await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range,
          requestBody: {},
        });
        return jsonText(result.data);
      }),
  );

  server.registerTool(
    'sheets_create_spreadsheet',
    {
      description: 'Create a spreadsheet with one or more named sheets.',
      inputSchema: z.object({
        title: z.string().min(1),
        sheetTitles: z
          .array(z.string().min(1))
          .min(1)
          .max(50)
          .default(['Sheet1']),
      }),
      annotations: writeTool,
    },
    async ({ title, sheetTitles }) =>
      runTool('sheets_create_spreadsheet', async () => {
        const result = await sheets.spreadsheets.create({
          requestBody: {
            properties: { title },
            sheets: sheetTitles.map((sheetTitle) => ({
              properties: { title: sheetTitle },
            })),
          },
        });
        return jsonText({
          spreadsheetId: result.data.spreadsheetId,
          spreadsheetUrl: result.data.spreadsheetUrl,
          title: result.data.properties?.title,
        });
      }),
  );
}
