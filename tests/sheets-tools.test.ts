import type { sheets_v4 } from 'googleapis';
import { registerSheetsTools } from '../src/tools/sheets/index.js';
import { parsedText, ToolHarness } from './tool-harness.js';

function sheetsMock() {
  return {
    spreadsheets: {
      get: jest.fn(),
      create: jest.fn(),
      values: {
        get: jest.fn(),
        batchGet: jest.fn(),
        update: jest.fn(),
        append: jest.fn(),
        clear: jest.fn(),
      },
    },
  };
}

describe('Google Sheets tools', () => {
  let harness: ToolHarness;
  let sheets: ReturnType<typeof sheetsMock>;

  beforeEach(() => {
    harness = new ToolHarness();
    sheets = sheetsMock();
    registerSheetsTools(harness.server, sheets as unknown as sheets_v4.Sheets);
  });

  it('registers every Sheets tool', () => {
    expect([...harness.handlers.keys()]).toEqual([
      'sheets_get_spreadsheet',
      'sheets_read_range',
      'sheets_batch_read',
      'sheets_write_range',
      'sheets_append_rows',
      'sheets_clear_range',
      'sheets_create_spreadsheet',
    ]);
  });

  it('reads spreadsheet metadata', async () => {
    sheets.spreadsheets.get.mockResolvedValue({
      data: {
        spreadsheetId: 'sheet',
        properties: { title: 'Budget' },
        sheets: [{ properties: { title: 'Data' } }],
      },
    });
    const result = await harness.handler('sheets_get_spreadsheet')({
      spreadsheetId: 'sheet',
    });
    expect(sheets.spreadsheets.get).toHaveBeenCalledWith({
      spreadsheetId: 'sheet',
      includeGridData: false,
    });
    expect(parsedText(result)).toMatchObject({
      spreadsheetId: 'sheet',
      title: 'Budget',
      sheets: [{ title: 'Data' }],
    });
  });

  it('reads multiple ranges in a single call', async () => {
    sheets.spreadsheets.values.batchGet.mockResolvedValue({
      data: { valueRanges: [{ range: 'Data!A1', values: [['A']] }] },
    });
    const result = await harness.handler('sheets_batch_read')({
      spreadsheetId: 'sheet',
      ranges: ['Data!A1'],
      majorDimension: 'ROWS',
      valueRenderOption: 'FORMULA',
    });
    expect(sheets.spreadsheets.values.batchGet).toHaveBeenCalledWith({
      spreadsheetId: 'sheet',
      ranges: ['Data!A1'],
      majorDimension: 'ROWS',
      valueRenderOption: 'FORMULA',
    });
    expect(parsedText(result).valueRanges).toHaveLength(1);
  });

  it('appends rows and clears ranges', async () => {
    sheets.spreadsheets.values.append.mockResolvedValue({
      data: { updates: { updatedRows: 1 } },
    });
    sheets.spreadsheets.values.clear.mockResolvedValue({
      data: { clearedRange: 'Data!A1' },
    });
    const appended = await harness.handler('sheets_append_rows')({
      spreadsheetId: 'sheet',
      range: 'Data!A1',
      values: [['A']],
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
    });
    expect(sheets.spreadsheets.values.append).toHaveBeenCalledWith({
      spreadsheetId: 'sheet',
      range: 'Data!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { majorDimension: 'ROWS', values: [['A']] },
    });
    expect(parsedText(appended).updates.updatedRows).toBe(1);
    const cleared = await harness.handler('sheets_clear_range')({
      spreadsheetId: 'sheet',
      range: 'Data!A1',
    });
    expect(sheets.spreadsheets.values.clear).toHaveBeenCalledWith({
      spreadsheetId: 'sheet',
      range: 'Data!A1',
      requestBody: {},
    });
    expect(parsedText(cleared).clearedRange).toBe('Data!A1');
  });

  it('reads a range with rendering options', async () => {
    sheets.spreadsheets.values.get.mockResolvedValue({
      data: {
        range: 'Data!A1:B2',
        majorDimension: 'ROWS',
        values: [['A', 'B']],
      },
    });
    const result = await harness.handler('sheets_read_range')({
      spreadsheetId: 'spreadsheet-1',
      range: 'Data!A1:B2',
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    expect(sheets.spreadsheets.values.get).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-1',
      range: 'Data!A1:B2',
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    expect(parsedText(result)).toEqual({
      range: 'Data!A1:B2',
      majorDimension: 'ROWS',
      values: [['A', 'B']],
    });
    expect(result.structuredContent).toEqual(parsedText(result));
  });

  it('writes values without retrying the mutation', async () => {
    sheets.spreadsheets.values.update.mockResolvedValue({
      data: { updatedRange: 'Data!A1:B1', updatedCells: 2 },
    });
    const result = await harness.handler('sheets_write_range')({
      spreadsheetId: 'spreadsheet-1',
      range: 'Data!A1:B1',
      values: [['A', 'B']],
      majorDimension: 'ROWS',
      valueInputOption: 'USER_ENTERED',
    });
    expect(sheets.spreadsheets.values.update).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-1',
      range: 'Data!A1:B1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { majorDimension: 'ROWS', values: [['A', 'B']] },
    });
    expect(parsedText(result)).toEqual({
      updatedRange: 'Data!A1:B1',
      updatedCells: 2,
    });
  });

  it('creates a spreadsheet with named sheets', async () => {
    sheets.spreadsheets.create.mockResolvedValue({
      data: {
        spreadsheetId: 'spreadsheet-2',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/spreadsheet-2',
        properties: { title: 'Pipeline' },
      },
    });
    const result = await harness.handler('sheets_create_spreadsheet')({
      title: 'Pipeline',
      sheetTitles: ['Leads', 'Archive'],
    });
    expect(sheets.spreadsheets.create).toHaveBeenCalledWith({
      requestBody: {
        properties: { title: 'Pipeline' },
        sheets: [
          { properties: { title: 'Leads' } },
          { properties: { title: 'Archive' } },
        ],
      },
    });
    expect(parsedText(result)).toMatchObject({
      spreadsheetId: 'spreadsheet-2',
      title: 'Pipeline',
    });
  });
});
