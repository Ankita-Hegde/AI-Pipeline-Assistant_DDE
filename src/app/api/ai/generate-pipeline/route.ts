import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.API_KEY || process.env.ANTHROPIC_API_KEY || "",
  baseURL: process.env.API_BASE || "https://ai-gateway.uni-paderborn.de/v1/",
  timeout: 120000, // 120 second timeout
  maxRetries: 3,
});

interface GeneratePipelineRequest {
  instructions: string;
  ownerEmail: string;
  pipelineName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GeneratePipelineRequest = await req.json();
    const { instructions, pipelineName } = body;

    if (!instructions || !instructions.trim()) {
      return NextResponse.json(
        { error: "Instructions are required" },
        { status: 400 }
      );
    }

    // Generate pipeline using AI Gateway
    const prompt = `You are an expert data pipeline architect. Generate a data pipeline configuration and Python code that uses service account credentials (NOT interactive OAuth).

User Requirements:
${instructions}

IMPORTANT: For Google Sheets access, use google.oauth2.service_account credentials with credentials.json, NOT InstalledAppFlow.
The code runs in a server environment, so it must use non-interactive authentication.

Respond with EXACTLY this format (no extra text):

=== PIPELINE_CONFIG ===
name: pipeline_name
description: brief description
trigger: scheduled
schedule: "0 9 * * *"
source:
  type: Google_Sheets
  config:
    spreadsheetId: "your-spreadsheet-id"
    range: "Sheet1!A1:Z1000"
    credentialsPath: "credentials.json"
transformations:
  - name: Clean Data
    type: filter
    operation: remove_nulls
destination:
  type: Google_Sheets
  config:
    spreadsheetId: "your-spreadsheet-id"
    range: "output!A1"
    credentialsPath: "credentials.json"

=== PIPELINE_CODE ===
import pandas as pd
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def get_google_client(credentials_path):
    """Create authenticated Google Sheets client using service account"""
    creds = service_account.Credentials.from_service_account_file(
        credentials_path, scopes=SCOPES)
    return build('sheets', 'v4', credentials=creds)

def read_sheet(service, spreadsheet_id, range_name):
    """Read data from Google Sheet"""
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=spreadsheet_id, range=range_name).execute()
    values = result.get('values', [])
    if not values:
        return pd.DataFrame()
    return pd.DataFrame(values[1:], columns=values[0])

def write_sheet(service, spreadsheet_id, range_name, df):
    """Write data to Google Sheet"""
    values = [df.columns.tolist()] + df.values.tolist()
    body = {'majorDimension': 'ROWS', 'values': values}
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id, range=range_name,
        valueInputOption='USER_ENTERED', body=body).execute()

def run_pipeline():
    try:
        # Initialize client with service account credentials
        service = get_google_client('credentials.json')
        
        # Read source data
        print("Reading data from source...")
        df = read_sheet(service, 'source_spreadsheet_id', 'Sheet1!A1:Z1000')
        print(f"Loaded {len(df)} rows")
        
        # Apply transformations
        print("Applying transformations...")
        df = df.dropna()
        df['processed_date'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Write to destination
        print("Writing data to destination...")
        write_sheet(service, 'dest_spreadsheet_id', 'output!A1', df)
        
        print("Pipeline completed successfully!")
        return True
    except Exception as e:
        print(f"Pipeline failed: {str(e)}")
        raise

if __name__ == "__main__":
    run_pipeline()

=== EXECUTION_STRATEGY ===
1. Load credentials from credentials.json (service account)
2. Authenticate with Google Sheets API using service account
3. Read data from source Google Sheet
4. Apply data transformations (filtering, cleansing, enrichment)
5. Write processed data to destination Google Sheet
6. Log success/failure`;

    try {
      const response = await client.chat.completions.create({
        model: process.env.API_CHAT_MODEL || "gwdg.llama-3.3-70b-instruct",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0];
      if (content.message.content === null) {
        throw new Error("Unexpected response from AI Gateway");
      }

      const fullText = content.message.content;

      // Parse the response sections - be flexible with format
      const configMatch = fullText.match(/=== PIPELINE_CONFIG ===\s*([\s\S]*?)(?:=== PIPELINE_CODE ===|===|$)/);
      const codeMatch = fullText.match(/=== PIPELINE_CODE ===\s*([\s\S]*?)(?:=== TEST_CODE ===|=== EXECUTION_STRATEGY ===|===|$)/);
      const testMatch = fullText.match(/=== TEST_CODE ===\s*([\s\S]*?)(?:=== EXECUTION_STRATEGY ===|===|$)/);
      const strategyMatch = fullText.match(/=== EXECUTION_STRATEGY ===\s*([\s\S]*?)$/);

      if (!configMatch || !codeMatch) {
        console.error("Failed to parse AI response. Full response:", fullText);
        // Return partial response if available
        return NextResponse.json({
          success: true,
          config: configMatch ? configMatch[1].trim() : `name: pipeline\ndescription: Pipeline\ntrigger: scheduled`,
          code: codeMatch ? codeMatch[1].trim() : `# Auto-generated code`,
          tests: testMatch ? testMatch[1].trim() : ``,
          strategy: strategyMatch ? strategyMatch[1].trim() : `Execute pipeline steps sequentially`,
          rawResponse: fullText,
          warning: "Partial response from AI - some sections may be missing"
        });
      }

      let yamlConfig = configMatch[1].trim();
      let pythonCode = codeMatch[1].trim();
      const executionStrategy = strategyMatch ? strategyMatch[1].trim() : "Execute pipeline steps sequentially";


      // Clean up code blocks more thoroughly
      yamlConfig = yamlConfig
        .replace(/^```[a-z]*\s*\n?/, "")
        .replace(/\n?```\s*$/, "")
        .trim();
      pythonCode = pythonCode
        .replace(/^```[a-z]*\s*\n?/, "")
        .replace(/\n?```\s*$/, "")
        .trim();

      return NextResponse.json({
        success: true,
        config: yamlConfig,
        code: pythonCode,
        strategy: executionStrategy,
        rawResponse: fullText,
      });
    } catch (apiError: any) {
      console.error("AI Gateway error:", apiError);
      // Return a fallback response if API times out
      if (apiError.code === 'ETIMEDOUT' || apiError.message?.includes('timeout')) {
        console.warn("AI Gateway request timed out, returning template response");
        return NextResponse.json({
          success: true,
          config: `name: ${pipelineName || 'new_pipeline'}
description: Auto-generated pipeline
trigger: scheduled
schedule: "0 9 * * *"
source:
  type: CSV
  config:
    path: input.csv
transformations:
  - name: Data Cleaning
    type: filter
    operation: remove_nulls
destination:
  type: JSON
  config:
    path: output.json`,
          code: `import pandas as pd\n\ndef run_pipeline():\n    df = pd.read_csv('input.csv')\n    df = df.dropna()\n    df.to_json('output.json', orient='records')\n    print("Pipeline completed")\n\nif __name__ == "__main__":\n    run_pipeline()`,
          strategy: "Basic pipeline execution strategy",
          rawResponse: "Generated from template due to API timeout",
          warning: "AI Gateway timed out. Using template response. Please try again."
        });
      }
      throw apiError;
    }

  } catch (error: any) {
    console.error("Error generating pipeline:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to generate pipeline",
        details: error.toString(),
        code: error.code
      },
      { status: 500 }
    );
  }
}
