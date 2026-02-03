import { google } from 'googleapis';

/**
 * Google Sheets Service
 * Handles all interactions with Google Sheets API
 */

export interface SheetData {
  sheetId: string;
  sheetName: string;
  range: string;
  values: any[][];
}

export interface ProspectRow {
  businessName: string;
  phoneNumber: string;
  industry?: string;
  contactPerson?: string;
  description?: string;
  status?: string;
}

export interface CallLogEntry {
  timestamp: string;
  businessName: string;
  phoneNumber: string;
  contactPerson?: string;
  duration: string;
  outcome: string;
  interestLevel?: string;
  painPoints?: string;
  nextAction?: string;
  followUpDate?: string;
  notes?: string;
}

/**
 * Create OAuth2 client
 */
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_APP_URL + '/api/google/sheets/callback'
  );
}

/**
 * Get authorization URL for OAuth flow
 */
export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create authenticated Sheets client
 */
export function getSheetsClient(accessToken: string, refreshToken?: string) {
  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

/**
 * List all spreadsheets accessible by user
 */
export async function listSpreadsheets(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: 'files(id, name, createdTime, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 50,
  });

  return response.data.files || [];
}

/**
 * Get spreadsheet metadata and sheet names
 */
export async function getSpreadsheetInfo(
  spreadsheetId: string,
  accessToken: string
) {
  const sheets = getSheetsClient(accessToken);

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  return {
    title: response.data.properties?.title,
    sheets: response.data.sheets?.map((sheet) => ({
      sheetId: sheet.properties?.sheetId,
      title: sheet.properties?.title,
      index: sheet.properties?.index,
      rowCount: sheet.properties?.gridProperties?.rowCount,
      columnCount: sheet.properties?.gridProperties?.columnCount,
    })),
  };
}

/**
 * Read data from a sheet
 */
export async function readSheet(
  spreadsheetId: string,
  range: string,
  accessToken: string
): Promise<any[][]> {
  const sheets = getSheetsClient(accessToken);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values || [];
}

/**
 * Parse prospect list from sheet data
 */
export function parseProspectList(
  values: any[][],
  columnMapping: {
    businessName: number;
    phoneNumber: number;
    industry?: number;
    contactPerson?: number;
    description?: number;
  }
): ProspectRow[] {
  if (!values || values.length === 0) return [];

  // Skip header row
  const dataRows = values.slice(1);

  return dataRows
    .filter((row) => row[columnMapping.businessName] && row[columnMapping.phoneNumber])
    .map((row) => ({
      businessName: row[columnMapping.businessName],
      phoneNumber: row[columnMapping.phoneNumber],
      industry: columnMapping.industry !== undefined ? row[columnMapping.industry] : undefined,
      contactPerson: columnMapping.contactPerson !== undefined ? row[columnMapping.contactPerson] : undefined,
      description: columnMapping.description !== undefined ? row[columnMapping.description] : undefined,
      status: 'New',
    }));
}

/**
 * Create a new sheet for call logs
 */
export async function createCallLogSheet(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
) {
  const sheets = getSheetsClient(accessToken);

  // Add new sheet
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName,
              gridProperties: {
                rowCount: 1000,
                columnCount: 12,
                frozenRowCount: 1,
              },
            },
          },
        },
      ],
    },
  });

  // Add headers
  const headers = [
    'Timestamp',
    'Business Name',
    'Phone Number',
    'Contact Person',
    'Duration',
    'Outcome',
    'Interest Level',
    'Pain Points',
    'Next Action',
    'Follow-up Date',
    'Email',
    'Notes',
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1:L1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [headers],
    },
  });

  // Format header row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: await getSheetIdByName(spreadsheetId, sheetName, accessToken),
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.2, blue: 0.8 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 11,
                  bold: true,
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
      ],
    },
  });

  return sheetName;
}

/**
 * Get sheet ID by name
 */
async function getSheetIdByName(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<number> {
  const info = await getSpreadsheetInfo(spreadsheetId, accessToken);
  const sheet = info.sheets?.find((s) => s.title === sheetName);
  return sheet?.sheetId || 0;
}

/**
 * Append call log entry to sheet
 */
export async function appendCallLog(
  spreadsheetId: string,
  sheetName: string,
  entry: CallLogEntry,
  accessToken: string
) {
  const sheets = getSheetsClient(accessToken);

  const row = [
    entry.timestamp,
    entry.businessName,
    entry.phoneNumber,
    entry.contactPerson || '',
    entry.duration,
    entry.outcome,
    entry.interestLevel || '',
    entry.painPoints || '',
    entry.nextAction || '',
    entry.followUpDate || '',
    '',
    entry.notes || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:L`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });
}

/**
 * Update prospect status in input sheet
 */
export async function updateProspectStatus(
  spreadsheetId: string,
  sheetName: string,
  phoneNumber: string,
  status: string,
  accessToken: string
) {
  const sheets = getSheetsClient(accessToken);

  // Read all data to find the row
  const values = await readSheet(spreadsheetId, `${sheetName}!A:F`, accessToken);

  // Find row index (assuming phone number is in column B)
  const rowIndex = values.findIndex((row, index) => index > 0 && row[1] === phoneNumber);

  if (rowIndex > 0) {
    // Update status column (assuming status is column F)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!F${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[status]],
      },
    });
  }
}

/**
 * Batch update multiple prospect statuses
 */
export async function batchUpdateProspectStatuses(
  spreadsheetId: string,
  sheetName: string,
  updates: Array<{ phoneNumber: string; status: string }>,
  accessToken: string
) {
  const sheets = getSheetsClient(accessToken);

  // Read all data
  const values = await readSheet(spreadsheetId, `${sheetName}!A:F`, accessToken);

  const batchUpdates = updates
    .map((update) => {
      const rowIndex = values.findIndex(
        (row, index) => index > 0 && row[1] === update.phoneNumber
      );

      if (rowIndex > 0) {
        return {
          range: `${sheetName}!F${rowIndex + 1}`,
          values: [[update.status]],
        };
      }
      return null;
    })
    .filter((u) => u !== null);

  if (batchUpdates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: batchUpdates as any[],
      },
    });
  }
}
