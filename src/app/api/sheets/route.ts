import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetData, getSheetMetadata } from '@/lib/googleSheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, config } = body;

    if (action === 'fetch') {
      // Fetch data from Google Sheets
      const { spreadsheetId, range, credentialsPath } = config;
      
      if (!spreadsheetId || !range) {
        return NextResponse.json(
          { error: 'spreadsheetId and range are required' },
          { status: 400 }
        );
      }

      const result = await fetchSheetData({ spreadsheetId, range, credentialsPath });
      return NextResponse.json(result);
    } 
    
    if (action === 'metadata') {
      // Get sheet metadata
      const { spreadsheetId, credentialsPath } = config;
      
      if (!spreadsheetId) {
        return NextResponse.json(
          { error: 'spreadsheetId is required' },
          { status: 400 }
        );
      }

      const result = await getSheetMetadata(spreadsheetId, credentialsPath);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "fetch" or "metadata"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Google Sheets API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process Google Sheets request' },
      { status: 500 }
    );
  }
}
