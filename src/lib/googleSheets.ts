import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  range?: string;
  credentialsPath?: string;
}

/**
 * Initialize Google Sheets API client with service account credentials
 */
export async function getGoogleSheetsClient(credentialsPath?: string, readOnly: boolean = true) {
  try {
    // Try to load credentials from provided path or default location
    const credPath = credentialsPath 
      ? path.join(process.cwd(), credentialsPath)
      : path.join(process.cwd(), 'credentials.json');
    
    if (!fs.existsSync(credPath)) {
      throw new Error(`Credentials file not found at: ${credPath}. Please add your Google Cloud service account credentials.`);
    }

    const credentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    
    const scopes = readOnly 
      ? ['https://www.googleapis.com/auth/spreadsheets.readonly']
      : ['https://www.googleapis.com/auth/spreadsheets'];
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    throw error;
  }
}

/**
 * Fetch data from a Google Sheet
 */
export async function fetchSheetData(config: GoogleSheetsConfig) {
  try {
    const sheets = await getGoogleSheetsClient(config.credentialsPath, true);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: config.range,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return { headers: [], data: [], rowCount: 0 };
    }

    // First row as headers
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header as string] = row[index] || null;
      });
      return obj;
    });

    return { headers, data, rowCount: data.length };
  } catch (error: any) {
    console.error('Error fetching Google Sheets data:', error);
    throw new Error(`Failed to fetch data from Google Sheets: ${error.message}`);
  }
}

/**
 * Check if a sheet exists in a spreadsheet
 */
export async function sheetExists(spreadsheetId: string, sheetTitle: string, credentialsPath?: string): Promise<boolean> {
  try {
    const sheets = await getGoogleSheetsClient(credentialsPath, false);
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    
    return response.data.sheets?.some(sheet => sheet.properties?.title === sheetTitle) ?? false;
  } catch (error: any) {
    console.error('Error checking sheet existence:', error);
    return false;
  }
}

/**
 * Create a new sheet in a spreadsheet
 */
export async function createNewSheet(spreadsheetId: string, sheetTitle: string, credentialsPath?: string) {
  try {
    const sheets = await getGoogleSheetsClient(credentialsPath, false);
    
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: sheetTitle,
            },
          },
        }],
      },
    });

    const sheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;
    return {
      sheetId,
      title: sheetTitle,
    };
  } catch (error: any) {
    // If the sheet already exists, that's actually fine - don't throw error
    const errorMessage = error?.message || String(error);
    if (errorMessage.toLowerCase().includes('already exists')) {
      console.log(`Sheet "${sheetTitle}" already exists, will use existing sheet`);
      return {
        sheetId: null,
        title: sheetTitle,
      };
    }
    console.error('Error creating new sheet:', error);
    throw new Error(`Failed to create new sheet: ${errorMessage}`);
  }
}

/**
 * Write data to Google Sheets
 */
export async function writeSheetData(config: GoogleSheetsConfig & { data: any[][], sheetName?: string }) {
  try {
    const sheets = await getGoogleSheetsClient(config.credentialsPath, false);
    
    let targetRange = config.range;
    
    // If no range is specified, create or use existing sheet
    if (!targetRange) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const sheetName = config.sheetName || `Pipeline_Output_${timestamp}`;
      
      // Check if sheet exists, if not create it
      const exists = await sheetExists(config.spreadsheetId, sheetName, config.credentialsPath);
      console.log(`Sheet "${sheetName}" exists: ${exists}`);
      
      if (!exists) {
        console.log(`Creating new sheet: "${sheetName}"`);
        await createNewSheet(config.spreadsheetId, sheetName, config.credentialsPath);
      } else {
        console.log(`Using existing sheet: "${sheetName}"`);
      }
      
      targetRange = `${sheetName}!A1`;
    }
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: targetRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: config.data,
      },
    });

    return {
      updatedCells: response.data.updatedCells,
      updatedRows: response.data.updatedRows,
      updatedColumns: response.data.updatedColumns,
      sheetName: targetRange.split('!')[0],
      range: targetRange,
    };
  } catch (error: any) {
    console.error('Error writing to Google Sheets:', error);
    throw new Error(`Failed to write data to Google Sheets: ${error.message}`);
  }
}

/**
 * Get sheet metadata
 */
export async function getSheetMetadata(spreadsheetId: string, credentialsPath?: string) {
  try {
    const sheets = await getGoogleSheetsClient(credentialsPath, true);
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return {
      title: response.data.properties?.title,
      sheets: response.data.sheets?.map(sheet => ({
        title: sheet.properties?.title,
        sheetId: sheet.properties?.sheetId,
        rowCount: sheet.properties?.gridProperties?.rowCount,
        columnCount: sheet.properties?.gridProperties?.columnCount,
      })),
    };
  } catch (error: any) {
    console.error('Error fetching sheet metadata:', error);
    throw new Error(`Failed to fetch sheet metadata: ${error.message}`);
  }
}
